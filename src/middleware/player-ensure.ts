import { ChatInputCommandInteraction } from "discord.js";
import { db } from "../db/index.js";
import { players } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Ensures a player record exists for the interacting user.
 * Creates one at the hub system if not found.
 * Returns the player record.
 */
export async function ensurePlayer(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const displayName =
    interaction.user.globalName ?? interaction.user.username;

  // Try to find existing player
  const existing = await db.query.players.findFirst({
    where: eq(players.userId, userId),
  });

  if (existing) return existing;

  // Find the hub system
  const { systems } = await import("../db/schema.js");
  const hub = await db.query.systems.findFirst({
    where: eq(systems.isHub, true),
  });

  if (!hub) {
    throw new Error(
      "Hub system not found. Run the galaxy seed script first."
    );
  }

  // Create new player at the hub
  const [newPlayer] = await db
    .insert(players)
    .values({
      userId,
      displayName,
      currentSystemId: hub.id,
    })
    .returning();

  return newPlayer;
}
