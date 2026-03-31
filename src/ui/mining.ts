import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

export interface MinedItemDisplay {
  itemDisplayName: string;
  quantity: number;
  emoji?: string;
  basePrice?: number;
}

interface MiningDisplayData {
  items: MinedItemDisplay[];
  cargoUsed: number;
  cargoCapacity: number;
  isProxy?: boolean;
  /** Include Mine Again + Menu buttons */
  showButtons?: boolean;
  /** Owner of this mining message (for per-user tracking) */
  ownerUserId?: string;
  /** Used to construct the Mine Again button customId */
  channelType?: string;
  referenceId?: number | null;
  /** When > 0, disables the Mine Again button and shows a countdown label */
  cooldownSeconds?: number;
  /** Pre-picked flavor text — set once so countdown edits don't re-roll it */
  flavorText?: string;
}

export function pickMiningFlavor(ownerUserId?: string): string {
  const userTag = ownerUserId ? `<@${ownerUserId}>` : "You";
  return pickFlavor(userTag);
}

export function miningResultDisplay(data: MiningDisplayData): ContainerBuilder {
  const cargoPercent = Math.round((data.cargoUsed / data.cargoCapacity) * 100);
  const proxyWarning = data.isProxy
    ? `\n\n📡 *Proxy system — yield reduced by 30%. Visit the system's home server for full rates.*`
    : "";

  const flavor = data.flavorText ?? pickMiningFlavor(data.ownerUserId);
  const itemLines = data.items
    .map(i => {
      const price = i.basePrice != null ? ` \`${i.basePrice * i.quantity}¢\`` : "";
      return `${i.emoji ?? "✦"} **\`${i.quantity}x\`** ${i.itemDisplayName}${price}`;
    })
    .join("\n");

  const container = new ContainerBuilder()
    .setAccentColor(data.isProxy ? 0xffaa00 : 0x00cc66)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `⚡ ${flavor}\n\n` +
        `${itemLines}\n\n` +
        `📦 Cargo: \`${cargoBar(data.cargoUsed, data.cargoCapacity)}\` ${cargoPercent}%` +
        proxyWarning
      )
    );

  if (data.showButtons) {
    const onCooldown = (data.cooldownSeconds ?? 0) > 0;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`mine_again:${data.ownerUserId}:${data.channelType}:${data.referenceId ?? "0"}`)
        .setLabel(onCooldown ? `⏳ Ready in ${data.cooldownSeconds}s` : "⚡ Mine Again")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(onCooldown),
      new ButtonBuilder()
        .setCustomId(`quick_sell:${data.ownerUserId}`)
        .setLabel("💰 Sell All")
        .setStyle(ButtonStyle.Success),
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

const MINING_FLAVORS: ((user: string) => string)[] = [
  (u) => `${u} fired the mining lasers...`,
  (u) => `${u} blasted into the rock face!`,
  (u) => `${u} locked on and let the drill rip...`,
  (u) => `${u} carved through the surface layer...`,
  (u) => `${u} punched through a mineral vein!`,
  (u) => `${u} sent sparks flying off the hull...`,
  (u) => `${u} aimed at a glinting seam and opened fire...`,
  (u) => `${u} spun up the extractors and went to work...`,
  (u) => `${u} cracked open a fresh deposit!`,
  (u) => `${u} let the lasers do the talking...`,
];

function pickFlavor(userTag: string): string {
  return MINING_FLAVORS[Math.floor(Math.random() * MINING_FLAVORS.length)](userTag);
}

function cargoBar(used: number, capacity: number): string {
  const width = 10;
  const filled = Math.round((used / capacity) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
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
