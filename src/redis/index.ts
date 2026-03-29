import IORedis from "ioredis";
import { config } from "../config.js";

export const redis = new IORedis.default(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err: Error) => {
  console.error("Redis connection error:", err.message);
});
