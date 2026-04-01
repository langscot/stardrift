/**
 * Modifier pipeline — resolves equipment, ship, and environmental
 * effects into a single flat stats object for game functions.
 */

import { db } from "../db/index.js";
import { playerShips, playerModules, shipTypes, moduleTypes } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Partial stat overrides from any single source (ship, module, environment).
 * Omitted fields use defaults (multipliers=1.0, additives=0).
 */
export interface ModifierSource {
  yieldMultiplier?: number;
  cooldownMultiplier?: number;
  extraDropChance?: number;
  rareWeightBonus?: number;
  cargoBonus?: number;
  rareEventChance?: number;
  fuelCapacityBonus?: number;
}

/**
 * Fully resolved stats passed to game functions.
 */
export interface ResolvedModifiers {
  yieldMultiplier: number;
  cooldownMultiplier: number;
  extraDropChance: number;
  rareWeightBonus: number;
  cargoBonus: number;
  rareEventChance: number;
  fuelCapacityBonus: number;
}

/** Default modifiers — no equipment, no effects. */
export const DEFAULT_MODIFIERS: ResolvedModifiers = {
  yieldMultiplier: 1.0,
  cooldownMultiplier: 1.0,
  extraDropChance: 0,
  rareWeightBonus: 0,
  cargoBonus: 0,
  rareEventChance: 0,
  fuelCapacityBonus: 0,
};

/**
 * Stack multiple modifier sources into resolved stats.
 * Multiplicative stats multiply together; additive stats sum.
 */
export function resolveModifiers(sources: ModifierSource[]): ResolvedModifiers {
  let yieldMul = 1.0;
  let cooldownMul = 1.0;
  let extraDrop = 0;
  let rareWeight = 0;
  let cargo = 0;
  let rareEvent = 0;
  let fuelCap = 0;

  for (const s of sources) {
    if (s.yieldMultiplier != null) yieldMul *= s.yieldMultiplier;
    if (s.cooldownMultiplier != null) cooldownMul *= s.cooldownMultiplier;
    if (s.extraDropChance != null) extraDrop += s.extraDropChance;
    if (s.rareWeightBonus != null) rareWeight += s.rareWeightBonus;
    if (s.cargoBonus != null) cargo += s.cargoBonus;
    if (s.rareEventChance != null) rareEvent += s.rareEventChance;
    if (s.fuelCapacityBonus != null) fuelCap += s.fuelCapacityBonus;
  }

  return {
    yieldMultiplier: yieldMul,
    cooldownMultiplier: Math.max(0.2, cooldownMul),
    extraDropChance: extraDrop,
    rareWeightBonus: rareWeight,
    cargoBonus: cargo,
    rareEventChance: Math.min(0.5, rareEvent),
    fuelCapacityBonus: fuelCap,
  };
}

/**
 * Resolve all modifiers for a player: ship base stats + fitted modules + environment.
 * Returns DEFAULT_MODIFIERS when player has no equipment (backward-compatible).
 */
export async function resolvePlayerModifiers(
  userId: string,
  context: { isProxy: boolean }
): Promise<ResolvedModifiers> {
  const sources: ModifierSource[] = [];

  // Ship base modifiers
  const ship = await db.query.playerShips.findFirst({
    where: eq(playerShips.playerId, userId),
  });

  if (ship) {
    const shipType = await db.query.shipTypes.findFirst({
      where: eq(shipTypes.key, ship.shipKey),
    });
    if (shipType) {
      sources.push(shipType.modifiers as ModifierSource);
    }
  }

  // Fitted module modifiers
  const fitted = await db
    .select({ modifiers: moduleTypes.modifiers })
    .from(playerModules)
    .innerJoin(moduleTypes, eq(playerModules.moduleKey, moduleTypes.key))
    .where(eq(playerModules.playerId, userId));

  for (const row of fitted) {
    sources.push(row.modifiers as ModifierSource);
  }

  // Environmental: proxy debuff
  if (context.isProxy) {
    sources.push({ yieldMultiplier: 0.7 });
  }

  return sources.length > 0 ? resolveModifiers(sources) : { ...DEFAULT_MODIFIERS };
}
