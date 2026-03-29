import { eq, and, isNull } from "drizzle-orm";
import { db } from "../index.js";
import { inventoryItems } from "../schema.js";

/**
 * Get all cargo items for a player (items on their ship).
 */
export async function getCargoItems(playerId: string) {
  return db.query.inventoryItems.findMany({
    where: and(
      eq(inventoryItems.playerId, playerId),
      eq(inventoryItems.storageType, "cargo")
    ),
  });
}

/**
 * Get station storage items for a player at a specific system.
 */
export async function getStationItems(playerId: string, systemId: number) {
  return db.query.inventoryItems.findMany({
    where: and(
      eq(inventoryItems.playerId, playerId),
      eq(inventoryItems.storageType, "station"),
      eq(inventoryItems.systemId, systemId)
    ),
  });
}

/**
 * Add items to cargo. Creates or updates the inventory row.
 */
export async function addToCargo(
  playerId: string,
  itemType: string,
  quantity: number
) {
  // Try to find existing cargo row
  const existing = await db.query.inventoryItems.findFirst({
    where: and(
      eq(inventoryItems.playerId, playerId),
      eq(inventoryItems.itemType, itemType),
      eq(inventoryItems.storageType, "cargo")
    ),
  });

  if (existing) {
    await db
      .update(inventoryItems)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(inventoryItems.id, existing.id));
  } else {
    await db.insert(inventoryItems).values({
      playerId,
      itemType,
      quantity,
      storageType: "cargo",
      systemId: null,
    });
  }
}

/**
 * Remove items from cargo. Returns true if successful, false if not enough.
 */
export async function removeFromCargo(
  playerId: string,
  itemType: string,
  quantity: number
): Promise<boolean> {
  const existing = await db.query.inventoryItems.findFirst({
    where: and(
      eq(inventoryItems.playerId, playerId),
      eq(inventoryItems.itemType, itemType),
      eq(inventoryItems.storageType, "cargo")
    ),
  });

  if (!existing || existing.quantity < quantity) return false;

  const newQty = existing.quantity - quantity;
  if (newQty === 0) {
    await db
      .delete(inventoryItems)
      .where(eq(inventoryItems.id, existing.id));
  } else {
    await db
      .update(inventoryItems)
      .set({ quantity: newQty })
      .where(eq(inventoryItems.id, existing.id));
  }
  return true;
}

/**
 * Get total cargo item count for capacity checking.
 */
export async function getCargoCount(playerId: string): Promise<number> {
  const items = await getCargoItems(playerId);
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
