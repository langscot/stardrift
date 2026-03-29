import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { priceIndicator } from "../systems/economy.js";
import type { PriceInfo } from "../systems/economy.js";

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
          .setLabel(`💰 Sell Everything (~${totalValue.toLocaleString()} cr)`)
          .setStyle(ButtonStyle.Success)
      )
    );
  }

  containers.push(header);

  // Show prices for items the player has
  for (const item of data.playerItems) {
    const price = data.prices.find((p) => p.itemType === item.itemType);
    if (!price) continue;

    const indicator = priceIndicator(price.ratio);
    const percentOfBase = Math.round(price.ratio * 100);
    const totalValue = price.currentPrice * item.quantity;

    const itemContainer = new ContainerBuilder()
      .setAccentColor(price.ratio >= 0.7 ? 0x00aa55 : price.ratio >= 0.4 ? 0xf0a030 : 0xcc3333)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${indicator} **${price.displayName}**\n` +
          `Price: **${price.currentPrice}** cr/unit (${percentOfBase}% of base)\n` +
          `You have: **${item.quantity}** \u2014 Total value: **${totalValue.toLocaleString()}** cr`
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

  return containers;
}
