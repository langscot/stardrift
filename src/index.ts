import { config } from "./config.js";
import { redis } from "./redis/index.js";
import { pool } from "./db/index.js";
import { startBot } from "./bot.js";

async function main() {
  console.log("Starting Stellar Drift...");

  // Connect Redis
  await redis.connect();
  console.log("Redis connected");

  // Test DB connection
  const pgClient = await pool.connect();
  pgClient.release();
  console.log("PostgreSQL connected");

  // Start the bot
  await startBot();
  console.log("Bot is online!");
}

main().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await redis.quit();
  await pool.end();
  process.exit(0);
});
