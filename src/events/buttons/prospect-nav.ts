/**
 * Handles prospect navigation:
 *   prospect_overview:{systemId}   — show body select menu
 *   prospect_body:{type}:{refId}   — show single body report (from overview)
 *   prospect_select:{systemId}     — select menu value → body or all report
 */

import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  MessageFlags,
} from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { systems, planets, asteroidBelts } from "../../db/schema.js";
import {
  buildFullReport,
  buildPlanetReport,
  buildBeltReport,
  buildOverviewText,
  overviewButton,
  bodySelectMenu,
} from "../../ui/prospect.js";

async function loadSystem(systemId: number) {
  return db.query.systems.findFirst({ where: eq(systems.id, systemId) });
}

async function loadPlanets(systemId: number) {
  return db.select().from(planets).where(eq(planets.systemId, systemId)).orderBy(planets.slot);
}

async function loadBelts(systemId: number) {
  return db.select().from(asteroidBelts).where(eq(asteroidBelts.systemId, systemId));
}

/** prospect_overview:{systemId} — show the select menu */
export async function handleProspectOverview(
  interaction: ButtonInteraction,
  systemId: number
): Promise<void> {
  const system = await loadSystem(systemId);
  if (!system) { await interaction.update({ content: "⚠️ System not found.", components: [] }); return; }

  const [sysPlanets, sysBelts] = await Promise.all([loadPlanets(systemId), loadBelts(systemId)]);

  await interaction.update({
    content: buildOverviewText(system),
    components: [bodySelectMenu(systemId, sysPlanets, sysBelts)],
  });
}

/** prospect_body:{type}:{refId} — show a single body (re-fetch by ID) */
export async function handleProspectBody(
  interaction: ButtonInteraction,
  channelType: string,
  refId: number
): Promise<void> {
  if (channelType === "planet") {
    const planet = await db.query.planets.findFirst({ where: eq(planets.id, refId) });
    if (!planet) { await interaction.update({ content: "⚠️ Planet not found.", components: [] }); return; }
    const system = await loadSystem(planet.systemId);
    const sysPlanets = await loadPlanets(planet.systemId);
    const sysBelts = await loadBelts(planet.systemId);
    await interaction.update({
      content: buildPlanetReport(planet, system?.name ?? "Unknown"),
      components: [overviewButton(planet.systemId), bodySelectMenu(planet.systemId, sysPlanets, sysBelts)],
    });
  } else {
    const belt = await db.query.asteroidBelts.findFirst({ where: eq(asteroidBelts.id, refId) });
    if (!belt) { await interaction.update({ content: "⚠️ Belt not found.", components: [] }); return; }
    const system = await loadSystem(belt.systemId);
    const sysPlanets = await loadPlanets(belt.systemId);
    const sysBelts = await loadBelts(belt.systemId);
    await interaction.update({
      content: buildBeltReport(belt, system?.name ?? "Unknown"),
      components: [overviewButton(belt.systemId), bodySelectMenu(belt.systemId, sysPlanets, sysBelts)],
    });
  }
}

/** prospect_select:{systemId} — select menu handler */
export async function handleProspectSelect(
  interaction: StringSelectMenuInteraction,
  systemId: number
): Promise<void> {
  const value = interaction.values[0];
  const system = await loadSystem(systemId);
  if (!system) { await interaction.update({ content: "⚠️ System not found.", components: [] }); return; }

  const [sysPlanets, sysBelts] = await Promise.all([loadPlanets(systemId), loadBelts(systemId)]);

  if (value === "all") {
    await interaction.update({
      content: buildFullReport(system, sysPlanets, sysBelts),
      components: [bodySelectMenu(systemId, sysPlanets, sysBelts)],
    });
    return;
  }

  const [type, rawId] = value.split(":");
  const refId = parseInt(rawId, 10);

  if (type === "planet") {
    const planet = sysPlanets.find(p => p.id === refId);
    if (!planet) { await interaction.update({ content: "⚠️ Planet not found.", components: [] }); return; }
    await interaction.update({
      content: buildPlanetReport(planet, system.name),
      components: [overviewButton(systemId), bodySelectMenu(systemId, sysPlanets, sysBelts)],
    });
  } else {
    const belt = sysBelts.find(b => b.id === refId);
    if (!belt) { await interaction.update({ content: "⚠️ Belt not found.", components: [] }); return; }
    await interaction.update({
      content: buildBeltReport(belt, system.name),
      components: [overviewButton(systemId), bodySelectMenu(systemId, sysPlanets, sysBelts)],
    });
  }
}
