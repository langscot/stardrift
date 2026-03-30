import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import { eq } from "drizzle-orm";
import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import { db } from "../db/index.js";
import { systems, planets, asteroidBelts } from "../db/schema.js";

// Ore tables mirrored from mining.ts — used to show what a location yields
const PLANET_ORES: Record<string, string[]> = {
  rocky:    ["Iron Ore", "Copper Ore", "Silicon Ore", "Titanium Ore"],
  scorched: ["Iron Ore", "Titanium Ore", "Platinum Ore", "Crystal Ore"],
  temperate:["Iron Ore", "Copper Ore", "Silicon Ore"],
  gas_giant:["Helium Gas", "Hydrogen Gas"],
  ice:      ["Ice Crystal", "Silicon Ore", "Hydrogen Gas"],
  barren:   ["Iron Ore", "Silicon Ore", "Copper Ore"],
  volcanic: ["Titanium Ore", "Platinum Ore", "Crystal Ore", "Iron Ore", "Dark Matter"],
  ocean:    [],
};

const BELT_ORES = ["Iron Ore", "Copper Ore", "Silicon Ore", "Titanium Ore", "Platinum Ore"];

const PLANET_EMOJI: Record<string, string> = {
  rocky: "🪨", scorched: "🔥", temperate: "🌿", gas_giant: "🌀",
  ice: "❄️", barren: "⬛", volcanic: "🌋", ocean: "🌊",
};

function richnessBar(richness: number): string {
  // richness 1-10 → 10-char bar
  const filled = Math.round(richness);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function richnessLabel(richness: number): string {
  if (richness >= 8) return "Very Rich";
  if (richness >= 6) return "Rich";
  if (richness >= 4) return "Moderate";
  if (richness >= 2) return "Sparse";
  return "Trace";
}

function starEmoji(starType: string): string {
  const map: Record<string, string> = {
    O: "🔵", B: "🔷", A: "⚪", F: "🟡", G: "☀️", K: "🟠", M: "🔴",
  };
  return map[starType.toUpperCase()] ?? "⭐";
}

export const prospectCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("prospect")
    .setDescription("Survey the resources of your current star system (only visible to you)"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const player = await ensurePlayer(interaction);

    if (!player.currentSystemId) {
      await interaction.editReply("⚠️ You are not currently in any star system.");
      return;
    }

    const system = await db.query.systems.findFirst({
      where: eq(systems.id, player.currentSystemId),
    });

    if (!system) {
      await interaction.editReply("⚠️ Could not locate your current system.");
      return;
    }

    const systemPlanets = await db
      .select()
      .from(planets)
      .where(eq(planets.systemId, system.id))
      .orderBy(planets.slot);

    const systemBelts = await db
      .select()
      .from(asteroidBelts)
      .where(eq(asteroidBelts.systemId, system.id));

    const lines: string[] = [];

    // Header
    lines.push(`## 📡 Prospect Report`);
    lines.push(`${starEmoji(system.starType)} **${system.name}** · ${system.starType}-type Star`);
    lines.push(`> Resource Rating  \`${richnessBar(system.resourceRating)}\` ${system.resourceRating}/10`);

    // Planets
    if (systemPlanets.length > 0) {
      lines.push(`\n**🪐 Planets**`);
      for (const planet of systemPlanets) {
        const emoji = PLANET_EMOJI[planet.planetType] ?? "🪐";
        const ores = PLANET_ORES[planet.planetType] ?? [];
        const label = planet.planetType.replace(/_/g, " ");
        lines.push(`${emoji} **${planet.name}** *(${label})*`);
        if (ores.length === 0) {
          lines.push(`> No extractable resources`);
        } else {
          lines.push(`> ${ores.join(" · ")}`);
        }
      }
    }

    // Asteroid belts
    if (systemBelts.length > 0) {
      lines.push(`\n**🪨 Asteroid Belts**`);
      for (const belt of systemBelts) {
        const richness10 = Math.min(10, Math.round(belt.richness / 10));
        lines.push(`🪨 **${belt.name}**`);
        lines.push(`> \`${richnessBar(richness10)}\` ${richnessLabel(richness10)}`);
        lines.push(`> ${BELT_ORES.join(" · ")}`);
      }
    }

    if (systemPlanets.length === 0 && systemBelts.length === 0) {
      lines.push(`\n*No mineable bodies detected in this system.*`);
    }

    lines.push(`\n-# Only you can see this`);

    await interaction.editReply(lines.join("\n"));
  },
};
