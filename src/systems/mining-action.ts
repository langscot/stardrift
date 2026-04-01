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
import { rollRareEvent, type RolledRareEvent } from "./rare-events.js";
import { config } from "../config.js";
import type { ResolvedModifiers } from "./modifiers.js";
import { DEFAULT_MODIFIERS, resolvePlayerModifiers } from "./modifiers.js";
import { addCredits } from "../db/queries/players.js";

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

export interface RareEventResult {
  name: string;
  emoji: string;
  description: string;
  rewards: MinedItem[];
}

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
      rareEvent?: RareEventResult;
      effectiveCooldown: number;
      mods: ResolvedModifiers;
    }
  | { type: "error"; message: string }
  | { type: "cooldown"; remainingSeconds: number }
  | { type: "cargo_full" };

export async function executeMining(
  userId: string,
  channelId: string,
  cargoCapacity: number,
  currentSystemId: number | null,
  mods: ResolvedModifiers = DEFAULT_MODIFIERS
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

  // Cargo capacity (include cargo bonus from modifiers)
  const proxy = channel.guildId
    ? await isProxyInGuild(channel.guildId, channel.systemId)
    : false;

  // Resolve modifiers if not provided (ship + modules + proxy debuff)
  const resolvedMods = mods !== DEFAULT_MODIFIERS
    ? mods
    : await resolvePlayerModifiers(userId, { isProxy: proxy });

  const effectiveCargoCapacity = cargoCapacity + resolvedMods.cargoBonus;
  const cargoUsed = await getCargoCount(userId);
  if (cargoUsed >= effectiveCargoCapacity) {
    return { type: "cargo_full" };
  }

  // Roll mining result (multiple drops) — modifiers affect yields, drop chances, rare weights
  let drops;
  if (channel.channelType === "planet" && channel.referenceId) {
    const planet = await db.query.planets.findFirst({
      where: eq(planets.id, channel.referenceId),
    });
    if (!planet) return { type: "error", message: "Planet not found." };
    drops = rollPlanetMining(planet.planetType, resolvedMods);
  } else if (channel.channelType === "asteroid_belt" && channel.referenceId) {
    const belt = await db.query.asteroidBelts.findFirst({
      where: eq(asteroidBelts.id, channel.referenceId),
    });
    if (!belt) return { type: "error", message: "Belt not found." };
    drops = rollBeltMining(belt.richness, resolvedMods);
  } else {
    return { type: "error", message: "Nothing to mine here." };
  }

  // Clamp total to cargo space
  let remainingSpace = effectiveCargoCapacity - cargoUsed;
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

  // Rare event roll
  let rareEvent: RareEventResult | undefined;
  if (resolvedMods.rareEventChance > 0 && Math.random() < resolvedMods.rareEventChance) {
    const event = rollRareEvent();

    // Resolve display info and apply rewards
    const allItemTypes = await db.query.itemTypes.findMany();
    const itemTypeMap = new Map(allItemTypes.map(it => [it.key, { displayName: it.displayName, basePrice: it.basePrice }]));

    const rewardItems: MinedItem[] = [];
    for (const reward of event.rewards) {
      if (reward.type === "item" && reward.itemType) {
        // Clamp to remaining cargo space
        const qty = Math.min(reward.quantity, remainingSpace);
        if (qty > 0) {
          await addToCargo(userId, reward.itemType, qty);
          remainingSpace -= qty;
          totalAdded += qty;
          const info = itemTypeMap.get(reward.itemType);
          rewardItems.push({
            itemDisplayName: info?.displayName ?? reward.itemType,
            quantity: qty,
            emoji: ITEM_EMOJI[reward.itemType],
            basePrice: info?.basePrice,
          });
        }
      } else if (reward.type === "credits") {
        await addCredits(userId, reward.quantity);
        rewardItems.push({
          itemDisplayName: "Credits",
          quantity: reward.quantity,
          emoji: "💰",
        });
      } else if (reward.type === "fuel") {
        // Add fuel directly (capped at fuel capacity handled by caller if needed)
        rewardItems.push({
          itemDisplayName: "Fuel",
          quantity: reward.quantity,
          emoji: "⛽",
        });
      }
    }

    rareEvent = {
      name: event.name,
      emoji: event.emoji,
      description: event.description,
      rewards: rewardItems,
    };
  }

  // Set cooldown — modified by equipment
  const effectiveCooldown = Math.round(config.MINING_COOLDOWN_SECONDS * resolvedMods.cooldownMultiplier);
  await setCooldown(userId, "mine", effectiveCooldown);

  // Resolve display names for main drops
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
    cargoCapacity: effectiveCargoCapacity,
    isProxy: proxy,
    channelType: channel.channelType,
    referenceId: channel.referenceId,
    systemId: channel.systemId,
    rareEvent,
    effectiveCooldown,
    mods: resolvedMods,
  };
}
