import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { db } from "../db/index.js";
import { systems } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  getSystemByName,
  enrollSystem,
  getGuildSystem,
} from "../db/queries/systems.js";
import { createSystemChannels } from "../systems/enrollment.js";
import type { Command } from "./types.js";

export const claimSystemCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("claim-system")
    .setDescription("Claim a discovered system and add it to this server (admin only)")
    .addStringOption((opt) =>
      opt
        .setName("system")
        .setDescription("Name of the system you have banked from exploration")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Server only.", flags: 64 });
      return;
    }

    const systemName = interaction.options.getString("system", true).trim();
    await interaction.deferReply();

    // Find the system
    const system = await getSystemByName(systemName);
    if (!system) {
      await interaction.editReply(
        `No system named **${systemName}** found. Check the name and try again.`
      );
      return;
    }

    // Can't claim the hub system — it's always shared
    if (system.isHub) {
      await interaction.editReply(
        `**${system.name}** is the central hub and cannot be claimed. Use \`/setup-hub\` to access it.`
      );
      return;
    }

    // Check system isn't already owned by another guild
    if (system.guildId && system.guildId !== interaction.guild.id) {
      await interaction.editReply(
        `**${system.name}** is already owned by another server. You can still \`/add-proxy\` it to mirror it here.`
      );
      return;
    }

    // Check this guild doesn't already own it
    const existing = await getGuildSystem(interaction.guild.id, system.id);
    if (existing && !existing.isProxy) {
      await interaction.editReply(
        `**${system.name}** is already claimed on this server.`
      );
      return;
    }

    // Claim the system
    await enrollSystem(system.id, interaction.guild.id, interaction.user.id);

    // Create channels
    try {
      await createSystemChannels(interaction.guild, system.id, false);
    } catch (err) {
      console.error("Channel creation error:", err);
      await interaction.editReply(
        `**${system.name}** claimed but channel creation failed. Check bot permissions (Manage Channels).`
      );
      return;
    }

    const starEmoji: Record<string, string> = {
      yellow_dwarf: "🌟",
      red_giant: "🔴",
      blue_giant: "🔵",
      neutron_star: "⚡",
      black_hole: "🌑",
    };
    const emoji = starEmoji[system.starType] ?? "⭐";

    await interaction.editReply(
      `${emoji} **${system.name}** has been claimed on this server!\n\n` +
      `Star: ${system.starType.replace(/_/g, " ")} · ` +
      `Resource rating: ${system.resourceRating}/10 · ` +
      `Coords: (${system.x.toFixed(0)}, ${system.y.toFixed(0)})\n\n` +
      `Game channels created. Players must \`/travel\` here to interact with your system.`
    );
  },
};
