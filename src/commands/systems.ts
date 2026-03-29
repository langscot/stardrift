import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { getGuildSystems } from "../db/queries/systems.js";
import type { Command } from "./types.js";

const STAR_EMOJI: Record<string, string> = {
  yellow_dwarf: "🌟",
  red_giant: "🔴",
  blue_giant: "🔵",
  neutron_star: "⚡",
  black_hole: "🌑",
};

export const systemsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("systems")
    .setDescription("List all star systems registered on this server"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Server only.", flags: 64 });
      return;
    }

    const rows = await getGuildSystems(interaction.guild.id);

    if (rows.length === 0) {
      await interaction.reply({
        content:
          "No systems registered on this server yet. Run `/setup-hub` to get started.",
        flags: 64,
      });
      return;
    }

    const owned = rows.filter((r) => !r.isProxy);
    const proxied = rows.filter((r) => r.isProxy);

    let text = `**🪐 Star Systems — ${interaction.guild.name}**\n\n`;

    if (owned.length > 0) {
      text += `**Owned Systems** (${owned.length})\n`;
      for (const row of owned) {
        const s = row.system;
        const emoji = STAR_EMOJI[s.starType] ?? "⭐";
        const hub = s.isHub ? " *(Hub)*" : "";
        text += `${emoji} **${s.name}**${hub} · ${s.starType.replace(/_/g, " ")} · Rating ${s.resourceRating}/10\n`;
      }
    }

    if (proxied.length > 0) {
      if (owned.length > 0) text += "\n";
      text += `**Proxied Systems** (${proxied.length}) *— debuffs apply*\n`;
      for (const row of proxied) {
        const s = row.system;
        const emoji = STAR_EMOJI[s.starType] ?? "⭐";
        const hub = s.isHub ? " *(Hub)*" : "";
        text += `📡 **${s.name}**${hub} · ${s.starType.replace(/_/g, " ")} · Rating ${s.resourceRating}/10\n`;
      }
    }

    text += `\n*Use \`/claim-system\` to claim a discovered system · \`/add-proxy\` to mirror another server's system*`;

    const container = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(text)
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
