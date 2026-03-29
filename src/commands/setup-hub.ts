import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { registerHub, getGuildSystem } from "../db/queries/systems.js";
import { createSystemChannels } from "../systems/enrollment.js";
import type { Command } from "./types.js";

export const setupHubCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-hub")
    .setDescription(
      "Initialize Stardrift on this server — creates Sol Nexus access channels (admin only)"
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: 64,
      });
      return;
    }

    await interaction.deferReply();

    // Register hub on this guild (first server owns it, others get proxy)
    let hub;
    let isProxy: boolean;
    try {
      const result = await registerHub(interaction.guild.id, interaction.user.id);
      hub = result.hub;
      isProxy = result.isProxy;
    } catch (err) {
      await interaction.editReply(
        "Hub system not found. The galaxy may not be seeded yet."
      );
      return;
    }

    // Check if hub channels already exist on this guild
    const existing = await getGuildSystem(interaction.guild.id, hub.id);
    if (existing && existing.addedAt < new Date(Date.now() - 5000)) {
      // Give a 5s grace window in case of a retry
      await interaction.editReply(
        `**${hub.name}** is already set up on this server! Players can access the hub channels to start playing.`
      );
      return;
    }

    // Create hub channels
    try {
      await createSystemChannels(interaction.guild, hub.id, isProxy);
    } catch (err) {
      console.error("Channel creation error:", err);
      await interaction.editReply(
        "Hub registered but channel creation failed. Check bot permissions (Manage Channels)."
      );
      return;
    }

    const label = isProxy ? " (proxy)" : "";
    await interaction.editReply(
      `**${hub.name}**${label} channels created! 🚀\n\n` +
      `New players who join this server can start playing Stardrift immediately.\n` +
      `To claim your own star system, explore the galaxy and run \`/enroll\` with a discovered system.`
    );
  },
};
