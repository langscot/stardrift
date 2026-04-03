import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { RareEventResult } from "../systems/mining-action.js";
import type { ResolvedModifiers } from "../systems/modifiers.js";

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
  /** Pre-picked flavor text — set once so countdown edits don't re-roll it */
  flavorText?: string;
  /** Unix timestamp (seconds) when the cooldown expires — powers live <t:R> countdown */
  cooldownExpiresAt?: number;
  /** Rare event result, if one triggered */
  rareEvent?: RareEventResult;
  /** Resolved modifiers — shown as compact stat line when non-default */
  mods?: ResolvedModifiers;
  /** Some ore was lost because cargo was nearly full */
  cargoPartial?: boolean;
  /** Effective cooldown in seconds (after modifier) */
  effectiveCooldown?: number;
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
  const cargoWarning = data.cargoPartial
    ? `\n\n⚠️ *Some ore was discarded — cargo nearly full! Use \`/sell\` to free up space.*`
    : "";

  const flavor = data.flavorText ?? pickMiningFlavor(data.ownerUserId);
  const itemLines = [...data.items]
    .sort((a, b) => ((b.basePrice ?? 0) * b.quantity) - ((a.basePrice ?? 0) * a.quantity))
    .map(i => {
      const price = i.basePrice != null ? ` — ${(i.basePrice * i.quantity).toLocaleString()}¢` : "";
      return `${i.emoji ?? "✦"} **${i.quantity}x** ${i.itemDisplayName}${price}`;
    })
    .join("\n");

  // Compact stat line — only shown when modifiers are non-default
  const statLine = data.mods && hasNonDefaultMods(data.mods)
    ? `\n🔧 *${formatModsSummary(data.mods, data.effectiveCooldown)}*`
    : "";

  // Rare event section
  const rareEventSection = data.rareEvent
    ? `\n\n✨ **RARE FIND: ${data.rareEvent.emoji} ${data.rareEvent.name}!**\n` +
      `*${data.rareEvent.description}*\n` +
      data.rareEvent.rewards.map(r =>
        `${r.emoji ?? "✦"} **${r.quantity}x** ${r.itemDisplayName}${r.basePrice != null ? ` — ${(r.basePrice * r.quantity).toLocaleString()}¢` : ""}`
      ).join("\n")
    : "";

  const container = new ContainerBuilder()
    .setAccentColor(data.isProxy ? 0xffaa00 : 0x00cc66)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `⚡ ${flavor}\n\n` +
        `${itemLines}\n\n` +
        `📦 Cargo: \`${cargoBar(data.cargoUsed, data.cargoCapacity)}\` ${cargoPercent}%` +
        statLine +
        proxyWarning +
        cargoWarning +
        rareEventSection +
        (data.cooldownExpiresAt ? `\n\n⏳ Lasers recharged <t:${data.cooldownExpiresAt}:R>` : "")
      )
    );

  if (data.showButtons) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`mine_again:${data.ownerUserId}:${data.channelType}:${data.referenceId ?? "0"}`)
        .setLabel("⚡ Mine Again")
        .setStyle(ButtonStyle.Primary),
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
  const expiresAt = Math.floor(Date.now() / 1000) + remainingSeconds;
  return new ContainerBuilder()
    .setAccentColor(0xff9900)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `⏳ **Mining Cooldown** — lasers recharged <t:${expiresAt}:R>\n` +
        `Your mining lasers need time to recharge.`
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

function hasNonDefaultMods(mods: ResolvedModifiers): boolean {
  return (
    mods.yieldMultiplier !== 1.0 ||
    mods.cooldownMultiplier !== 1.0 ||
    mods.extraDropChance !== 0 ||
    mods.rareEventChance !== 0 ||
    mods.cargoBonus !== 0
  );
}

function formatModsSummary(mods: ResolvedModifiers, effectiveCooldown?: number): string {
  const parts: string[] = [];
  if (mods.yieldMultiplier !== 1.0) {
    parts.push(`Yield ×${mods.yieldMultiplier.toFixed(2)}`);
  }
  if (mods.cooldownMultiplier !== 1.0 && effectiveCooldown != null) {
    parts.push(`Cooldown ${effectiveCooldown}s`);
  }
  if (mods.rareEventChance > 0) {
    parts.push(`Rare ${Math.round(mods.rareEventChance * 100)}%`);
  }
  if (mods.extraDropChance > 0) {
    parts.push(`Drops +${Math.round(mods.extraDropChance * 100)}%`);
  }
  return parts.join(" · ");
}

export function cargoFullDisplay(): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xff6600)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `📦 **Cargo is full!** Use \`/sell\` to sell items or transfer to station storage.`
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
