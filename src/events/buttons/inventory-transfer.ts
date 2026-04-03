import { ButtonInteraction, MessageFlags } from "discord.js";
import { db } from "../../db/index.js";
import { players, itemTypes } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import {
  getCargoItems,
  getStationItems,
  getCargoCount,
  storeFromCargo,
  loadToCargo,
} from "../../db/queries/inventory.js";
import { getSystemById } from "../../db/queries/systems.js";
import { inventoryDisplay } from "../../ui/inventory.js";
import { resolvePlayerModifiers } from "../../systems/modifiers.js";

/**
 * Store All: move all cargo items to station storage at current system.
 */
export async function handleStoreAll(
  interaction: ButtonInteraction
): Promise<void> {
  const player = await db.query.players.findFirst({
    where: eq(players.userId, interaction.user.id),
  });
  if (!player || !player.currentSystemId) {
    await interaction.reply({ content: "You must be docked to use station storage.", flags: 64 });
    return;
  }

  const cargo = await getCargoItems(player.userId);
  if (cargo.length === 0) {
    await interaction.reply({ content: "Cargo is already empty.", flags: 64 });
    return;
  }

  for (const item of cargo) {
    await storeFromCargo(player.userId, item.itemType, item.quantity, player.currentSystemId);
  }

  await refreshInventory(interaction, player.userId, player);
}

/**
 * Load All: move all station items to cargo (up to capacity).
 */
export async function handleLoadAll(
  interaction: ButtonInteraction
): Promise<void> {
  const player = await db.query.players.findFirst({
    where: eq(players.userId, interaction.user.id),
  });
  if (!player || !player.currentSystemId) {
    await interaction.reply({ content: "You must be docked to use station storage.", flags: 64 });
    return;
  }

  const mods = await resolvePlayerModifiers(player.userId, { isProxy: false });
  const effectiveCapacity = player.cargoCapacity + mods.cargoBonus;
  let cargoUsed = await getCargoCount(player.userId);
  const stationItems = await getStationItems(player.userId, player.currentSystemId);

  if (stationItems.length === 0) {
    await interaction.reply({ content: "Station storage is empty.", flags: 64 });
    return;
  }

  let loaded = 0;
  for (const item of stationItems) {
    const space = effectiveCapacity - cargoUsed;
    if (space <= 0) break;
    const qty = Math.min(item.quantity, space);
    const ok = await loadToCargo(player.userId, item.itemType, qty, player.currentSystemId);
    if (ok) {
      cargoUsed += qty;
      loaded += qty;
    }
  }

  if (loaded === 0) {
    await interaction.reply({ content: "Cargo is full — can't load anything.", flags: 64 });
    return;
  }

  await refreshInventory(interaction, player.userId, player);
}

async function refreshInventory(
  interaction: ButtonInteraction,
  userId: string,
  player: { currentSystemId: number | null; cargoCapacity: number; credits: number; fuel: number; fuelCapacity: number }
) {
  const allItemTypes = await db.query.itemTypes.findMany();
  const itemTypeMap = new Map(allItemTypes.map((it) => [it.key, it]));

  const cargoRaw = await getCargoItems(userId);
  const cargoItems = cargoRaw.map((item) => ({
    itemType: item.itemType,
    displayName: itemTypeMap.get(item.itemType)?.displayName ?? item.itemType,
    quantity: item.quantity,
  }));

  let stationItems: Array<{ itemType: string; displayName: string; quantity: number }> = [];
  let systemName = "None";
  if (player.currentSystemId) {
    const system = await getSystemById(player.currentSystemId);
    systemName = system?.name ?? "Unknown";
    const stationRaw = await getStationItems(userId, player.currentSystemId);
    stationItems = stationRaw.map((item) => ({
      itemType: item.itemType,
      displayName: itemTypeMap.get(item.itemType)?.displayName ?? item.itemType,
      quantity: item.quantity,
    }));
  }

  const cargoUsed = await getCargoCount(userId);

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

  await interaction.update({
    components: containers,
    flags: MessageFlags.IsComponentsV2 as number,
  });
}
