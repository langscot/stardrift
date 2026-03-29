import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getGuildSystems } from "../db/queries/systems.js";
import { syncSystemChannels } from "../systems/enrollment.js";
import type { Command } from "./types.js";

export const syncCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("sync")
    .setDescription(
      "Sync all system channels — creates missing and removes stale (admin only)"
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Server only.", flags: 64 });
      return;
    }

    await interaction.deferReply();

    const guildRows = await getGuildSystems(interaction.guild.id);
    if (guildRows.length === 0) {
      await interaction.editReply(
        "No systems registered on this server. Use `/setup-hub` or `/claim-system` first."
      );
      return;
    }

    const results: string[] = [];

    for (const row of guildRows) {
      try {
        const { created, removed } = await syncSystemChannels(
          interaction.guild,
          row.system.id,
          row.isProxy
        );

        const parts: string[] = [];
        if (created.length > 0) parts.push(`+${created.length} created`);
        if (removed.length > 0) parts.push(`-${removed.length} removed`);

        const status = parts.length > 0 ? parts.join(", ") : "up to date";
        const icon = row.isProxy ? "\ud83d\udce1" : "\u2b50";
        results.push(`${icon} **${row.system.name}** — ${status}`);
      } catch (err) {
        console.error(`Sync failed for system ${row.system.id}:`, err);
        results.push(`\u274c **${row.system.name}** — sync failed`);
      }
    }

    await interaction.editReply(
      `**Channel sync complete**\n\n${results.join("\n")}`
    );
  },
};
