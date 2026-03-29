import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import { executeMining } from "../systems/mining-action.js";
import { config } from "../config.js";
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

    const ephemeralV2Flags = MessageFlags.IsComponentsV2 | 64;

    if (result.type === "cooldown") {
      await interaction.reply({
        components: [miningCooldownDisplay(result.remainingSeconds)],
        flags: ephemeralV2Flags,
      });
      return;
    }

    if (result.type === "cargo_full") {
      await interaction.reply({ components: [cargoFullDisplay()], flags: ephemeralV2Flags });
      return;
    }

    if (result.type === "error") {
      await interaction.reply({ content: result.message, flags: 64 });
      return;
    }

    const displayData = {
      itemDisplayName: result.itemDisplayName,
      quantity: result.quantity,
      cargoUsed: result.cargoUsed,
      cargoCapacity: result.cargoCapacity,
      isProxy: result.isProxy,
      showButtons: true,
      channelType: result.channelType,
      referenceId: result.referenceId,
    };

    await interaction.reply({
      components: [miningResultDisplay({ ...displayData, cooldownSeconds: config.MINING_COOLDOWN_SECONDS })],
      flags: MessageFlags.IsComponentsV2,
    });

    setTimeout(async () => {
      try {
        await interaction.editReply({
          components: [miningResultDisplay(displayData)],
          flags: MessageFlags.IsComponentsV2,
        });
      } catch {
        // Message was deleted or token expired — ignore
      }
    }, config.MINING_COOLDOWN_SECONDS * 1000);
  },
};
