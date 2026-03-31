/**
 * Shared mining execution logic — used by both the /mine slash command
 * and the "Mine Again" button handler.
 */
import { db } from "../db/index.js";
import { planets, asteroidBelts, itemTypes, systemChannels } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { checkCooldown, setCooldown } from "../redis/cooldowns.js";
import { getTravelState } from "../redis/travel.js";
import { isProxyInGuild } from "../db/queries/systems.js";
import { getCargoCount, addToCargo } from "../db/queries/inventory.js";
import { rollPlanetMining, rollBeltMining } from "./mining.js";
import { config } from "../config.js";
import { PROXY_MINING_MULTIPLIER } from "../middleware/location-guard.js";

export interface MinedItem {
  itemDisplayName: string;
  quantity: number;
  emoji?: string;
  basePrice?: number;
}

/** Temporary emoji map until emoji column is added to item_types table */
export const ITEM_EMOJI: Record<string, string> = {
  iron_ore: "<:iron_ore:1488250230737600622>",
  copper_ore: "<:copper_ore:1488250220969070713>",
  silicon_ore: "<:silicon_ore:1488250233178816622>",
  titanium_ore: "<:titanium_ore:1488250234558611639>",
  platinum_ore: "<:platinum_ore:1488250231899426898>",
  crystal_ore: "<:crystal_ore:1488250223368339620>",
  dark_matter: "<:dark_matter:1488250225285136424>",
  helium_gas: "<:helium_gas:1488250226379718709>",
  hydrogen_gas: "<:hydrogen_gas:1488250227784683781>",
  ice_crystal: "<:ice_crystal:1488250229252685854>",
};

export type MiningActionResult =
  | {
      type: "success";
      items: MinedItem[];
      cargoUsed: number;
      cargoCapacity: number;
      isProxy: boolean;
      channelType: string;
      referenceId: number | null;
      systemId: number;
    }
  | { type: "error"; message: string }
  | { type: "cooldown"; remainingSeconds: number }
  | { type: "cargo_full" };

export async function executeMining(
  userId: string,
  channelId: string,
  cargoCapacity: number,
  currentSystemId: number | null
): Promise<MiningActionResult> {
  // Must be docked
  if (!currentSystemId) {
    return { type: "error", message: "You are in transit and cannot mine." };
  }

  // Check traveling
  const travelState = await getTravelState(userId);
  if (travelState) {
    return { type: "error", message: "You are in transit and cannot mine." };
  }

  // Look up channel
  const channel = await db.query.systemChannels.findFirst({
    where: eq(systemChannels.channelId, channelId),
  });
  if (!channel || !["planet", "asteroid_belt"].includes(channel.channelType)) {
    return { type: "error", message: "Nothing to mine here." };
  }

  // Player must be in this system
  if (currentSystemId !== channel.systemId) {
    return { type: "error", message: "You are not in this system." };
  }

  // Cooldown
  const cd = await checkCooldown(userId, "mine");
  if (!cd.ready) {
    return { type: "cooldown", remainingSeconds: cd.remainingSeconds };
  }

  // Cargo capacity
  const cargoUsed = await getCargoCount(userId);
  if (cargoUsed >= cargoCapacity) {
    return { type: "cargo_full" };
  }

  // Roll mining result (multiple drops)
  let drops;
  if (channel.channelType === "planet" && channel.referenceId) {
    const planet = await db.query.planets.findFirst({
      where: eq(planets.id, channel.referenceId),
    });
    if (!planet) return { type: "error", message: "Planet not found." };
    drops = rollPlanetMining(planet.planetType);
  } else if (channel.channelType === "asteroid_belt" && channel.referenceId) {
    const belt = await db.query.asteroidBelts.findFirst({
      where: eq(asteroidBelts.id, channel.referenceId),
    });
    if (!belt) return { type: "error", message: "Belt not found." };
    drops = rollBeltMining(belt.richness);
  } else {
    return { type: "error", message: "Nothing to mine here." };
  }

  // Proxy debuff
  const proxy = channel.guildId
    ? await isProxyInGuild(channel.guildId, channel.systemId)
    : false;
  if (proxy) {
    for (const drop of drops) {
      drop.quantity = Math.max(1, Math.floor(drop.quantity * PROXY_MINING_MULTIPLIER));
    }
  }

  // Clamp total to cargo space
  let remainingSpace = cargoCapacity - cargoUsed;
  let totalAdded = 0;
  for (const drop of drops) {
    drop.quantity = Math.min(drop.quantity, remainingSpace);
    if (drop.quantity <= 0) continue;
    remainingSpace -= drop.quantity;
    totalAdded += drop.quantity;
  }
  // Remove drops that got clamped to 0
  const validDrops = drops.filter(d => d.quantity > 0);

  // Save all drops to cargo
  for (const drop of validDrops) {
    await addToCargo(userId, drop.itemType, drop.quantity);
  }

  // Set cooldown
  await setCooldown(userId, "mine", config.MINING_COOLDOWN_SECONDS);

  // Resolve display names
  const allItemTypes = await db.query.itemTypes.findMany();
  const itemTypeMap = new Map(allItemTypes.map(it => [it.key, { displayName: it.displayName, basePrice: it.basePrice }]));

  const items: MinedItem[] = validDrops.map(drop => {
    const info = itemTypeMap.get(drop.itemType);
    return {
      itemDisplayName: info?.displayName ?? drop.itemType,
      quantity: drop.quantity,
      emoji: ITEM_EMOJI[drop.itemType],
      basePrice: info?.basePrice,
    };
  });

  return {
    type: "success",
    items,
    cargoUsed: cargoUsed + totalAdded,
    cargoCapacity,
    isProxy: proxy,
    channelType: channel.channelType,
    referenceId: channel.referenceId,
    systemId: channel.systemId,
  };
}
