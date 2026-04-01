/**
 * Mining system — ore roll tables per planet type, yield calculation.
 */

import type { PlanetType } from "./galaxy.js";
import type { ResolvedModifiers } from "./modifiers.js";
import { DEFAULT_MODIFIERS } from "./modifiers.js";

interface MiningDropEntry {
  itemType: string;
  minQty: number;
  maxQty: number;
  weight: number; // probability weight
}

/**
 * Ore tables per planet type. Each entry has a weight for random selection.
 */
const PLANET_ORE_TABLES: Record<string, MiningDropEntry[]> = {
  rocky: [
    { itemType: "iron_ore", minQty: 2, maxQty: 5, weight: 40 },
    { itemType: "copper_ore", minQty: 1, maxQty: 4, weight: 30 },
    { itemType: "silicon_ore", minQty: 1, maxQty: 3, weight: 20 },
    { itemType: "titanium_ore", minQty: 1, maxQty: 2, weight: 10 },
  ],
  scorched: [
    { itemType: "iron_ore", minQty: 1, maxQty: 3, weight: 25 },
    { itemType: "titanium_ore", minQty: 1, maxQty: 3, weight: 35 },
    { itemType: "platinum_ore", minQty: 1, maxQty: 2, weight: 25 },
    { itemType: "crystal_ore", minQty: 1, maxQty: 1, weight: 15 },
  ],
  temperate: [
    { itemType: "iron_ore", minQty: 1, maxQty: 3, weight: 35 },
    { itemType: "copper_ore", minQty: 1, maxQty: 3, weight: 35 },
    { itemType: "silicon_ore", minQty: 1, maxQty: 2, weight: 30 },
  ],
  gas_giant: [
    { itemType: "helium_gas", minQty: 2, maxQty: 6, weight: 45 },
    { itemType: "hydrogen_gas", minQty: 2, maxQty: 6, weight: 55 },
  ],
  ice: [
    { itemType: "ice_crystal", minQty: 2, maxQty: 5, weight: 50 },
    { itemType: "silicon_ore", minQty: 1, maxQty: 2, weight: 25 },
    { itemType: "hydrogen_gas", minQty: 1, maxQty: 3, weight: 25 },
  ],
  barren: [
    { itemType: "iron_ore", minQty: 1, maxQty: 3, weight: 50 },
    { itemType: "silicon_ore", minQty: 1, maxQty: 2, weight: 35 },
    { itemType: "copper_ore", minQty: 1, maxQty: 2, weight: 15 },
  ],
  volcanic: [
    { itemType: "titanium_ore", minQty: 2, maxQty: 4, weight: 30 },
    { itemType: "platinum_ore", minQty: 1, maxQty: 3, weight: 25 },
    { itemType: "crystal_ore", minQty: 1, maxQty: 2, weight: 20 },
    { itemType: "dark_matter", minQty: 1, maxQty: 1, weight: 5 },
    { itemType: "iron_ore", minQty: 1, maxQty: 3, weight: 20 },
  ],
};

/**
 * Asteroid belt ore table — richness affects yield multiplier.
 */
const BELT_ORE_TABLE: MiningDropEntry[] = [
  { itemType: "iron_ore", minQty: 2, maxQty: 5, weight: 35 },
  { itemType: "copper_ore", minQty: 1, maxQty: 4, weight: 25 },
  { itemType: "silicon_ore", minQty: 1, maxQty: 3, weight: 20 },
  { itemType: "titanium_ore", minQty: 1, maxQty: 2, weight: 12 },
  { itemType: "platinum_ore", minQty: 1, maxQty: 1, weight: 8 },
];

export interface MiningDrop {
  itemType: string;
  quantity: number;
}

export type MiningResult = MiningDrop[];

/**
 * Roll mining results for a planet. Returns 1–3 distinct drops.
 */
export function rollPlanetMining(
  planetType: string,
  mods: ResolvedModifiers = DEFAULT_MODIFIERS
): MiningResult {
  const table = PLANET_ORE_TABLES[planetType];
  if (!table) {
    return [{ itemType: "iron_ore", quantity: 1 }];
  }
  return rollMultipleFromTable(table, mods);
}

/**
 * Roll mining results for an asteroid belt. Returns 1–3 distinct drops.
 */
export function rollBeltMining(
  richness: number,
  mods: ResolvedModifiers = DEFAULT_MODIFIERS
): MiningResult {
  const results = rollMultipleFromTable(BELT_ORE_TABLE, mods);
  // Richness multiplier: richness 1 = 1x, richness 5 = 1.5x
  const multiplier = 1 + (richness - 1) * 0.125;
  for (const drop of results) {
    drop.quantity = Math.max(1, Math.round(drop.quantity * multiplier));
  }
  return results;
}

/**
 * Roll 1–3 drops from a table. Each additional drop has decreasing probability.
 * Modifiers affect: drop chances, yield quantities, and rare ore weights.
 */
function rollMultipleFromTable(
  table: MiningDropEntry[],
  mods: ResolvedModifiers
): MiningResult {
  // Apply rareWeightBonus to rare ores (base weight < 10)
  const modifiedTable =
    mods.rareWeightBonus > 0
      ? table.map((entry) =>
          entry.weight < 10
            ? { ...entry, weight: entry.weight + mods.rareWeightBonus }
            : entry
        )
      : table;

  const drops = new Map<string, number>();

  // Always get at least one drop
  const first = rollOneFromTable(modifiedTable);
  drops.set(first.itemType, (drops.get(first.itemType) ?? 0) + first.quantity);

  // Second drop: base 50% + extraDropChance
  if (Math.random() < 0.5 + mods.extraDropChance) {
    const second = rollOneFromTable(modifiedTable);
    drops.set(second.itemType, (drops.get(second.itemType) ?? 0) + second.quantity);

    // Third drop: base 20% + extraDropChance (only if second was rolled)
    if (Math.random() < 0.2 + mods.extraDropChance) {
      const third = rollOneFromTable(modifiedTable);
      drops.set(third.itemType, (drops.get(third.itemType) ?? 0) + third.quantity);
    }
  }

  // Apply yield multiplier
  if (mods.yieldMultiplier !== 1.0) {
    for (const [itemType, qty] of drops) {
      drops.set(itemType, Math.max(1, Math.round(qty * mods.yieldMultiplier)));
    }
  }

  return Array.from(drops, ([itemType, quantity]) => ({ itemType, quantity }));
}

function rollOneFromTable(table: MiningDropEntry[]): { itemType: string; quantity: number } {
  const totalWeight = table.reduce((sum, d) => sum + d.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const drop of table) {
    roll -= drop.weight;
    if (roll <= 0) {
      const quantity =
        drop.minQty +
        Math.floor(Math.random() * (drop.maxQty - drop.minQty + 1));
      return { itemType: drop.itemType, quantity };
    }
  }

  // Fallback to first entry
  const d = table[0];
  return {
    itemType: d.itemType,
    quantity: d.minQty + Math.floor(Math.random() * (d.maxQty - d.minQty + 1)),
  };
}
