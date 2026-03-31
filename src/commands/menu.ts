import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import { getCargoCount } from "../db/queries/inventory.js";
import { getSystemById } from "../db/queries/systems.js";
import { getTravelState } from "../redis/travel.js";
import { db } from "../db/index.js";
import { systemChannels } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { mainMenuDisplay } from "../ui/menu.js";

export const menuCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("menu")
    .setDescription("Open your Stardrift dashboard"),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = await ensurePlayer(interaction);

    const travelState = await getTravelState(player.userId);
    const isTransit = !!travelState;

    const systemName = player.currentSystemId && !isTransit
      ? (await getSystemById(player.currentSystemId))?.name ?? "Unknown"
      : "In Transit";

    const cargoUsed = await getCargoCount(player.userId);

    // Check current channel type for context-sensitive buttons
    const channel = await db.query.systemChannels.findFirst({
      where: eq(systemChannels.channelId, interaction.channelId),
    });

    await interaction.reply({
      components: mainMenuDisplay({
        username: interaction.user.displayName,
        credits: player.credits,
        fuel: player.fuel,
        fuelCapacity: player.fuelCapacity,
        cargoUsed,
        cargoCapacity: player.cargoCapacity,
        systemName,
        isTransit,
        channelType: channel?.channelType ?? null,
      }),
      flags: MessageFlags.IsComponentsV2 as number,
    });
  },
};
