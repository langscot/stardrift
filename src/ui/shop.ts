import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import type { ModifierSource } from "../systems/modifiers.js";

interface ShipDisplayData {
  key: string;
  displayName: string;
  description: string | null;
  tier: number;
  price: number;
  moduleSlots: number;
  modifiers: ModifierSource;
  emoji: string | null;
}

interface ModuleDisplayData {
  key: string;
  displayName: string;
  description: string | null;
  category: string;
  tier: number;
  price: number;
  modifiers: ModifierSource;
  emoji: string | null;
  ownedCount: number;
  fittedCount: number;
}

interface ShopContext {
  credits: number;
  currentShipName: string;
  currentShipSlots: number;
  freeSlots: number;
}

const CATEGORY_EMOJI: Record<string, string> = {
  laser: "⚡",
  scanner: "📡",
  cargo: "📦",
  utility: "🔧",
};

// ── Ships Tab ───────────────────────────────────────────────────────────────

export function shopShipsDisplay(
  ctx: ShopContext,
  ships: ShipDisplayData[]
): ContainerBuilder[] {
  const buyableShips = ships.filter(s => s.price > 0);

  // All ship info in a single text block
  const shipLines = buyableShips.map((ship) => {
    const statsLines = formatModifierStatsList(ship.modifiers);
    const isCurrent = ship.displayName === ctx.currentShipName;
    return (
      `${ship.emoji ?? "🚀"} **${ship.displayName}** — ${ship.price.toLocaleString()}¢${isCurrent ? " *(current)*" : ""}\n` +
      (ship.description ? `*${ship.description}*\n` : "") +
      `• Slots: **${ship.moduleSlots}**` +
      (statsLines.length > 0 ? "\n" + statsLines.map(l => `• ${l}`).join("\n") : "")
    );
  }).join("\n\n");

  // Select menu for buying
  const select = new StringSelectMenuBuilder()
    .setCustomId("shop_buy_ship_select")
    .setPlaceholder("Select a ship to buy...");

  for (const ship of buyableShips) {
    if (ship.displayName === ctx.currentShipName) continue;
    const statsText = formatModifierStatsInline(ship.modifiers);
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${ship.displayName} — ${ship.price.toLocaleString()}¢`)
        .setDescription(`${ship.moduleSlots} slots${statsText ? ` · ${statsText}` : ""}`.substring(0, 100))
        .setValue(ship.key)
    );
  }

  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🛒 Ship Shop\n\n` +
        `Your ship: ${ctx.currentShipName} (${ctx.currentShipSlots} slots) · 💰 **${ctx.credits.toLocaleString()}¢**\n\n` +
        shipLines +
        `\n\n` + STATS_LEGEND
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("shop_tab:ships")
          .setLabel("🚀 Ships ✓")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("shop_tab:modules")
          .setLabel("🔧 Modules")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("menu_open")
          .setLabel("🏠 Menu")
          .setStyle(ButtonStyle.Secondary)
      )
    );

  if (select.options.length > 0) {
    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
    );
  }

  return [container];
}

// ── Modules Tab ─────────────────────────────────────────────────────────────

export function shopModulesDisplay(
  ctx: ShopContext,
  modules: ModuleDisplayData[],
  filter?: string
): ContainerBuilder[] {
  // Filter modules
  const filtered = filter && filter !== "all"
    ? modules.filter(m => m.category === filter)
    : modules;

  // Build module listing text
  const moduleLines = filtered.map((mod) => {
    const emoji = mod.emoji ?? CATEGORY_EMOJI[mod.category] ?? "📦";
    const statsLines = formatModifierStatsList(mod.modifiers);
    const ownLine = mod.ownedCount > 0
      ? `Own: ${mod.ownedCount} (${mod.fittedCount} fitted)`
      : "Not owned";

    return (
      `${emoji} **${mod.displayName}** — ${mod.price.toLocaleString()}¢ each\n` +
      (statsLines.length > 0 ? statsLines.map(l => `• ${l}`).join("\n") : "• *No bonuses*") +
      `\n*${ownLine}*`
    );
  }).join("\n\n");

  // Select menu for buying
  const select = new StringSelectMenuBuilder()
    .setCustomId("shop_buy_module_select")
    .setPlaceholder("Select a module to buy...");

  for (const mod of filtered) {
    const statsText = formatModifierStatsInline(mod.modifiers);
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${mod.displayName} — ${mod.price.toLocaleString()}¢`)
        .setDescription(`${statsText} · Own: ${mod.ownedCount}`.substring(0, 100))
        .setValue(mod.key)
    );
  }

  const activeFilter = filter ?? "all";

  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🛒 Module Shop\n\n` +
        `Your ship: ${ctx.currentShipName} (${ctx.currentShipSlots} slots, ${ctx.freeSlots} free) · 💰 **${ctx.credits.toLocaleString()}¢**\n\n` +
        (filtered.length > 0 ? moduleLines : "*No modules in this category.*") +
        `\n\n` + STATS_LEGEND
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("shop_tab:ships")
          .setLabel("🚀 Ships")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("shop_tab:modules")
          .setLabel("🔧 Modules ✓")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("menu_open")
          .setLabel("🏠 Menu")
          .setStyle(ButtonStyle.Secondary)
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...(["all", "laser", "scanner", "cargo", "utility"] as const).map((cat) =>
          new ButtonBuilder()
            .setCustomId(`shop_filter:${cat}`)
            .setLabel(`${cat === "all" ? "📋" : CATEGORY_EMOJI[cat]} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`)
            .setStyle(activeFilter === cat ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(activeFilter === cat)
        )
      )
    );

  if (select.options.length > 0) {
    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
    );
  }

  return [container];
}

