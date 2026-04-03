/**
 * Prospect UI builders — used by both the command and button/select handlers.
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

export const PLANET_ORES: Record<string, string[]> = {
  rocky:     ["Iron Ore", "Copper Ore", "Silicon Ore", "Titanium Ore"],
  scorched:  ["Iron Ore", "Titanium Ore", "Platinum Ore", "Crystal Ore"],
  temperate: ["Iron Ore", "Copper Ore", "Silicon Ore"],
  gas_giant: ["Helium Gas", "Hydrogen Gas"],
  ice:       ["Ice Crystal", "Silicon Ore", "Hydrogen Gas"],
  barren:    ["Iron Ore", "Silicon Ore", "Copper Ore"],
  volcanic:  ["Titanium Ore", "Platinum Ore", "Crystal Ore", "Iron Ore", "Dark Matter"],
  ocean:     [],
};

export const BELT_ORES = ["Iron Ore", "Copper Ore", "Silicon Ore", "Titanium Ore", "Platinum Ore"];

/**
 * Estimated average credit value per mine cycle by planet type.
 * Calculated from ore tables (weighted avg qty * base price * drop probability).
 */
const PLANET_VALUE_ESTIMATE: Record<string, number> = {
  rocky:     95,   // iron(10)+copper(12)+silicon(15)+titanium(30), weighted
  scorched:  135,  // titanium+platinum heavy
  temperate: 75,   // common ores only
  gas_giant: 85,   // helium+hydrogen, higher yields
  ice:       80,   // ice crystal+silicon+hydrogen
  barren:    60,   // iron+silicon+copper, low yields
  volcanic:  185,  // platinum+crystal+dark matter
  ocean:     0,
};

const BELT_VALUE_ESTIMATE = 100; // mixed ores, depends on richness

export const PLANET_EMOJI: Record<string, string> = {
  rocky: "🪨", scorched: "🔥", temperate: "🌿", gas_giant: "🌀",
  ice: "❄️", barren: "⬛", volcanic: "🌋", ocean: "🌊",
};

export const STAR_EMOJI: Record<string, string> = {
  O: "🔵", B: "🔷", A: "⚪", F: "🟡", G: "☀️", K: "🟠", M: "🔴",
};

export function richnessBar(richness: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(richness)));
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

export function richnessLabel(richness: number): string {
  if (richness >= 8) return "Very Rich";
  if (richness >= 6) return "Rich";
  if (richness >= 4) return "Moderate";
  if (richness >= 2) return "Sparse";
  return "Trace";
}

// ── Text builders ──────────────────────────────────────────────────────────

export interface SystemData {
  name: string;
  starType: string;
  resourceRating: number;
}

export interface PlanetData {
  id: number;
  name: string;
  planetType: string;
}

export interface BeltData {
  id: number;
  name: string;
  richness: number;
}

/** Full system report (all planets + belts) */
export function buildFullReport(
  system: SystemData,
  planets: PlanetData[],
  belts: BeltData[]
): string {
  const star = STAR_EMOJI[system.starType.toUpperCase()] ?? "⭐";
  const lines: string[] = [];

  lines.push(`## 📡 Prospect Report`);
  lines.push(`${star} **${system.name}** · ${system.starType}-type Star`);
  lines.push(`> Resource Rating  \`${richnessBar(system.resourceRating)}\` ${system.resourceRating}/10`);

  if (planets.length > 0) {
    lines.push(`\n**🪐 Planets**`);
    for (const p of planets) {
      const emoji = PLANET_EMOJI[p.planetType] ?? "🪐";
      const ores = PLANET_ORES[p.planetType] ?? [];
      const est = PLANET_VALUE_ESTIMATE[p.planetType] ?? 0;
      const valueTag = est > 0 ? ` · ~${est}¢/mine` : "";
      lines.push(`${emoji} **${p.name}** *(${p.planetType.replace(/_/g, " ")})*${valueTag}`);
      lines.push(ores.length > 0 ? `> ${ores.join(" · ")}` : `> No extractable resources`);
    }
  }

  if (belts.length > 0) {
    lines.push(`\n**🪨 Asteroid Belts**`);
    for (const b of belts) {
      const r = Math.min(10, Math.round(b.richness / 10));
      const beltMultiplier = 1 + (b.richness - 1) * 0.125;
      const beltEst = Math.round(BELT_VALUE_ESTIMATE * beltMultiplier);
      lines.push(`🪨 **${b.name}** · ~${beltEst}¢/mine`);
      lines.push(`> \`${richnessBar(r)}\` ${richnessLabel(r)}`);
      lines.push(`> ${BELT_ORES.join(" · ")}`);
    }
  }

  if (planets.length === 0 && belts.length === 0) {
    lines.push(`\n*No mineable bodies detected in this system.*`);
  }

  lines.push(`\n-# Only you can see this`);
  return lines.join("\n");
}

