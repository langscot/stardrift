import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import { eq } from "drizzle-orm";
import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import { db } from "../db/index.js";
import { systems, planets, asteroidBelts, systemChannels } from "../db/schema.js";
import {
  buildFullReport,
  buildPlanetReport,
  buildBeltReport,
  overviewButton,
  bodySelectMenu,
} from "../ui/prospect.js";

export const prospectCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("prospect")
    .setDescription("Survey the resources of your current star system (only visible to you)"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const player = await ensurePlayer(interaction);

    if (!player.currentSystemId) {
      await interaction.editReply("⚠️ You are not currently in any star system.");
      return;
    }

    // Check if we're inside a specific planet/belt channel
    const channel = await db.query.systemChannels.findFirst({
      where: eq(systemChannels.channelId, interaction.channelId),
    });

    const system = await db.query.systems.findFirst({
      where: eq(systems.id, player.currentSystemId),
    });

    if (!system) {
      await interaction.editReply("⚠️ Could not locate your current system.");
      return;
    }

    const sysPlanets = await db
      .select()
      .from(planets)
      .where(eq(planets.systemId, system.id))
      .orderBy(planets.slot);

    const sysBelts = await db
      .select()
      .from(asteroidBelts)
      .where(eq(asteroidBelts.systemId, system.id));

    // In a specific planet channel — show just that planet + nav
    if (channel?.channelType === "planet" && channel.referenceId) {
      const planet = sysPlanets.find(p => p.id === channel.referenceId);
      if (planet) {
        await interaction.editReply({
          content: buildPlanetReport(planet, system.name),
          components: [
            overviewButton(system.id),
            bodySelectMenu(system.id, sysPlanets, sysBelts),
          ],
        });
        return;
      }
    }

    // In a specific asteroid belt channel — show just that belt + nav
    if (channel?.channelType === "asteroid_belt" && channel.referenceId) {
      const belt = sysBelts.find(b => b.id === channel.referenceId);
      if (belt) {
        await interaction.editReply({
          content: buildBeltReport(belt, system.name),
          components: [
            overviewButton(system.id),
            bodySelectMenu(system.id, sysPlanets, sysBelts),
          ],
        });
        return;
      }
    }

    // Default — full system report (no buttons needed)
    await interaction.editReply({
      content: buildFullReport(system, sysPlanets, sysBelts),
    });
  },
};
