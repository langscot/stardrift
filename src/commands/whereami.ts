import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";

import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import { db } from "../db/index.js";
import { systems, planets, asteroidBelts } from "../db/schema.js";
import { getTravelState } from "../redis/travel.js";

export const whereamiCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("whereami")
    .setDescription("Show your current location"),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = await ensurePlayer(interaction);

    // In transit
    const travelState = await getTravelState(player.userId);
    if (travelState || !player.currentSystemId) {
      let msg = "🚀 You are currently **in transit**.";
      if (travelState) {
        const remaining = Math.max(
          0,
          Math.ceil((travelState.arrivesAt - Date.now()) / 1000)
        );
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        msg += ` ETA: **${minutes}m ${seconds}s**`;
      }
      await interaction.reply({ content: msg, flags: 64 });
      return;
    }

    // Look up system
    const system = await db.query.systems.findFirst({
      where: eq(systems.id, player.currentSystemId),
    });
    const systemName = system?.name ?? "Unknown System";

    // Build sub-location line
    let subLocation = "";
    if (player.currentLocationType && player.currentLocationId) {
      if (player.currentLocationType === "planet") {
        const planet = await db.query.planets.findFirst({
          where: eq(planets.id, player.currentLocationId),
        });
        if (planet) subLocation = `\n🪐 Orbiting **${planet.name}**`;
      } else if (player.currentLocationType === "asteroid_belt") {
        const belt = await db.query.asteroidBelts.findFirst({
          where: eq(asteroidBelts.id, player.currentLocationId),
        });
        if (belt) subLocation = `\n☄️ In **${belt.name}**`;
      } else {
        subLocation = `\n📌 At **${player.currentLocationType}** #${player.currentLocationId}`;
      }
    }

    await interaction.reply({
      content: `📍 **${systemName}**${subLocation}`,
      flags: 64,
    });
  },
};
