/**
 * Equipment queries — ship and module CRUD operations.
 */

import { db } from "../index.js";
import {
  shipTypes,
  moduleTypes,
  playerShips,
  playerModules,
  playerModuleInventory,
} from "../schema.js";
import { eq, and, sql } from "drizzle-orm";
import { deductCredits } from "./players.js";

// ── Ship Queries ────────────────────────────────────────────────────────────

export async function getShipCatalog() {
  return db.query.shipTypes.findMany();
}

export async function getPlayerShip(playerId: string) {
  const ship = await db.query.playerShips.findFirst({
    where: eq(playerShips.playerId, playerId),
  });
  if (!ship) return null;
  const type = await db.query.shipTypes.findFirst({
    where: eq(shipTypes.key, ship.shipKey),
  });
  return type ?? null;
}

/**
 * Buy a new ship. Deducts credits, unfits all modules (returns to inventory),
 * and sets the new ship.
 */
export async function buyShip(playerId: string, shipKey: string) {
  const ship = await db.query.shipTypes.findFirst({
    where: eq(shipTypes.key, shipKey),
  });
  if (!ship) throw new Error(`Ship type not found: ${shipKey}`);

  // Deduct credits
  await deductCredits(playerId, ship.price);

  // Unfit all current modules back to inventory
  const fitted = await db
    .select()
    .from(playerModules)
    .where(eq(playerModules.playerId, playerId));

  for (const mod of fitted) {
    await returnModuleToInventory(playerId, mod.moduleKey);
  }
  await db.delete(playerModules).where(eq(playerModules.playerId, playerId));

  // Set new ship (upsert)
  await db
    .insert(playerShips)
    .values({ playerId, shipKey })
    .onConflictDoUpdate({
      target: playerShips.playerId,
      set: { shipKey, equippedAt: new Date() },
    });

  return ship;
}

// ── Module Queries ──────────────────────────────────────────────────────────

export async function getModuleCatalog(category?: string) {
  if (category) {
    return db.query.moduleTypes.findMany({
      where: eq(moduleTypes.category, category),
    });
  }
  return db.query.moduleTypes.findMany();
}

export async function getFittedModules(playerId: string) {
  const rows = await db
    .select({
      slotIndex: playerModules.slotIndex,
      moduleKey: playerModules.moduleKey,
      displayName: moduleTypes.displayName,
      description: moduleTypes.description,
      category: moduleTypes.category,
      tier: moduleTypes.tier,
      modifiers: moduleTypes.modifiers,
      emoji: moduleTypes.emoji,
    })
    .from(playerModules)
    .innerJoin(moduleTypes, eq(playerModules.moduleKey, moduleTypes.key))
    .where(eq(playerModules.playerId, playerId))
    .orderBy(playerModules.slotIndex);

  return rows;
}

export async function getModuleInventory(playerId: string) {
  const rows = await db
    .select({
      moduleKey: playerModuleInventory.moduleKey,
      quantity: playerModuleInventory.quantity,
      displayName: moduleTypes.displayName,
      description: moduleTypes.description,
      category: moduleTypes.category,
      tier: moduleTypes.tier,
      price: moduleTypes.price,
      modifiers: moduleTypes.modifiers,
      emoji: moduleTypes.emoji,
    })
    .from(playerModuleInventory)
    .innerJoin(
      moduleTypes,
      eq(playerModuleInventory.moduleKey, moduleTypes.key)
    )
    .where(eq(playerModuleInventory.playerId, playerId));

  return rows;
}

/**
 * Buy a module copy. Deducts credits and adds to inventory.
 */
export async function buyModule(playerId: string, moduleKey: string) {
  const mod = await db.query.moduleTypes.findFirst({
    where: eq(moduleTypes.key, moduleKey),
  });
  if (!mod) throw new Error(`Module type not found: ${moduleKey}`);

  await deductCredits(playerId, mod.price);

  await db
    .insert(playerModuleInventory)
    .values({ playerId, moduleKey, quantity: 1 })
    .onConflictDoUpdate({
      target: [playerModuleInventory.playerId, playerModuleInventory.moduleKey],
      set: {
        quantity: sql`${playerModuleInventory.quantity} + 1`,
      },
    });

  return mod;
}

