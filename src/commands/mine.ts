import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import { executeMining } from "../systems/mining-action.js";
import {
  miningResultDisplay,
  miningCooldownDisplay,
  cargoFullDisplay,
} from "../ui/mining.js";

export const mineCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("mine")
    .setDescription("Mine ore from this planet or asteroid belt"),

  requiresLocation: true,
  requiresChannel: ["planet", "asteroid_belt"],

  async execute(interaction: ChatInputCommandInteraction) {
    const player = await ensurePlayer(interaction);

    const result = await executeMining(
      interaction.user.id,
      interaction.channelId,
      player.cargoCapacity,
      player.currentSystemId
    );

    // Ephemeral (64) + IsComponentsV2
    const flags = MessageFlags.IsComponentsV2 | 64;

    if (result.type === "cooldown") {
      await interaction.reply({
        components: [miningCooldownDisplay(result.remainingSeconds)],
        flags,
      });
      return;
    }

    if (result.type === "cargo_full") {
      await interaction.reply({ components: [cargoFullDisplay()], flags });
      return;
    }

    if (result.type === "error") {
      await interaction.reply({ content: result.message, flags: 64 });
      return;
    }

    await interaction.reply({
      components: [
        miningResultDisplay({
          itemDisplayName: result.itemDisplayName,
          quantity: result.quantity,
          cargoUsed: result.cargoUsed,
          cargoCapacity: result.cargoCapacity,
          isProxy: result.isProxy,
          showButtons: true,
          channelType: result.channelType,
          referenceId: result.referenceId,
        }),
      ],
      flags,
    });
  },
};
