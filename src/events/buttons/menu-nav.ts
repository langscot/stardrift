import { ButtonInteraction, MessageFlags } from "discord.js";
import { db } from "../../db/index.js";
import { players, systemChannels, itemTypes, playerShips, shipTypes } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getCargoItems, getStationItems, getCargoCount } from "../../db/queries/inventory.js";
import { getSystemById, getEnrolledSystems } from "../../db/queries/systems.js";
import { getTravelState } from "../../redis/travel.js";
import { calculateTravel } from "../../systems/travel.js";
import { executeMining } from "../../systems/mining-action.js";
import { resolvePlayerModifiers, type ModifierSource } from "../../systems/modifiers.js";
import { buildLoadoutData } from "../../commands/loadout.js";
import { loadoutDisplay } from "../../ui/loadout.js";
import {
  mainMenuDisplay,
  menuCargoDisplay,
  menuMapDisplay,
  menuStatsDisplay,
  type ShipStatsInfo,
} from "../../ui/menu.js";
import {
  miningResultDisplay,
  miningCooldownDisplay,
  cargoFullDisplay,
  pickMiningFlavor,
} from "../../ui/mining.js";

/**
 * Handles all menu-related button interactions:
 *   menu_open   — open main menu (ephemeral reply)
 *   menu_home   — navigate back to main menu (update)
 *   menu_cargo  — show cargo sub-screen (update)
 *   menu_map    — show map sub-screen (update)
 *   menu_stats  — show stats sub-screen (update)
 *   menu_mine   — trigger mining from menu (update)
 */
