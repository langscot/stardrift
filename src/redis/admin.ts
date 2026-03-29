import { redis } from "./index.js";

const ELEVATED_SESSION_TTL_SECONDS = 15 * 60; // 15 minutes

// ── Elevated sessions (sudo) ──────────────────────────────────────────────────

export async function createElevatedSession(userId: string): Promise<void> {
  await redis.set(
    `admin_session:${userId}`,
    "1",
    "EX",
    ELEVATED_SESSION_TTL_SECONDS
  );
}

export async function hasElevatedSession(userId: string): Promise<boolean> {
  return (await redis.get(`admin_session:${userId}`)) === "1";
}

export async function getElevatedSessionTTL(userId: string): Promise<number> {
  return redis.ttl(`admin_session:${userId}`);
}

// ── Bans (fast lookup) ────────────────────────────────────────────────────────

export async function setBanCache(userId: string, reason: string): Promise<void> {
  await redis.set(`ban:${userId}`, reason);
}

export async function clearBanCache(userId: string): Promise<void> {
  await redis.del(`ban:${userId}`);
}

/** Returns the ban reason, or null if not banned. */
export async function getBanReason(userId: string): Promise<string | null> {
  return redis.get(`ban:${userId}`);
}
