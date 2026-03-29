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

export type MiningActionResult =
  | {
      type: "success";
      itemDisplayName: string;
      quantity: number;
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

  // Roll mining result
  let result;
  if (channel.channelType === "planet" && channel.referenceId) {
    const planet = await db.query.planets.findFirst({
      where: eq(planets.id, channel.referenceId),
    });
    if (!planet) return { type: "error", message: "Planet not found." };
    result = rollPlanetMining(planet.planetType);
  } else if (channel.channelType === "asteroid_belt" && channel.referenceId) {
    const belt = await db.query.asteroidBelts.findFirst({
      where: eq(asteroidBelts.id, channel.referenceId),
    });
    if (!belt) return { type: "error", message: "Belt not found." };
    result = rollBeltMining(belt.richness);
  } else {
    return { type: "error", message: "Nothing to mine here." };
  }

  // Proxy debuff
  const proxy = channel.guildId
    ? await isProxyInGuild(channel.guildId, channel.systemId)
    : false;
  if (proxy) {
    result.quantity = Math.max(1, Math.floor(result.quantity * PROXY_MINING_MULTIPLIER));
  }

  // Clamp to cargo space
  const remainingSpace = cargoCapacity - cargoUsed;
  result.quantity = Math.min(result.quantity, remainingSpace);

  // Save to cargo
  await addToCargo(userId, result.itemType, result.quantity);

  // Set cooldown
  await setCooldown(userId, "mine", config.MINING_COOLDOWN_SECONDS);

  // Get display name
  const item = await db.query.itemTypes.findFirst({
    where: eq(itemTypes.key, result.itemType),
  });

  return {
    type: "success",
    itemDisplayName: item?.displayName ?? result.itemType,
    quantity: result.quantity,
    cargoUsed: cargoUsed + result.quantity,
    cargoCapacity,
    isProxy: proxy,
    channelType: channel.channelType,
    referenceId: channel.referenceId,
    systemId: channel.systemId,
  };
}
