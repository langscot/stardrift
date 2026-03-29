import { redis } from "./index.js";

export interface TravelState {
  toSystemId: number;
  arrivesAt: number; // Unix timestamp ms
}

/**
 * Check if a player is currently traveling.
 */
export async function getTravelState(
  userId: string
): Promise<TravelState | null> {
  const data = await redis.get(`travel:${userId}`);
  if (!data) return null;
  const [toSystemId, arrivesAt] = data.split(":");
  return {
    toSystemId: parseInt(toSystemId, 10),
    arrivesAt: parseInt(arrivesAt, 10),
  };
}

/**
 * Set a player as traveling. TTL = travel duration so key auto-expires on arrival.
 */
export async function setTravelState(
  userId: string,
  toSystemId: number,
  arrivesAt: Date
): Promise<void> {
  const ttlSeconds = Math.max(
    1,
    Math.ceil((arrivesAt.getTime() - Date.now()) / 1000)
  );
  await redis.set(
    `travel:${userId}`,
    `${toSystemId}:${arrivesAt.getTime()}`,
    "EX",
    ttlSeconds
  );
}

/**
 * Clear travel state (on arrival processing).
 */
export async function clearTravelState(userId: string): Promise<void> {
  await redis.del(`travel:${userId}`);
}
