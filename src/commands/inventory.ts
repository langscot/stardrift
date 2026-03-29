import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import { getCargoItems, getStationItems, getCargoCount } from "../db/queries/inventory.js";
import { getSystemById } from "../db/queries/systems.js";
import { db } from "../db/index.js";
import { itemTypes } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { inventoryDisplay } from "../ui/inventory.js";

export const inventoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your cargo and station storage"),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = await ensurePlayer(interaction);

    // Get all item types for display names
    const allItemTypes = await db.query.itemTypes.findMany();
    const itemTypeMap = new Map(allItemTypes.map((it) => [it.key, it]));

    // Get cargo items
    const cargoRaw = await getCargoItems(player.userId);
    const cargoItems = cargoRaw.map((item) => ({
      itemType: item.itemType,
      displayName: itemTypeMap.get(item.itemType)?.displayName ?? item.itemType,
      quantity: item.quantity,
    }));

    // Get station items (only if player is docked somewhere)
    let stationItems: Array<{ itemType: string; displayName: string; quantity: number }> = [];
    let systemName = "None";
    if (player.currentSystemId) {
      const system = await getSystemById(player.currentSystemId);
      systemName = system?.name ?? "Unknown";
      const stationRaw = await getStationItems(
        player.userId,
        player.currentSystemId
      );
      stationItems = stationRaw.map((item) => ({
        itemType: item.itemType,
        displayName:
          itemTypeMap.get(item.itemType)?.displayName ?? item.itemType,
        quantity: item.quantity,
      }));
    }

    const cargoUsed = await getCargoCount(player.userId);

    const containers = inventoryDisplay({
      cargoItems,
      stationItems,
      cargoCapacity: player.cargoCapacity,
      cargoUsed,
      credits: player.credits,
      fuel: player.fuel,
      fuelCapacity: player.fuelCapacity,
      systemName,
    });

    await interaction.reply({
      components: containers,
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