/**
 * Fit a module from inventory into a slot.
 * Validates slot index is within ship's module slots.
 * If slot is occupied, swaps (old module returns to inventory).
 */
export async function fitModule(
  playerId: string,
  slotIndex: number,
  moduleKey: string
) {
  // Validate ship slot count
  const ship = await getPlayerShip(playerId);
  const maxSlots = ship?.moduleSlots ?? 3; // starter ship = 3 slots
  if (slotIndex < 0 || slotIndex >= maxSlots) {
    throw new Error(`Invalid slot index ${slotIndex}. Ship has ${maxSlots} slots.`);
  }

  // Check inventory has the module
  const inv = await db.query.playerModuleInventory.findFirst({
    where: and(
      eq(playerModuleInventory.playerId, playerId),
      eq(playerModuleInventory.moduleKey, moduleKey)
    ),
  });
  if (!inv || inv.quantity < 1) {
    throw new Error("Module not in inventory.");
  }

  // If slot is occupied, return old module to inventory
  const existing = await db.query.playerModules.findFirst({
    where: and(
      eq(playerModules.playerId, playerId),
      eq(playerModules.slotIndex, slotIndex)
    ),
  });
  if (existing) {
    await returnModuleToInventory(playerId, existing.moduleKey);
    await db
      .delete(playerModules)
      .where(
        and(
          eq(playerModules.playerId, playerId),
          eq(playerModules.slotIndex, slotIndex)
        )
      );
  }

  // Remove from inventory
  if (inv.quantity <= 1) {
    await db
      .delete(playerModuleInventory)
      .where(
        and(
          eq(playerModuleInventory.playerId, playerId),
          eq(playerModuleInventory.moduleKey, moduleKey)
        )
      );
  } else {
    await db
      .update(playerModuleInventory)
      .set({ quantity: inv.quantity - 1 })
      .where(
        and(
          eq(playerModuleInventory.playerId, playerId),
          eq(playerModuleInventory.moduleKey, moduleKey)
        )
      );
  }

  // Fit into slot
  await db.insert(playerModules).values({
    playerId,
    slotIndex,
    moduleKey,
  });
}

/**
 * Unfit a module from a slot back to inventory.
 */
export async function unfitModule(playerId: string, slotIndex: number) {
  const existing = await db.query.playerModules.findFirst({
    where: and(
      eq(playerModules.playerId, playerId),
      eq(playerModules.slotIndex, slotIndex)
    ),
  });
  if (!existing) throw new Error("No module in that slot.");

  await returnModuleToInventory(playerId, existing.moduleKey);
  await db
    .delete(playerModules)
    .where(
      and(
        eq(playerModules.playerId, playerId),
        eq(playerModules.slotIndex, slotIndex)
      )
    );
}

/**
 * Get total count of a specific module owned (fitted + inventory).
 */
export async function getModuleCount(playerId: string, moduleKey: string) {
  const fitted = await db
    .select()
    .from(playerModules)
    .where(
      and(
        eq(playerModules.playerId, playerId),
        eq(playerModules.moduleKey, moduleKey)
      )
    );

  const inv = await db.query.playerModuleInventory.findFirst({
    where: and(
      eq(playerModuleInventory.playerId, playerId),
      eq(playerModuleInventory.moduleKey, moduleKey)
    ),
  });

  return fitted.length + (inv?.quantity ?? 0);
}

// ── Internal helpers ────────────────────────────────────────────────────────

async function returnModuleToInventory(playerId: string, moduleKey: string) {
  await db
    .insert(playerModuleInventory)
    .values({ playerId, moduleKey, quantity: 1 })
    .onConflictDoUpdate({
      target: [playerModuleInventory.playerId, playerModuleInventory.moduleKey],
      set: {
        quantity: sql`${playerModuleInventory.quantity} + 1`,
      },
    });
}
