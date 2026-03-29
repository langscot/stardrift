import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import {
  getSystemByName,
  addProxySystem,
  getGuildSystem,
} from "../db/queries/systems.js";
import { createSystemChannels } from "../systems/enrollment.js";
import type { Command } from "./types.js";

export const addProxyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("add-proxy")
    .setDescription(
      "Mirror another guild's star system on this server in proxy mode (admin only)"
    )
    .addStringOption((opt) =>
      opt
        .setName("system")
        .setDescription("Exact name of the system to proxy")
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
        `No system named **${systemName}** exists. Check \`/map\` or ask the system owner for the exact name.`
      );
      return;
    }

    // System must be enrolled somewhere before it can be proxied
    // (Hub is always available; other systems need an owner)
    if (!system.isHub && !system.guildId) {
      await interaction.editReply(
        `**${system.name}** hasn't been enrolled by anyone yet. It can't be proxied until someone claims it with \`/enroll\`.`
      );
      return;
    }

    // Don't proxy your own system — just enroll it directly
    if (system.guildId === interaction.guild.id) {
      await interaction.editReply(
        `**${system.name}** is already owned by this server. No need for a proxy!`
      );
      return;
    }

    // Check if already on this guild
    const existing = await getGuildSystem(interaction.guild.id, system.id);
    if (existing) {
      const mode = existing.isProxy ? "a proxy" : "owned";
      await interaction.editReply(
        `**${system.name}** is already on this server (${mode}).`
      );
      return;
    }

    // Add proxy record
    await addProxySystem(system.id, interaction.guild.id, interaction.user.id);

    // Create channels with proxy flag
    try {
      await createSystemChannels(interaction.guild, system.id, true);
    } catch (err) {
      console.error("Channel creation error:", err);
      await interaction.editReply(
        `**${system.name}** proxy registered but channel creation failed. Check bot permissions.`
      );
      return;
    }

    await interaction.editReply(
      `📡 **${system.name}** proxy channels added!\n\n` +
      `Players must still **travel** to ${system.name} before using these channels.\n` +
      `Mining yield **-30%** and market fees **+20%** apply in proxy mode.\n\n` +
      `*Visit ${system.name}'s home server for full rates.*`
    );
  },
};
