import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";

interface InventoryItem {
  itemType: string;
  displayName: string;
  quantity: number;
}

interface InventoryDisplayData {
  cargoItems: InventoryItem[];
  stationItems: InventoryItem[];
  cargoCapacity: number;
  cargoUsed: number;
  credits: number;
  fuel: number;
  fuelCapacity: number;
  systemName: string;
}

export function inventoryDisplay(data: InventoryDisplayData): ContainerBuilder[] {
  const containers: ContainerBuilder[] = [];

  // Player stats container
  const statsContainer = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `\ud83d\udcca **Player Status**\n` +
        `\ud83d\udcb0 Credits: **${data.credits.toLocaleString()}**\n` +
        `\u26fd Fuel: **${data.fuel}/${data.fuelCapacity}**`
      )
    );
  containers.push(statsContainer);

  // Cargo container
  const cargoLines = data.cargoItems.length > 0
    ? data.cargoItems.map((i) => `\u2022 ${i.displayName}: **${i.quantity}**`).join("\n")
    : "*Empty*";

  const cargoContainer = new ContainerBuilder()
    .setAccentColor(0xf0a030)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `\ud83d\udce6 **Ship Cargo** (${data.cargoUsed}/${data.cargoCapacity})\n${cargoLines}`
      )
    );
  containers.push(cargoContainer);

  // Station storage container
  const stationLines = data.stationItems.length > 0
    ? data.stationItems.map((i) => `\u2022 ${i.displayName}: **${i.quantity}**`).join("\n")
    : "*Empty*";

  const stationContainer = new ContainerBuilder()
    .setAccentColor(0x808080)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `\ud83c\udfed **Station Storage** (${data.systemName})\n${stationLines}`
      )
    );
  containers.push(stationContainer);

  return containers;
}
