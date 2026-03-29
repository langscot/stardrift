import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import { getEnrolledSystems, getSystemById } from "../db/queries/systems.js";
import { calculateTravel } from "../systems/travel.js";
import { starMapDisplay } from "../ui/map.js";

export const mapCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("map")
    .setDescription("View the star map of known systems")
    .addIntegerOption((opt) =>
      opt
        .setName("range")
        .setDescription("Maximum range in LY (default: 50)")
        .setRequired(false)
        .setMinValue(10)
        .setMaxValue(500)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = await ensurePlayer(interaction);
    const range = interaction.options.getInteger("range") ?? 50;

    if (!player.currentSystemId) {
      await interaction.reply({
        content:
          "You are currently in transit. Wait until you arrive to view the map.",
        flags: 64,
      });
      return;
    }

    const currentSystem = await getSystemById(player.currentSystemId);
    if (!currentSystem) {
      await interaction.reply({
        content: "Could not find your current system.",
        flags: 64,
      });
      return;
    }

    // Get all enrolled systems
    const allSystems = await getEnrolledSystems();

    // Calculate distances and filter by range
    const nearbySystems = allSystems
      .map((sys) => {
        const travel = calculateTravel(
          currentSystem.x,
          currentSystem.y,
          sys.x,
          sys.y
        );
        return {
          id: sys.id,
          name: sys.name,
          starType: sys.starType,
          distance: travel.distance,
          resourceRating: sys.resourceRating,
          isHub: sys.isHub,
          isCurrent: sys.id === currentSystem.id,
        };
      })
      .filter((sys) => sys.distance <= range)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 15); // Limit to 15 to avoid hitting component limits

    const containers = starMapDisplay(currentSystem.name, nearbySystems);

    await interaction.reply({
      components: containers,
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
