import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

interface MiningDisplayData {
  itemDisplayName: string;
  quantity: number;
  cargoUsed: number;
  cargoCapacity: number;
  isProxy?: boolean;
  /** Include Mine Again + Menu buttons */
  showButtons?: boolean;
  /** Used to construct the Mine Again button customId */
  channelType?: string;
  referenceId?: number | null;
}

export function miningResultDisplay(data: MiningDisplayData): ContainerBuilder {
  const cargoPercent = Math.round((data.cargoUsed / data.cargoCapacity) * 100);
  const proxyWarning = data.isProxy
    ? `\n\n📡 *Proxy system — yield reduced by 30%. Visit the system's home server for full rates.*`
    : "";

  const container = new ContainerBuilder()
    .setAccentColor(data.isProxy ? 0xffaa00 : 0x00cc66)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `⛏️ **Mining Complete!**\n` +
        `You mined **${data.quantity}x ${data.itemDisplayName}**\n\n` +
        `📦 Cargo: ${data.cargoUsed}/${data.cargoCapacity} (${cargoPercent}%)` +
        proxyWarning
      )
    );

  if (data.showButtons) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`mine_again:${data.channelType}:${data.referenceId ?? "0"}`)
        .setLabel("⛏️ Mine Again")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("menu_open")
        .setLabel("🏠 Menu")
        .setStyle(ButtonStyle.Secondary)
    );
    container.addActionRowComponents(row);
  }

  return container;
}

export function miningCooldownDisplay(remainingSeconds: number): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xff9900)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `⏳ **Mining Cooldown** — ${remainingSeconds}s remaining\n` +
        `Your mining equipment needs time to recharge.`
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("menu_open")
          .setLabel("🏠 Menu")
          .setStyle(ButtonStyle.Secondary)
      )
    );
}

export function cargoFullDisplay(): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xff6600)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `📦 **Cargo is full!** Sell items at the station market or transfer to station storage.`
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("menu_open")
          .setLabel("🏠 Menu")
          .setStyle(ButtonStyle.Secondary)
      )
    );
}
