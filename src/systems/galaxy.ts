/**
 * Galaxy generation helpers — name generation, coordinate placement,
 * star type distribution, planet generation.
 */

// ─── Name Generation ─────────────────────────────────────────────

const PREFIXES = [
  "Al", "Ar", "Ax", "Be", "Bor", "Cal", "Cen", "Cor", "Cy", "Da",
  "Del", "Dra", "El", "En", "Eth", "Fa", "Fen", "Gal", "Gor", "Hel",
  "Hy", "Ix", "Ja", "Kal", "Ke", "Kry", "Lar", "Lun", "Ly", "Mal",
  "Mar", "Mir", "Neb", "Nex", "No", "Ob", "Or", "Pal", "Per", "Pho",
  "Pro", "Pyr", "Qua", "Ra", "Ren", "Rig", "Ro", "Sar", "Sel", "Si",
  "Sol", "Sor", "Stel", "Sy", "Tar", "Tel", "Tho", "Tri", "Ul", "Val",
  "Var", "Vel", "Vin", "Vor", "Wyr", "Xa", "Xen", "Yor", "Za", "Zel",
  "Zor", "Zy", "An", "Ash", "Bri", "Cra", "Dor", "Ey", "Fre", "Gri",
];

const SUFFIXES = [
  "ara", "ath", "ax", "eon", "eth", "ia", "ica", "iel", "ium", "ion",
  "is", "ix", "on", "or", "os", "ox", "tus", "um", "una", "ura",
  "us", "yx", "zen", "zon", "tar", "nar", "ris", "las", "mos", "nos",
  "pas", "ras", "vas", "dan", "fan", "han", "kan", "lan", "man", "ran",
  "heim", "burg", "gate", "hold", "mark", "stead", "vale", "ward", "well", "wick",
  "arn", "eld", "ind", "ord", "und", "ent", "int", "ost", "ult", "orn",
  "ake", "ine", "ode", "ule", "ane", "ire", "ose", "ure", "ive", "ade",
  "yx", "ex", "ox", "az", "ez", "iz", "oz", "uz", "iq", "oq",
];

const MIDDLE = [
  "to", "ri", "na", "lo", "ma", "ve", "se", "te", "de", "ne",
  "li", "ra", "si", "ta", "ka", "mi", "no", "pa", "ro", "vi",
];

export function generateSystemName(usedNames: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];

    // 40% chance of adding a middle syllable
    const useMiddle = Math.random() < 0.4;
    const middle = useMiddle
      ? MIDDLE[Math.floor(Math.random() * MIDDLE.length)]
      : "";

    const name = prefix + middle + suffix;

    if (!usedNames.has(name) && name.length >= 4 && name.length <= 14) {
      usedNames.add(name);
      return name;
    }
    attempts++;
  }
  // Fallback: add a number
  const fallback = `System-${Math.floor(Math.random() * 999999)}`;
  usedNames.add(fallback);
  return fallback;
}

// ─── Coordinate Generation ───────────────────────────────────────

const GALAXY_RADIUS = 500;
const CORE_STD_DEV = 150;

/**
 * Generate a 2D coordinate using Gaussian distribution.
 * Box-Muller transform.
 */
function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

