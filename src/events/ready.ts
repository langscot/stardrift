import { Client } from "discord.js";
import { config } from "../config.js";

export function handleReady(client: Client<true>): void {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guilds`);

  // Start travel arrival polling loop
  startTravelPolling();
}

function startTravelPolling(): void {
  setInterval(async () => {
    try {
      // Import here to avoid circular deps
      const { processArrivals } = await import("../db/queries/travel.js");
      await processArrivals();
    } catch (error) {
      console.error("Travel polling error:", error);
    }
  }, config.TRAVEL_CHECK_INTERVAL_MS);
}
