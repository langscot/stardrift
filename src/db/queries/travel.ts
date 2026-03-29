import { eq, lte } from "drizzle-orm";
import { db } from "../index.js";
import { activeTravels, players } from "../schema.js";
import { clearTravelState } from "../../redis/travel.js";

/**
 * Start a travel. Inserts active_travels row and sets player system to null.
 */
export async function startTravel(
  playerId: string,
  fromSystemId: number,
  toSystemId: number,
  arrivesAt: Date,
  fuelCost: number
) {
  // Set player system to null (in transit)
  await db
    .update(players)
    .set({ currentSystemId: null })
    .where(eq(players.userId, playerId));

  // Deduct fuel
  const player = await db.query.players.findFirst({
    where: eq(players.userId, playerId),
  });
  if (player) {
    await db
      .update(players)
      .set({ fuel: player.fuel - fuelCost })
      .where(eq(players.userId, playerId));
  }

  // Insert travel record
  await db.insert(activeTravels).values({
    playerId,
    fromSystemId,
    toSystemId,
    arrivesAt,
    fuelCost,
  });
}

/**
 * Process all arrivals (players whose travel has completed).
 * Called by the polling loop.
 */
export async function processArrivals(): Promise<void> {
  const now = new Date();

  // Find all travels that have arrived
  const arrived = await db.query.activeTravels.findMany({
    where: lte(activeTravels.arrivesAt, now),
  });

  for (const travel of arrived) {
    try {
      // Update player location
      await db
        .update(players)
        .set({ currentSystemId: travel.toSystemId })
        .where(eq(players.userId, travel.playerId));

      // Delete travel record
      await db
        .delete(activeTravels)
        .where(eq(activeTravels.playerId, travel.playerId));

      // Clear Redis travel state
      await clearTravelState(travel.playerId);

      console.log(
        `Player ${travel.playerId} arrived at system ${travel.toSystemId}`
      );
    } catch (error) {
      console.error(
        `Error processing arrival for ${travel.playerId}:`,
        error
      );
    }
  }
}

/**
 * Get active travel for a player.
 */
export async function getActiveTravel(playerId: string) {
  return db.query.activeTravels.findFirst({
    where: eq(activeTravels.playerId, playerId),
  });
}
