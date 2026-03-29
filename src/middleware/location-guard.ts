import { ChatInputCommandInteraction } from "discord.js";
import { db } from "../db/index.js";
import { players, systemChannels, systems } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getTravelState } from "../redis/travel.js";
import { isProxyInGuild } from "../db/queries/systems.js";

export interface LocationContext {
  player: typeof players.$inferSelect;
  systemId: number;
  channelType: string;
  referenceId: number | null;
  /** True when this channel is a proxy mirror of another guild's system. */
  isProxy: boolean;
}

/** Mining yield multiplier when operating in a proxy system. */
export const PROXY_MINING_MULTIPLIER = 0.7;
/** Credit multiplier when selling in a proxy system (20% tax). */
export const PROXY_SELL_MULTIPLIER = 0.8;

/**
 * Validates that a player is in the correct system and not traveling.
 * Returns location context (including proxy flag) or replies with an error.
 */
export async function checkLocation(
  interaction: ChatInputCommandInteraction,
  allowedChannelTypes?: string[]
): Promise<LocationContext | null> {
  const userId = interaction.user.id;

  // Get player
  const player = await db.query.players.findFirst({
    where: eq(players.userId, userId),
  });

  if (!player || !player.currentSystemId) {
    await interaction.reply({
      content:
        "You haven't started the game yet. Use any command in the hub system to begin!",
      flags: 64,
    });
    return null;
  }

  // Check if traveling
  const travelState = await getTravelState(userId);
  if (travelState) {
    const eta = new Date(travelState.arrivesAt);
    const remaining = Math.max(
      0,
      Math.ceil((eta.getTime() - Date.now()) / 1000)
    );
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    await interaction.reply({
      content: `You are currently in transit. ETA: ${minutes}m ${seconds}s`,
      flags: 64,
    });
    return null;
  }

  // Check channel belongs to a system
  const channelId = interaction.channelId;
  const channel = await db.query.systemChannels.findFirst({
    where: eq(systemChannels.channelId, channelId),
  });

  if (!channel) {
    await interaction.reply({
      content: "This channel is not a game channel.",
      flags: 64,
    });
    return null;
  }

  // Check player is in this system (travel is still required even for proxy channels)
  if (player.currentSystemId !== channel.systemId) {
    const playerSystem = await db.query.systems.findFirst({
      where: eq(systems.id, player.currentSystemId),
    });
    const channelSystem = await db.query.systems.findFirst({
      where: eq(systems.id, channel.systemId),
    });

    await interaction.reply({
      content: `You are in **${playerSystem?.name ?? "Unknown"}**, but this channel belongs to **${channelSystem?.name ?? "Unknown"}**. Use \`/travel\` to go there first.`,
      flags: 64,
    });
    return null;
  }

  // Check channel type restriction
  if (allowedChannelTypes && !allowedChannelTypes.includes(channel.channelType)) {
    await interaction.reply({
      content: `You can't do that here. Try a ${allowedChannelTypes.join(" or ")} channel.`,
      flags: 64,
    });
    return null;
  }

  // Determine proxy status from guild_systems (null guildId = legacy channel, treat as non-proxy)
  const proxy = channel.guildId
    ? await isProxyInGuild(channel.guildId, channel.systemId)
    : false;

  return {
    player,
    systemId: channel.systemId,
    channelType: channel.channelType,
    referenceId: channel.referenceId,
    isProxy: proxy,
  };
}
