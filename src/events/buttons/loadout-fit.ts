import { ButtonInteraction, StringSelectMenuInteraction, MessageFlags } from "discord.js";
import { db } from "../../db/index.js";
import { players } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import {
  getFittedModules,
  getModuleInventory,
  fitModule,
  unfitModule,
} from "../../db/queries/equipment.js";
import { buildLoadoutData } from "../../commands/loadout.js";
import { loadoutDisplay, loadoutFitSelectMenu } from "../../ui/loadout.js";
import type { ModifierSource } from "../../systems/modifiers.js";

/**
 * Handles loadout button interactions:
 *   loadout_unfit:{slotIndex}       — unfit a module from a slot
 *   loadout_fit_select:{slotIndex}  — show select menu to choose module
 */
export async function handleLoadoutButton(
  interaction: ButtonInteraction,
  action: string,
  args: string[]
): Promise<void> {
  const player = await db.query.players.findFirst({
    where: eq(players.userId, interaction.user.id),
  });
  if (!player) {
    await interaction.reply({ content: "Player not found.", flags: 64 });
    return;
  }

  const slotIndex = parseInt(args[0], 10);

  if (action === "loadout_unfit") {
    try {
      await unfitModule(player.userId, slotIndex);
    } catch (e: any) {
      await interaction.reply({ content: `❌ ${e.message}`, flags: 64 });
      return;
    }

    // Refresh loadout display
    const data = await buildLoadoutData(player.userId, player.cargoCapacity);
    await interaction.update({
      components: loadoutDisplay(data),
      flags: MessageFlags.IsComponentsV2 as number,
    });
  } else if (action === "loadout_fit_select") {
    // Show module select menu for this slot
    const inventory = await getModuleInventory(player.userId);
    const invDisplay = inventory
      .filter((inv) => inv.quantity > 0)
      .map((inv) => ({
        moduleKey: inv.moduleKey,
        displayName: inv.displayName,
        emoji: inv.emoji,
        quantity: inv.quantity,
        modifiers: inv.modifiers as ModifierSource,
      }));

    await interaction.update({
      components: loadoutFitSelectMenu(slotIndex, invDisplay),
      flags: MessageFlags.IsComponentsV2 as number,
    });
  }
}

/**
 * Handles the loadout_fit select menu interaction.
 * customId: loadout_fit:{slotIndex}
 * value: moduleKey
 */
export async function handleLoadoutSelect(
  interaction: StringSelectMenuInteraction,
  slotIndex: number
): Promise<void> {
  const player = await db.query.players.findFirst({
    where: eq(players.userId, interaction.user.id),
  });
  if (!player) {
    await interaction.reply({ content: "Player not found.", flags: 64 });
    return;
  }

  const moduleKey = interaction.values[0];

  try {
    await fitModule(player.userId, slotIndex, moduleKey);
  } catch (e: any) {
    await interaction.reply({ content: `❌ ${e.message}`, flags: 64 });
    return;
  }

  // Refresh loadout display
  const data = await buildLoadoutData(player.userId, player.cargoCapacity);
  await interaction.update({
    components: loadoutDisplay(data),
  });
}
