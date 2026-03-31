import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import type { Command } from "./types.js";
import { checkLocation } from "../middleware/location-guard.js";
import { getCargoItems } from "../db/queries/inventory.js";
import { getAllItemTypes, getNpcPrice } from "../db/queries/market.js";
import { getPriceInfo } from "../systems/economy.js";
import { sellMenuDisplay } from "../ui/market.js";

export const sellCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("sell")
    .setDescription("View prices and sell items"),

  requiresLocation: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const loc = await checkLocation(interaction);
    if (!loc) return;

    // Get player's cargo
    const cargo = await getCargoItems(interaction.user.id);
    if (cargo.length === 0) {
      await interaction.reply({
        content: "Your cargo is empty. Go mine some ore first!",
        flags: 64,
      });
      return;
    }

    // Get all item types
    const allItemTypes = await getAllItemTypes();
    const itemTypeMap = new Map(allItemTypes.map((it) => [it.key, it]));

    // Build price info for each cargo item
    const prices = await Promise.all(
      cargo.map(async (item) => {
        const itemDef = itemTypeMap.get(item.itemType);
        return getPriceInfo(
          loc.systemId,
          item.itemType,
          itemDef?.displayName ?? item.itemType,
          itemDef?.basePrice ?? 10
        );
      })
    );

    const playerItems = cargo.map((item) => ({
      itemType: item.itemType,
      quantity: item.quantity,
    }));

    const containers = sellMenuDisplay({ prices, playerItems });

    await interaction.reply({
      components: containers,
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
