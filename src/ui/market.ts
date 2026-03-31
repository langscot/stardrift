import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { priceIndicator } from "../systems/economy.js";
import type { PriceInfo } from "../systems/economy.js";
import { ITEM_EMOJI } from "../systems/mining-action.js";

const SELL_FLAVORS: ((user: string) => string)[] = [
  (u) => `${u} offloaded the cargo at the exchange...`,
  (u) => `${u} struck a deal with the station broker.`,
  (u) => `${u} dumped the haul on the market floor.`,
  (u) => `${u} traded ore for credits at the dock.`,
  (u) => `${u} cleared the hold and pocketed the coin.`,
  (u) => `${u} haggled with the NPC buyer and walked away richer.`,
  (u) => `${u} slid the manifest across the counter...`,
  (u) => `${u} watched the credits tick up on the terminal.`,
  (u) => `${u} unloaded everything before the prices shifted.`,
  (u) => `${u} sold the lot and headed back to the belt.`,
];

export function pickSellFlavor(userId?: string): string {
  const userTag = userId ? `<@${userId}>` : "You";
  return SELL_FLAVORS[Math.floor(Math.random() * SELL_FLAVORS.length)](userTag);
}

interface SellDisplayData {
  prices: PriceInfo[];
  playerItems: Array<{ itemType: string; quantity: number }>;
}

export function sellMenuDisplay(data: SellDisplayData): ContainerBuilder[] {
  const containers: ContainerBuilder[] = [];

  const header = new ContainerBuilder()
    .setAccentColor(0x00cc66)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `🏪 **Station Market** — NPC Buyer\nPrices fluctuate based on local supply.`
      )
    );

  // Show "Sell Everything" button only when the player has cargo
  if (data.playerItems.length > 0) {
    const totalValue = data.playerItems.reduce((sum, item) => {
      const price = data.prices.find((p) => p.itemType === item.itemType);
      return sum + (price?.currentPrice ?? 0) * item.quantity;
    }, 0);

    header.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("sell_all")
          .setLabel(`💰 Sell Everything (~${totalValue.toLocaleString()}¢)`)
          .setStyle(ButtonStyle.Success)
      )
    );
  }

  containers.push(header);

  // Show prices for items the player has, most valuable first
  const sortedItems = [...data.playerItems].sort((a, b) => {
    const aPrice = data.prices.find((p) => p.itemType === a.itemType);
    const bPrice = data.prices.find((p) => p.itemType === b.itemType);
    return ((bPrice?.currentPrice ?? 0) * b.quantity) - ((aPrice?.currentPrice ?? 0) * a.quantity);
  });
  for (const item of sortedItems) {
    const price = data.prices.find((p) => p.itemType === item.itemType);
    if (!price) continue;

    const indicator = priceIndicator(price.ratio);
    const percentOfBase = Math.round(price.ratio * 100);
    const totalValue = price.currentPrice * item.quantity;
    const emoji = ITEM_EMOJI[item.itemType] ?? "✦";

    const itemContainer = new ContainerBuilder()
      .setAccentColor(price.ratio >= 0.7 ? 0x00aa55 : price.ratio >= 0.4 ? 0xf0a030 : 0xcc3333)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji} ${indicator} **${price.displayName}**\n` +
          `Price: **${price.currentPrice}¢**/unit (${percentOfBase}% of base)\n` +
          `You have: **${item.quantity}** — Total value: **${totalValue.toLocaleString()}¢**`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`sell_confirm:${item.itemType}:${item.quantity}`)
            .setLabel(`Sell All (${item.quantity})`)
            .setStyle(ButtonStyle.Success),
          // Only show "Sell 1" if player has more than 1 (avoids duplicate custom_id)
          ...(item.quantity > 1
            ? [
                new ButtonBuilder()
                  .setCustomId(`sell_confirm:${item.itemType}:1`)
                  .setLabel("Sell 1")
                  .setStyle(ButtonStyle.Secondary),
              ]
            : []),
          // Only show "Sell 10" if player has more than 10
          ...(item.quantity > 10
            ? [
                new ButtonBuilder()
                  .setCustomId(`sell_confirm:${item.itemType}:10`)
                  .setLabel("Sell 10")
                  .setStyle(ButtonStyle.Secondary),
              ]
            : [])
        )
      );
    containers.push(itemContainer);
  }

  if (data.playerItems.length === 0) {
    containers.push(
      new ContainerBuilder()
        .setAccentColor(0x808080)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "You have nothing to sell. Go mine some ore!"
          )
        )
    );
  }

  // Navigation footer
  const footer = new ContainerBuilder()
    .setAccentColor(0x2b2d31)
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("menu_mine")
          .setLabel("⚡ Mine")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("menu_open")
          .setLabel("🏠 Menu")
          .setStyle(ButtonStyle.Secondary)
      )
    );
  containers.push(footer);

  return containers;
}
