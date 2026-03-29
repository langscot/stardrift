import { VoiceState, ChannelType } from "discord.js";
import { db } from "../db/index.js";
import { systemChannels, players } from "../db/schema.js";
import { eq } from "drizzle-orm";

/** In-memory set of temporary ship voice channel IDs */
const tempShipChannels = new Set<string>();

export async function handleVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState
): Promise<void> {
  // --- Cleanup: if the user left a temp channel and it's now empty, delete it ---
  if (oldState.channelId && tempShipChannels.has(oldState.channelId)) {
    const oldChannel = oldState.channel;
    if (oldChannel && oldChannel.members.size === 0) {
      tempShipChannels.delete(oldChannel.id);
      try {
        await oldChannel.delete();
      } catch (err) {
        console.error("Failed to delete temp ship channel:", err);
      }
    }
  }

  // --- Create: if the user joined a dock channel, spawn a temp VC ---
  if (!newState.channelId || !newState.member || !newState.guild) return;

  // Check if the joined channel is a registered ship_dock
  const dock = await db.query.systemChannels.findFirst({
    where: eq(systemChannels.channelId, newState.channelId),
  });
  if (!dock || dock.channelType !== "ship_dock") return;

  const member = newState.member;
  const dockChannel = newState.channel;
  if (!dockChannel) return;

  // Determine if the player is physically in this system
  const player = await db.query.players.findFirst({
    where: eq(players.userId, member.id),
  });
  const isLocal = player?.currentSystemId === dock.systemId;
  const prefix = isLocal ? "\u{1F7E2}" : "\u{1F4E1}"; // 🟢 or 📡
  const channelName = `${prefix} ${member.displayName}'s Ship`;

  try {
    const tempChannel = await newState.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: dockChannel.parentId,
    });

    tempShipChannels.add(tempChannel.id);
    await member.voice.setChannel(tempChannel);
  } catch (err) {
    console.error("Failed to create temp ship channel:", err);
  }
}
