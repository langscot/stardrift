import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
  TextChannel,
} from "discord.js";

import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import { executeMining } from "../systems/mining-action.js";
import { config } from "../config.js";
import {
  miningResultDisplay,
  miningCooldownDisplay,
  cargoFullDisplay,
  pickMiningFlavor,
} from "../ui/mining.js";
import {
  getTrackedMessageId,
  trackMessage,
  startCooldownCountdown,
} from "../systems/mining-tracker.js";

export const mineCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("mine")
    .setDescription("Mine ore from this planet or asteroid belt"),

  requiresLocation: true,
  requiresChannel: ["planet", "asteroid_belt"],

  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel as TextChannel;
    const userId = interaction.user.id;

    // Defer non-ephemeral so the reply is visible and linked to the /mine command
    await interaction.deferReply();

    const player = await ensurePlayer(interaction);

    const result = await executeMining(
      userId,
      interaction.channelId,
      player.cargoCapacity,
      player.currentSystemId
    );

    const ephemeralV2Flags = MessageFlags.IsComponentsV2 | 64;

    // Error / cooldown / cargo-full — delete the visible defer and send ephemeral
    if (result.type === "cooldown") {
      await interaction.deleteReply().catch(() => {});
      await interaction.followUp({
        components: [miningCooldownDisplay(result.remainingSeconds)],
        flags: ephemeralV2Flags,
      });
      return;
    }

    if (result.type === "cargo_full") {
      await interaction.deleteReply().catch(() => {});
      await interaction.followUp({ components: [cargoFullDisplay()], flags: ephemeralV2Flags });
      return;
    }

    if (result.type === "error") {
      await interaction.deleteReply().catch(() => {});
      await interaction.followUp({ content: result.message, flags: 64 });
      return;
    }

    // Success — build display
    const displayData = {
      items: result.items,
      cargoUsed: result.cargoUsed,
      cargoCapacity: result.cargoCapacity,
      isProxy: result.isProxy,
      showButtons: true,
      ownerUserId: userId,
      channelType: result.channelType,
      referenceId: result.referenceId,
      flavorText: pickMiningFlavor(userId),
    };

    const messagePayload = {
      components: [miningResultDisplay({ ...displayData, cooldownSeconds: config.MINING_COOLDOWN_SECONDS })],
      flags: MessageFlags.IsComponentsV2 as number,
    };

    // Delete any previous tracked message so the channel doesn't pile up
    const existingId = getTrackedMessageId(interaction.channelId, userId);
    if (existingId) {
      channel.messages.fetch(existingId).then(m => m.delete()).catch(() => {});
    }

    // Always use the deferred reply so "User used /mine" stays visible
    await interaction.editReply(messagePayload);
    const reply = await interaction.fetchReply();
    const messageId = reply.id;

    // Track so subsequent mines update this message in place
    trackMessage(interaction.channelId, userId, messageId);

    // Tick down the cooldown label every second
    startCooldownCountdown(channel, messageId, config.MINING_COOLDOWN_SECONDS, displayData);
  },
};