export function generateCoreCoordinate(): { x: number; y: number } {
  let x: number, y: number;
  do {
    x = gaussianRandom(0, CORE_STD_DEV);
    y = gaussianRandom(0, CORE_STD_DEV);
  } while (Math.sqrt(x * x + y * y) > GALAXY_RADIUS);
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

export function generateClusterCoordinate(
  cx: number,
  cy: number,
  stdDev: number
): { x: number; y: number } {
  let x: number, y: number;
  do {
    x = gaussianRandom(cx, stdDev);
    y = gaussianRandom(cy, stdDev);
  } while (Math.sqrt(x * x + y * y) > GALAXY_RADIUS);
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

// ─── Star Type Generation ────────────────────────────────────────

export type StarType =
  | "yellow_dwarf"
  | "red_giant"
  | "blue_giant"
  | "neutron_star"
  | "black_hole";

/**
 * Pick a star type. Rarer types more likely at greater distance from center.
 */
export function pickStarType(distanceFromCenter: number): StarType {
  const distanceFactor = Math.min(distanceFromCenter / GALAXY_RADIUS, 1);

  // Shift probabilities based on distance
  const weights = {
    yellow_dwarf: 0.6 - distanceFactor * 0.2,
    red_giant: 0.2,
    blue_giant: 0.1 + distanceFactor * 0.05,
    neutron_star: 0.07 + distanceFactor * 0.08,
    black_hole: 0.03 + distanceFactor * 0.07,
  };

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;

  for (const [type, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return type as StarType;
  }
  return "yellow_dwarf";
}

// ─── Planet Generation ───────────────────────────────────────────

export type PlanetType =
  | "rocky"
  | "temperate"
  | "gas_giant"
  | "ice"
  | "barren"
  | "volcanic"
  | "scorched";

const PLANET_WEIGHTS: Record<StarType, Record<PlanetType, number>> = {
  yellow_dwarf: {
    rocky: 0.2,
    temperate: 0.15,
    gas_giant: 0.15,
    ice: 0.15,
    barren: 0.15,
    volcanic: 0.1,
    scorched: 0.1,
  },
  red_giant: {
    rocky: 0.15,
    temperate: 0.05,
    gas_giant: 0.2,
    ice: 0.1,
    barren: 0.2,
    volcanic: 0.15,
    scorched: 0.15,
  },
  blue_giant: {
    rocky: 0.2,
    temperate: 0.05,
    gas_giant: 0.1,
    ice: 0.05,
    barren: 0.15,
    volcanic: 0.25,
    scorched: 0.2,
  },
  neutron_star: {
    rocky: 0.15,
    temperate: 0.02,
    gas_giant: 0.05,
    ice: 0.1,
    barren: 0.35,
    volcanic: 0.18,
    scorched: 0.15,
  },
  black_hole: {
    rocky: 0.1,
    temperate: 0.01,
    gas_giant: 0.05,
    ice: 0.05,
    barren: 0.4,
    volcanic: 0.2,
    scorched: 0.19,
  },
};

const PLANET_COUNT_RANGE: Record<StarType, [number, number]> = {
  yellow_dwarf: [3, 8],
  red_giant: [2, 6],
  blue_giant: [2, 5],
  neutron_star: [1, 4],
  black_hole: [1, 3],
};

function pickPlanetType(starType: StarType): PlanetType {
  const weights = PLANET_WEIGHTS[starType];
  let roll = Math.random();
  for (const [type, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return type as PlanetType;
  }
  return "barren";
}

const ROMAN_NUMERALS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
];

export interface GeneratedPlanet {
  slot: number;
  name: string;
  planetType: PlanetType;
}

export function generatePlanets(
  systemName: string,
  starType: StarType
): GeneratedPlanet[] {
  const [min, max] = PLANET_COUNT_RANGE[starType];
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const planets: GeneratedPlanet[] = [];

  for (let i = 0; i < count; i++) {
    planets.push({
      slot: i + 1,
      name: `${systemName} ${ROMAN_NUMERALS[i]}`,
      planetType: pickPlanetType(starType),
    });
  }
  return planets;
}

// ─── Asteroid Belt Generation ────────────────────────────────────

export interface GeneratedBelt {
  name: string;
  richness: number; // 1-5
}

export function generateBelts(
  systemName: string,
  resourceRating: number
): GeneratedBelt[] {
  // 70% chance of at least 1 belt, 20% chance of 2
  const roll = Math.random();
  let count = 0;
  if (roll < 0.2) count = 2;
  else if (roll < 0.7) count = 1;

  const belts: GeneratedBelt[] = [];
  for (let i = 0; i < count; i++) {
    // Richness biased by resource rating
    const baseRichness = Math.ceil(Math.random() * 3);
    const bonus = resourceRating > 6 ? 1 : 0;
    const richness = Math.min(5, baseRichness + bonus);
    belts.push({
      name: `${systemName} Belt${count > 1 ? ` ${i + 1}` : ""}`,
      richness,
    });
  }
  return belts;
}

// ─── Resource Rating ─────────────────────────────────────────────

export function calculateResourceRating(
  starType: StarType,
  planetTypes: PlanetType[]
): number {
  let score = 0;

  // Star type bonus
  const starBonus: Record<StarType, number> = {
    yellow_dwarf: 0,
    red_giant: 1,
    blue_giant: 2,
    neutron_star: 3,
    black_hole: 4,
  };
  score += starBonus[starType];

  // Planet diversity bonus
  const uniqueTypes = new Set(planetTypes);
  score += Math.min(3, uniqueTypes.size);

  // Valuable planet bonus
  for (const pt of planetTypes) {
    if (pt === "volcanic") score += 0.5;
    if (pt === "gas_giant") score += 0.3;
    if (pt === "rocky") score += 0.2;
  }

  // Clamp and round to 1-10
  return Math.max(1, Math.min(10, Math.round(score)));
}

// ─── Hub System ──────────────────────────────────────────────────

export const HUB_SYSTEM = {
  name: "Sol Nexus",
  x: 0,
  y: 0,
  starType: "yellow_dwarf" as StarType,
  resourceRating: 6,
  isHub: true,
  planets: [
    { slot: 1, name: "Sol Nexus I", planetType: "scorched" as PlanetType },
    { slot: 2, name: "Sol Nexus II", planetType: "rocky" as PlanetType },
    { slot: 3, name: "Sol Nexus III", planetType: "temperate" as PlanetType },
    { slot: 4, name: "Sol Nexus IV", planetType: "gas_giant" as PlanetType },
    { slot: 5, name: "Sol Nexus V", planetType: "ice" as PlanetType },
  ],
  belts: [{ name: "Sol Nexus Belt", richness: 3 }],
};

// ─── Item Type Definitions ───────────────────────────────────────

export const ITEM_TYPES = [
  // Common ores (from rocky, barren, asteroid belts)
  { key: "iron_ore", displayName: "Iron Ore", category: "ore", basePrice: 10 },
  { key: "copper_ore", displayName: "Copper Ore", category: "ore", basePrice: 12 },
  { key: "silicon_ore", displayName: "Silicon Ore", category: "ore", basePrice: 15 },

  // Uncommon ores (from volcanic, scorched)
  { key: "titanium_ore", displayName: "Titanium Ore", category: "ore", basePrice: 30 },
  { key: "platinum_ore", displayName: "Platinum Ore", category: "ore", basePrice: 50 },

  // Rare ores (from exotic planets, rare stars)
  { key: "crystal_ore", displayName: "Crystal Ore", category: "ore", basePrice: 80 },
  { key: "dark_matter", displayName: "Dark Matter", category: "ore", basePrice: 200 },

  // Ice world resources
  { key: "ice_crystal", displayName: "Ice Crystal", category: "ore", basePrice: 18 },

  // Gas giant resources
  { key: "helium_gas", displayName: "Helium Gas", category: "fuel", basePrice: 20 },
  { key: "hydrogen_gas", displayName: "Hydrogen Gas", category: "fuel", basePrice: 15 },
];
