import { redis } from "./index.js";

/**
 * Check if a cooldown is active. Returns remaining seconds or 0 if ready.
 */
export async function checkCooldown(
  userId: string,
  action: string
): Promise<{ ready: boolean; remainingSeconds: number }> {
  const key = `cd:${action}:${userId}`;
  const ttl = await redis.ttl(key);
  if (ttl > 0) {
    return { ready: false, remainingSeconds: ttl };
  }
  return { ready: true, remainingSeconds: 0 };
}

/**
 * Set a cooldown. Uses NX so it won't overwrite an existing cooldown.
 */
export async function setCooldown(
  userId: string,
  action: string,
  seconds: number
): Promise<void> {
  const key = `cd:${action}:${userId}`;
  await redis.set(key, "1", "EX", seconds, "NX");
}

/**
 * Fixed-window rate limit: allows `limit` requests per `windowSeconds`.
 * Uses Redis INCR with TTL. Key format: rl:{action}:{userId}
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const key = `rl:${action}:${userId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  if (count > limit) {
    const ttl = await redis.ttl(key);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(ttl, 1) };
  }

  return { allowed: true, remaining: limit - count, retryAfterSeconds: 0 };
}
