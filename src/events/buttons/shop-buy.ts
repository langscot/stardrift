import { ButtonInteraction, StringSelectMenuInteraction, MessageFlags } from "discord.js";
import { db } from "../../db/index.js";
import { players, shipTypes } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import {
  getPlayerShip,
  getShipCatalog,
  getModuleCatalog,
  getFittedModules,
  getModuleCount,
  buyShip,
  buyModule,
} from "../../db/queries/equipment.js";
import {
  shopShipsDisplay,
  shopModulesDisplay,
  shipBuyConfirmDisplay,
  buySuccessDisplay,
} from "../../ui/shop.js";
import type { ModifierSource } from "../../systems/modifiers.js";

const V2 = MessageFlags.IsComponentsV2 as number;

/**
 * Handles all shop button interactions:
 *   shop_tab:{tab}            — switch between ships/modules tabs
 *   shop_filter:{category}    — filter modules by category
 *   shop_confirm_ship:{key}   — confirm ship purchase
 */
export async function handleShopButton(
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

  const ship = await getPlayerShip(player.userId);
  const fitted = await getFittedModules(player.userId);

  const ctx = {
    credits: Number(player.credits),
    currentShipName: ship?.displayName ?? "Starter Ship",
    currentShipSlots: ship?.moduleSlots ?? 3,
    freeSlots: (ship?.moduleSlots ?? 3) - fitted.length,
  };

  switch (action) {
    case "shop_tab": {
      const tab = args[0];
      if (tab === "ships") {
        const ships = await getShipCatalog();
        const shipsDisplay = ships.map((s) => ({
          key: s.key,
          displayName: s.displayName,
          description: s.description,
          tier: s.tier,
          price: s.price,
          moduleSlots: s.moduleSlots,
          modifiers: s.modifiers as ModifierSource,
          emoji: s.emoji,
        }));
        await interaction.update({
          components: shopShipsDisplay(ctx, shipsDisplay),
          flags: V2,
        });
      } else {
        const modules = await buildModuleDisplayList(player.userId, fitted);
        await interaction.update({
          components: shopModulesDisplay(ctx, modules),
          flags: V2,
        });
      }
      break;
    }

    case "shop_filter": {
      const category = args[0];
      const modules = await buildModuleDisplayList(player.userId, fitted);
      await interaction.update({
        components: shopModulesDisplay(ctx, modules, category === "all" ? undefined : category),
        flags: V2,
      });
      break;
    }

    case "shop_confirm_ship": {
      const shipKey = args[0];
      try {
        const newShip = await buyShip(player.userId, shipKey);
        await interaction.update({
          components: buySuccessDisplay(newShip.displayName, "ship"),
          flags: V2,
        });
      } catch (e: any) {
        await interaction.reply({
          content: e.message === "Not enough credits"
            ? "❌ Not enough credits!"
            : `❌ ${e.message}`,
          flags: 64,
        });
      }
      break;
    }
  }
}

/**
 * Handles shop select menu interactions for buying ships/modules.
 */
export async function handleShopSelect(
  interaction: StringSelectMenuInteraction,
  action: string
): Promise<void> {
  const player = await db.query.players.findFirst({
    where: eq(players.userId, interaction.user.id),
  });
  if (!player) {
    await interaction.reply({ content: "Player not found.", flags: 64 });
    return;
  }

  const selectedKey = interaction.values[0];
  const fitted = await getFittedModules(player.userId);
  const ship = await getPlayerShip(player.userId);

  if (action === "shop_buy_ship_select") {
    // Show confirmation for ship purchase
    const targetShip = await db.query.shipTypes.findFirst({
      where: eq(shipTypes.key, selectedKey),
    });
    if (!targetShip) {
      await interaction.reply({ content: "Ship not found.", flags: 64 });
      return;
    }
    await interaction.update({
      components: shipBuyConfirmDisplay(
        targetShip.displayName,
        targetShip.price,
        ship?.displayName ?? "Starter Ship",
        fitted.length,
        selectedKey
      ),
      flags: V2,
    });
  } else if (action === "shop_buy_module_select") {
    // Buy module directly
    try {
      const mod = await buyModule(player.userId, selectedKey);
      await interaction.update({
        components: buySuccessDisplay(mod.displayName, "module"),
        flags: V2,
      });
    } catch (e: any) {
      await interaction.reply({
        content: e.message === "Not enough credits"
          ? "❌ Not enough credits!"
          : `❌ ${e.message}`,
        flags: 64,
      });
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function buildModuleDisplayList(
  playerId: string,
  fitted: Awaited<ReturnType<typeof getFittedModules>>
) {
  const modules = await getModuleCatalog();
  return Promise.all(
    modules.map(async (mod) => {
      const totalOwned = await getModuleCount(playerId, mod.key);
      const fittedCount = fitted.filter((f) => f.moduleKey === mod.key).length;
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
}
