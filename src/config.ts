import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  // Discord
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_DEV_GUILD_ID: z.string().optional(),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Game tuning
  MINING_COOLDOWN_SECONDS: z.coerce.number().default(30),
  FUEL_PER_LY: z.coerce.number().default(1),
  SECONDS_PER_LY: z.coerce.number().default(60),
  TRAVEL_CHECK_INTERVAL_MS: z.coerce.number().default(30_000),
  PRICE_DECAY_RATE: z.coerce.number().default(0.95),

  // AI Q&A (optional — feature disabled if API key not set)
  AI_GATEWAY_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("google/gemini-2.0-flash-lite"),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof envSchema>;
