/**
 * Mining system — ore roll tables per planet type, yield calculation.
 */

import type { PlanetType } from "./galaxy.js";

interface MiningDrop {
  itemType: string;
  minQty: number;
  maxQty: number;
  weight: number; // probability weight
}

/**
 * Ore tables per planet type. Each entry has a weight for random selection.
 */
const PLANET_ORE_TABLES: Record<string, MiningDrop[]> = {
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
const BELT_ORE_TABLE: MiningDrop[] = [
  { itemType: "iron_ore", minQty: 2, maxQty: 5, weight: 35 },
  { itemType: "copper_ore", minQty: 1, maxQty: 4, weight: 25 },
  { itemType: "silicon_ore", minQty: 1, maxQty: 3, weight: 20 },
  { itemType: "titanium_ore", minQty: 1, maxQty: 2, weight: 12 },
  { itemType: "platinum_ore", minQty: 1, maxQty: 1, weight: 8 },
];

export interface MiningResult {
  itemType: string;
  quantity: number;
}

/**
 * Roll a mining result for a planet.
 */
export function rollPlanetMining(planetType: string): MiningResult {
  const table = PLANET_ORE_TABLES[planetType];
  if (!table) {
    // Fallback for unknown planet types
    return { itemType: "iron_ore", quantity: 1 };
  }
  return rollFromTable(table);
}

/**
 * Roll a mining result for an asteroid belt.
 */
export function rollBeltMining(richness: number): MiningResult {
  const result = rollFromTable(BELT_ORE_TABLE);
  // Richness multiplier: richness 1 = 1x, richness 5 = 1.5x
  const multiplier = 1 + (richness - 1) * 0.125;
  result.quantity = Math.max(1, Math.round(result.quantity * multiplier));
  return result;
}

function rollFromTable(table: MiningDrop[]): MiningResult {
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
