/**
 * Rare events — bonus outcomes that can trigger during mining
 * based on the player's rareEventChance modifier (from scanners, etc.).
 */

export interface RareEventReward {
  type: "item" | "credits" | "fuel";
  itemType?: string;
  minQty: number;
  maxQty: number;
}

export interface RareEvent {
  key: string;
  name: string;
  description: string;
  emoji: string;
  weight: number;
  rewards: RareEventReward[];
}

/**
 * Data-driven event table. Add new events here — no code changes needed elsewhere.
 */
const RARE_EVENTS: RareEvent[] = [
  {
    key: "dark_matter_pocket",
    name: "Dark Matter Pocket",
    description: "Your scanner detected an anomalous energy signature...",
    emoji: "🌑",
    weight: 10,
    rewards: [{ type: "item", itemType: "dark_matter", minQty: 1, maxQty: 3 }],
  },
  {
    key: "anomaly_fragment",
    name: "Anomaly Fragment",
    description: "A strange crystalline structure embedded in the rock...",
    emoji: "🔮",
    weight: 15,
    rewards: [{ type: "item", itemType: "anomaly_fragment", minQty: 1, maxQty: 2 }],
  },
  {
    key: "credits_cache",
    name: "Abandoned Cargo",
    description: "You found a sealed cargo pod drifting in the debris...",
    emoji: "💰",
    weight: 25,
    rewards: [{ type: "credits", minQty: 50, maxQty: 200 }],
  },
  {
    key: "fuel_recovery",
    name: "Fuel Leak Recovery",
    description: "Your sensors picked up a venting fuel tank nearby...",
    emoji: "⛽",
    weight: 20,
    rewards: [{ type: "fuel", minQty: 10, maxQty: 30 }],
  },
  {
    key: "crystal_geode",
    name: "Crystal Geode",
    description: "You cracked open a geode packed with crystal formations!",
    emoji: "💎",
    weight: 15,
    rewards: [{ type: "item", itemType: "crystal_ore", minQty: 2, maxQty: 5 }],
  },
  {
    key: "ancient_relic",
    name: "Ancient Relic",
    description: "An artifact of unknown origin, humming with faint energy...",
    emoji: "🏺",
    weight: 5,
    rewards: [{ type: "item", itemType: "ancient_relic", minQty: 1, maxQty: 1 }],
  },
];

export interface RolledRareEvent {
  name: string;
  description: string;
  emoji: string;
  rewards: RolledReward[];
}

export interface RolledReward {
  type: "item" | "credits" | "fuel";
  itemType?: string;
  quantity: number;
}

/**
 * Roll which rare event triggers and resolve reward quantities.
 */
export function rollRareEvent(): RolledRareEvent {
  const totalWeight = RARE_EVENTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  let event = RARE_EVENTS[0];
  for (const e of RARE_EVENTS) {
    roll -= e.weight;
    if (roll <= 0) {
      event = e;
      break;
    }
  }

  const rewards: RolledReward[] = event.rewards.map((r) => ({
    type: r.type,
    itemType: r.itemType,
    quantity: r.minQty + Math.floor(Math.random() * (r.maxQty - r.minQty + 1)),
  }));

  return {
    name: event.name,
    description: event.description,
    emoji: event.emoji,
    rewards,
  };
}
