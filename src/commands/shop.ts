import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";

import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import {
  getPlayerShip,
  getShipCatalog,
  getModuleCatalog,
  getFittedModules,
  getModuleCount,
} from "../db/queries/equipment.js";
import { shopModulesDisplay } from "../ui/shop.js";
import type { ModifierSource } from "../systems/modifiers.js";

export const shopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Browse ships and modules for sale"),

  requiresLocation: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const player = await ensurePlayer(interaction);
    const ship = await getPlayerShip(player.userId);
    const fitted = await getFittedModules(player.userId);
    const modules = await getModuleCatalog();

    // Build ownership counts
    const modulesWithCounts = await Promise.all(
      modules.map(async (mod) => {
        const totalOwned = await getModuleCount(player.userId, mod.key);
        const fittedCount = fitted.filter(f => f.moduleKey === mod.key).length;
        return {
          key: mod.key,
          displayName: mod.displayName,
          description: mod.description,
          category: mod.category,
          tier: mod.tier,
          price: mod.price,
          modifiers: mod.modifiers as ModifierSource,
          emoji: mod.emoji,
          ownedCount: totalOwned,
          fittedCount,
        };
      })
    );

    const ctx = {
      credits: Number(player.credits),
      currentShipName: ship?.displayName ?? "Starter Ship",
      currentShipSlots: ship?.moduleSlots ?? 3,
      freeSlots: (ship?.moduleSlots ?? 3) - fitted.length,
    };

    await interaction.reply({
      components: shopModulesDisplay(ctx, modulesWithCounts),
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