// ── Buy Confirmation ────────────────────────────────────────────────────────

export function shipBuyConfirmDisplay(
  shipName: string,
  price: number,
  currentShipName: string,
  fittedModuleCount: number,
  shipKey: string
): ContainerBuilder[] {
  return [
    new ContainerBuilder()
      .setAccentColor(0xff9900)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⚠️ **Buy ${shipName} for ${price.toLocaleString()}¢?**\n\n` +
          `Your current ship (${currentShipName}) will be replaced.` +
          (fittedModuleCount > 0
            ? `\nFitted modules (${fittedModuleCount}) will be returned to your inventory.`
            : "")
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`shop_confirm_ship:${shipKey}`)
            .setLabel("✅ Confirm Purchase")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("shop_tab:ships")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
        )
      ),
  ];
}

export function buySuccessDisplay(
  itemName: string,
  type: "ship" | "module"
): ContainerBuilder[] {
  return [
    new ContainerBuilder()
      .setAccentColor(0x00cc66)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `✅ **Purchased ${itemName}!**`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("menu_loadout")
            .setLabel(type === "ship" ? "🔧 Open Loadout" : "🔧 Fit Now")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("shop_tab:modules")
            .setLabel("🛒 Continue Shopping")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("menu_open")
            .setLabel("🏠 Menu")
            .setStyle(ButtonStyle.Secondary)
        )
      ),
  ];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATS_LEGEND =
  `-# **Yield** — how much ore your lasers extract per cycle\n` +
  `-# **Cooldown** — laser recharge time between mining cycles\n` +
  `-# **Rare Events** — chance of discovering anomalies, relics, or hidden deposits\n` +
  `-# **Rare Ore** — sensor sensitivity to valuable mineral signatures\n` +
  `-# **Cargo** — additional hold space beyond your base capacity\n` +
  `-# **Drops** — chance of hitting multiple ore veins in a single cycle\n` +
  `-# Fitting multiple copies of the same module compounds their effects.`;

function formatModifierStatsList(mods: ModifierSource): string[] {
  const lines: string[] = [];
  if (mods.yieldMultiplier != null && mods.yieldMultiplier !== 1.0) {
    const pct = Math.round((mods.yieldMultiplier - 1) * 100);
    lines.push(pct > 0 ? `Yield: **+${pct}%**` : `Yield: **${pct}%**`);
  }
  if (mods.cooldownMultiplier != null && mods.cooldownMultiplier !== 1.0) {
    const pct = Math.round((1 - mods.cooldownMultiplier) * 100);
    lines.push(`Cooldown: **-${pct}%**`);
  }
  if (mods.extraDropChance != null && mods.extraDropChance > 0) {
    lines.push(`Drops: **+${Math.round(mods.extraDropChance * 100)}%**`);
  }
  if (mods.rareWeightBonus != null && mods.rareWeightBonus > 0) {
    lines.push(`Rare Ore: **+${mods.rareWeightBonus}**`);
  }
  if (mods.cargoBonus != null && mods.cargoBonus > 0) {
    lines.push(`Cargo: **+${mods.cargoBonus.toLocaleString()}**`);
  }
  if (mods.rareEventChance != null && mods.rareEventChance > 0) {
    lines.push(`Rare Events: **+${Math.round(mods.rareEventChance * 100)}%**`);
  }
  if (mods.fuelCapacityBonus != null && mods.fuelCapacityBonus > 0) {
    lines.push(`Fuel: **+${mods.fuelCapacityBonus}**`);
  }
  return lines;
}

function formatModifierStatsInline(mods: ModifierSource): string {
  const parts: string[] = [];

  if (mods.yieldMultiplier != null && mods.yieldMultiplier !== 1.0) {
    const pct = Math.round((mods.yieldMultiplier - 1) * 100);
    parts.push(pct > 0 ? `Yield +${pct}%` : `Yield ${pct}%`);
  }
  if (mods.cooldownMultiplier != null && mods.cooldownMultiplier !== 1.0) {
    const pct = Math.round((1 - mods.cooldownMultiplier) * 100);
    parts.push(`Cooldown -${pct}%`);
  }
  if (mods.extraDropChance != null && mods.extraDropChance > 0) {
    parts.push(`Drops +${Math.round(mods.extraDropChance * 100)}%`);
  }
  if (mods.rareWeightBonus != null && mods.rareWeightBonus > 0) {
    parts.push(`Rare Ore +${mods.rareWeightBonus}`);
  }
  if (mods.cargoBonus != null && mods.cargoBonus > 0) {
    parts.push(`Cargo +${mods.cargoBonus.toLocaleString()}`);
  }
  if (mods.rareEventChance != null && mods.rareEventChance > 0) {
    parts.push(`Rare Events +${Math.round(mods.rareEventChance * 100)}%`);
  }
  if (mods.fuelCapacityBonus != null && mods.fuelCapacityBonus > 0) {
    parts.push(`Fuel +${mods.fuelCapacityBonus}`);
  }

  return parts.join(" · ");
}

function getStackingTip(mod: ModuleDisplayData): string {
  if (!mod.modifiers.yieldMultiplier || mod.modifiers.yieldMultiplier === 1.0) return "";
  const stacked3 = Math.round((Math.pow(mod.modifiers.yieldMultiplier, 3) - 1) * 100);
  return ` · *Stack 3 → +${stacked3}%*`;
}
