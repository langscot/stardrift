import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { Command } from "./types.js";
import { checkLocation } from "../middleware/location-guard.js";
import { getEnrolledSystems, getSystemById } from "../db/queries/systems.js";
import { calculateTravel } from "../systems/travel.js";
import { starEmoji, formatStarType } from "../ui/common.js";

export const travelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("travel")
    .setDescription("Travel to another star system"),

  requiresLocation: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const loc = await checkLocation(interaction);
    if (!loc) return;

    // Get current system
    const currentSystem = await getSystemById(loc.systemId);
    if (!currentSystem) {
      await interaction.reply({
        content: "System not found.",
        flags: 64,
      });
      return;
    }

    // Get all enrolled systems
    const allSystems = await getEnrolledSystems();
    const otherSystems = allSystems.filter((s) => s.id !== loc.systemId);

    if (otherSystems.length === 0) {
      await interaction.reply({
        content:
          "No other systems are enrolled yet. You're alone in the galaxy... for now.",
        flags: 64,
      });
      return;
    }

    // Calculate travel info for each and sort by distance
    const destinations = otherSystems
      .map((sys) => {
        const travel = calculateTravel(
          currentSystem.x,
          currentSystem.y,
          sys.x,
          sys.y
        );
        return { system: sys, travel };
      })
      .sort((a, b) => a.travel.distance - b.travel.distance)
      .slice(0, 10); // Show closest 10

    const containers: ContainerBuilder[] = [];

    // Header
    containers.push(
      new ContainerBuilder()
        .setAccentColor(0x0066cc)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `\ud83d\ude80 **Travel** \u2014 ${currentSystem.name}\n` +
            `\u26fd Fuel: **${loc.player.fuel}/${loc.player.fuelCapacity}**`
          )
        )
    );

    // Destination entries
    for (const dest of destinations) {
      const emoji = starEmoji(dest.system.starType);
      const canAfford = loc.player.fuel >= dest.travel.fuelCost;

      const container = new ContainerBuilder()
        .setAccentColor(canAfford ? 0x334455 : 0x553333)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emoji} **${dest.system.name}**${dest.system.isHub ? " \ud83c\udfe0" : ""}\n` +
            `${formatStarType(dest.system.starType)} \u2022 ${dest.travel.distance.toFixed(1)} LY\n` +
            `\u26fd Fuel: ${dest.travel.fuelCost} \u2022 \u23f1\ufe0f ${dest.travel.travelTimeDisplay}` +
            (!canAfford ? "\n\u26a0\ufe0f Not enough fuel!" : "")
          )
        );

      if (canAfford) {
        container.addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`travel_confirm:${dest.system.id}`)
              .setLabel(`Depart (${dest.travel.travelTimeDisplay})`)
              .setStyle(ButtonStyle.Primary)
          )
        );
      }

      containers.push(container);
    }

    await interaction.reply({
      components: containers,
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
