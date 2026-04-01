import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";

import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import {
  getPlayerShip,
  getFittedModules,
  getModuleInventory,
} from "../db/queries/equipment.js";
import { resolvePlayerModifiers, type ModifierSource } from "../systems/modifiers.js";
import { loadoutDisplay } from "../ui/loadout.js";

export const loadoutCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("loadout")
    .setDescription("View and manage your ship modules"),

  requiresLocation: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const player = await ensurePlayer(interaction);
    const data = await buildLoadoutData(player.userId, player.cargoCapacity);

    await interaction.reply({
      components: loadoutDisplay(data),
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export async function buildLoadoutData(userId: string, baseCargoCapacity: number) {
  const ship = await getPlayerShip(userId);
  const fitted = await getFittedModules(userId);
  const inventory = await getModuleInventory(userId);
  const mods = await resolvePlayerModifiers(userId, { isProxy: false });

  return {
    shipName: ship?.displayName ?? "Starter Ship",
    shipEmoji: ship?.emoji ?? null,
    moduleSlots: ship?.moduleSlots ?? 3,
    mods,
    fittedModules: fitted.map((f) => ({
      slotIndex: f.slotIndex,
      moduleKey: f.moduleKey,
      displayName: f.displayName,
      emoji: f.emoji,
      modifiers: f.modifiers as ModifierSource,
    })),
    inventory: inventory
      .filter((inv) => inv.quantity > 0)
      .map((inv) => ({
        moduleKey: inv.moduleKey,
        displayName: inv.displayName,
        emoji: inv.emoji,
        quantity: inv.quantity,
        modifiers: inv.modifiers as ModifierSource,
      })),
    baseCargoCapacity,
  };
}