/** Single planet report */
export function buildPlanetReport(planet: PlanetData, systemName: string): string {
  const emoji = PLANET_EMOJI[planet.planetType] ?? "🪐";
  const ores = PLANET_ORES[planet.planetType] ?? [];
  const est = PLANET_VALUE_ESTIMATE[planet.planetType] ?? 0;
  const lines: string[] = [];
  lines.push(`## ${emoji} ${planet.name}`);
  lines.push(`*${planet.planetType.replace(/_/g, " ")} · ${systemName}*${est > 0 ? ` · ~${est}¢/mine` : ""}`);
  if (ores.length > 0) {
    lines.push(`\n**Yields**`);
    lines.push(ores.map(o => `> ${o}`).join("\n"));
  } else {
    lines.push(`\n*No extractable resources on this planet.*`);
  }
  lines.push(`\n-# Only you can see this`);
  return lines.join("\n");
}

/** Single belt report */
export function buildBeltReport(belt: BeltData, systemName: string): string {
  const r = Math.min(10, Math.round(belt.richness / 10));
  const beltMultiplier = 1 + (belt.richness - 1) * 0.125;
  const beltEst = Math.round(BELT_VALUE_ESTIMATE * beltMultiplier);
  const lines: string[] = [];
  lines.push(`## 🪨 ${belt.name}`);
  lines.push(`*Asteroid Belt · ${systemName} · ~${beltEst}¢/mine*`);
  lines.push(`\n**Richness** \`${richnessBar(r)}\` ${richnessLabel(r)}`);
  lines.push(`\n**Yields**`);
  lines.push(BELT_ORES.map(o => `> ${o}`).join("\n"));
  lines.push(`\n-# Only you can see this`);
  return lines.join("\n");
}

/** Overview selector text */
export function buildOverviewText(system: SystemData): string {
  const star = STAR_EMOJI[system.starType.toUpperCase()] ?? "⭐";
  return `## 📡 ${star} ${system.name}\nSelect a body to survey:`;
}

// ── Component builders ─────────────────────────────────────────────────────

/** Back → overview button */
export function overviewButton(systemId: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`prospect_overview:${systemId}`)
      .setLabel("← System Overview")
      .setStyle(ButtonStyle.Secondary)
  );
}

/** Back → body button (from overview back to single body) */
export function backToBodyButton(channelType: string, refId: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`prospect_body:${channelType}:${refId}`)
      .setLabel("← Back")
      .setStyle(ButtonStyle.Secondary)
  );
}

/** Select menu of all bodies in system + "All" option */
export function bodySelectMenu(
  systemId: number,
  planets: PlanetData[],
  belts: BeltData[]
) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`prospect_select:${systemId}`)
    .setPlaceholder("Choose a body…");

  select.addOptions(
    new StringSelectMenuOptionBuilder()
      .setLabel("📋 All Bodies")
      .setDescription("Full system prospect report")
      .setValue("all")
  );

  for (const p of planets) {
    const emoji = PLANET_EMOJI[p.planetType] ?? "🪐";
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${emoji} ${p.name}`)
        .setDescription(`${p.planetType.replace(/_/g, " ")} planet`)
        .setValue(`planet:${p.id}`)
    );
  }

  for (const b of belts) {
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`🪨 ${b.name}`)
        .setDescription(`Richness: ${richnessLabel(Math.min(10, Math.round(b.richness / 10)))}`)
        .setValue(`belt:${b.id}`)
    );
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}
