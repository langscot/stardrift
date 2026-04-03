import { eq, and } from "drizzle-orm";
import { db } from "../index.js";
import { npcSellLedger, itemTypes } from "../schema.js";

/**
 * Get NPC buy price for an item at a specific system.
 * Price fluctuates based on how much has been sold locally.
 */
export async function getNpcPrice(
  systemId: number,
  itemTypeKey: string
): Promise<number> {
  // Get base price
  const item = await db.query.itemTypes.findFirst({
    where: eq(itemTypes.key, itemTypeKey),
  });
  if (!item) return 0;

  // Get sell ledger
  const ledger = await db.query.npcSellLedger.findFirst({
    where: and(
      eq(npcSellLedger.systemId, systemId),
      eq(npcSellLedger.itemType, itemTypeKey)
    ),
  });

  const totalSold = ledger?.totalSold ?? 0;
  const saturation = getSaturationThreshold(itemTypeKey);

  // Time-based demand recovery: sold units decay over time so prices bounce back.
  // Half-life of 6 hours — after 6h with no sales, effective supply halves.
  const DECAY_HALF_LIFE_MS = 6 * 60 * 60 * 1000;
  const elapsed = ledger?.lastSoldAt
    ? Date.now() - new Date(ledger.lastSoldAt).getTime()
    : 0;
  const decayFactor = Math.pow(0.5, elapsed / DECAY_HALF_LIFE_MS);
  const effectiveSold = totalSold * decayFactor;

  const demandMultiplier = Math.max(
    0.2,
    1.0 - (effectiveSold / saturation) * 0.8
  );

  return Math.max(1, Math.round(item.basePrice * demandMultiplier));
}

/**
 * Record a sale and return credits earned.
 */
export async function recordNpcSale(
  systemId: number,
  itemTypeKey: string,
  quantity: number
): Promise<number> {
  const price = await getNpcPrice(systemId, itemTypeKey);
  const totalCredits = price * quantity;

  // Upsert sell ledger
  const existing = await db.query.npcSellLedger.findFirst({
    where: and(
      eq(npcSellLedger.systemId, systemId),
      eq(npcSellLedger.itemType, itemTypeKey)
    ),
  });

  if (existing) {
    await db
      .update(npcSellLedger)
      .set({
        totalSold: existing.totalSold + quantity,
        lastSoldAt: new Date(),
      })
      .where(
        and(
          eq(npcSellLedger.systemId, systemId),
          eq(npcSellLedger.itemType, itemTypeKey)
        )
      );
  } else {
    await db.insert(npcSellLedger).values({
      systemId,
      itemType: itemTypeKey,
      totalSold: quantity,
      lastSoldAt: new Date(),
    });
  }

  return totalCredits;
}

/**
 * Get all item types.
 */
export async function getAllItemTypes() {
  return db.query.itemTypes.findMany();
}

/**
 * Saturation threshold per item type.
 * Common ores saturate slower (more can be sold before price drops).
 */
function getSaturationThreshold(itemTypeKey: string): number {
  const thresholds: Record<string, number> = {
    iron_ore: 10000,
    copper_ore: 8000,
    silicon_ore: 8000,
    titanium_ore: 4000,
    platinum_ore: 2000,
    crystal_ore: 1500,
    dark_matter: 500,
    ice_crystal: 6000,
    helium_gas: 5000,
    hydrogen_gas: 7000,
  };
  return thresholds[itemTypeKey] ?? 5000;
}