export async function handleMenuNav(
  interaction: ButtonInteraction,
  action: string
): Promise<void> {
  const player = await db.query.players.findFirst({
    where: eq(players.userId, interaction.user.id),
  });

  if (!player) {
    const msg = { content: "Player not found. Use any slash command to register.", flags: 64 };
    if (action === "menu_open") {
      await interaction.reply(msg);
    } else {
      await interaction.update({ components: [] });
    }
    return;
  }

  switch (action) {
    case "menu_open": {
      // Sends a NEW ephemeral reply (so it doesn't replace the mining result)
      const ctx = await buildMenuContext(player, interaction.channelId);
      ctx.username = interaction.user.displayName;
      await interaction.reply({
        components: mainMenuDisplay(ctx),
        flags: MessageFlags.IsComponentsV2,
      });
      break;
    }

    case "menu_home": {
      const ctx = await buildMenuContext(player, interaction.channelId);
      ctx.username = interaction.user.displayName;
      await interaction.update({
        components: mainMenuDisplay(ctx),
      });
      break;
    }

    case "menu_cargo": {
      const allItemTypes = await db.query.itemTypes.findMany();
      const itemTypeMap = new Map(allItemTypes.map((it) => [it.key, it]));

      const cargoRaw = await getCargoItems(player.userId);
      const cargoItems = cargoRaw.map((i) => ({
        displayName: itemTypeMap.get(i.itemType)?.displayName ?? i.itemType,
        quantity: i.quantity,
      }));

      const systemName = player.currentSystemId
        ? (await getSystemById(player.currentSystemId))?.name ?? "Unknown"
        : "None";

      const stationItems = player.currentSystemId
        ? (await getStationItems(player.userId, player.currentSystemId)).map((i) => ({
            displayName: itemTypeMap.get(i.itemType)?.displayName ?? i.itemType,
            quantity: i.quantity,
          }))
        : [];

      const cargoUsed = await getCargoCount(player.userId);

      await interaction.update({
        components: menuCargoDisplay(
          cargoItems,
          stationItems,
          cargoUsed,
          player.cargoCapacity,
          systemName
        ),
      });
      break;
    }

    case "menu_map": {
      if (!player.currentSystemId) {
        await interaction.update({
          components: menuMapDisplay("In Transit", []),
        });
        break;
      }

      const currentSystem = await getSystemById(player.currentSystemId);
      if (!currentSystem) break;

      const allSystems = await getEnrolledSystems();
      const nearby = allSystems
        .map((sys) => {
          const travel = calculateTravel(currentSystem.x, currentSystem.y, sys.x, sys.y);
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
        .filter((s) => s.distance <= 50)
        .sort((a, b) => a.distance - b.distance);

      await interaction.update({
        components: menuMapDisplay(currentSystem.name, nearby),
      });
      break;
    }

    case "menu_stats": {
      const systemName = player.currentSystemId
        ? (await getSystemById(player.currentSystemId))?.name ?? "Unknown"
        : "In Transit";
      const system = player.currentSystemId
        ? await getSystemById(player.currentSystemId)
        : null;
      const cargoUsed = await getCargoCount(player.userId);

      // Build ship stats for display
      const shipStats = await getShipStatsInfo(player.userId);
      const mods = await resolvePlayerModifiers(player.userId, { isProxy: false });

      await interaction.update({
        components: menuStatsDisplay(
          interaction.user.displayName,
          player.credits,
          player.fuel,
          player.fuelCapacity,
          cargoUsed,
          player.cargoCapacity,
          systemName,
          system?.starType ?? "yellow_dwarf",
          system?.resourceRating ?? 5,
          shipStats
            ? {
                shipName: shipStats.displayName,
                moduleSlots: shipStats.moduleSlots,
                yieldMultiplier: mods.yieldMultiplier,
                cooldownMultiplier: mods.cooldownMultiplier,
                rareEventChance: mods.rareEventChance,
                cargoBonus: mods.cargoBonus,
              }
            : undefined
        ),
      });
      break;
    }

    case "menu_loadout": {
      const data = await buildLoadoutData(player.userId, player.cargoCapacity);
      await interaction.update({
        components: loadoutDisplay(data),
      });
      break;
    }

    case "menu_mine": {
      // Trigger mining directly from the menu
      const result = await executeMining(
        interaction.user.id,
        interaction.channelId,
        player.cargoCapacity,
        player.currentSystemId
      );

      if (result.type === "cooldown") {
        await interaction.update({ components: [miningCooldownDisplay(result.remainingSeconds)] });
      } else if (result.type === "cargo_full") {
        await interaction.update({ components: [cargoFullDisplay()] });
      } else if (result.type === "error") {
        await interaction.update({
          components: [
            miningResultDisplay({ items: [{ itemDisplayName: result.message, quantity: 0 }], cargoUsed: 0, cargoCapacity: player.cargoCapacity, showButtons: false }),
          ],
        });
      } else {
        const cooldownExpiresAt = Math.floor(Date.now() / 1000) + result.effectiveCooldown;
        await interaction.update({
          components: [
            miningResultDisplay({
              items: result.items,
              cargoUsed: result.cargoUsed,
              cargoCapacity: result.cargoCapacity,
              isProxy: result.isProxy,
              showButtons: true,
              ownerUserId: interaction.user.id,
              channelType: result.channelType,
              referenceId: result.referenceId,
              flavorText: pickMiningFlavor(interaction.user.id),
              cooldownExpiresAt,
              rareEvent: result.rareEvent,
              mods: result.mods,
              effectiveCooldown: result.effectiveCooldown,
            }),
          ],
        });
      }
      break;
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getShipStatsInfo(userId: string) {
  const ship = await db.query.playerShips.findFirst({
    where: eq(playerShips.playerId, userId),
  });
  if (!ship) return null;
  const shipType = await db.query.shipTypes.findFirst({
    where: eq(shipTypes.key, ship.shipKey),
  });
  return shipType ?? null;
}

async function buildMenuContext(
  player: { userId: string; credits: bigint | number; fuel: number; fuelCapacity: number; cargoCapacity: number; currentSystemId: number | null },
  channelId: string
) {
  const travelState = await getTravelState(player.userId);
  const isTransit = !!travelState;

  const systemName = player.currentSystemId && !isTransit
    ? (await getSystemById(player.currentSystemId))?.name ?? "Unknown"
    : "In Transit";

  const cargoUsed = await getCargoCount(player.userId);

  // Check current channel type for context-sensitive buttons
  const channel = await db.query.systemChannels.findFirst({
    where: eq(systemChannels.channelId, channelId),
  });
  const channelType = channel?.channelType ?? null;

  return {
    username: "", // filled by caller
    credits: player.credits,
    fuel: player.fuel,
    fuelCapacity: player.fuelCapacity,
    cargoUsed,
    cargoCapacity: player.cargoCapacity,
    systemName,
    isTransit,
    channelType,
  };
}
