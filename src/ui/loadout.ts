import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import type { ResolvedModifiers, ModifierSource } from "../systems/modifiers.js";

interface FittedModuleDisplay {
  slotIndex: number;
  moduleKey: string;
  displayName: string;
  emoji: string | null;
  modifiers: ModifierSource;
}

interface InventoryModuleDisplay {
  moduleKey: string;
  displayName: string;
  emoji: string | null;
  quantity: number;
  modifiers: ModifierSource;
}

interface LoadoutDisplayData {
  shipName: string;
  shipEmoji: string | null;
  moduleSlots: number;
  mods: ResolvedModifiers;
  fittedModules: FittedModuleDisplay[];
  inventory: InventoryModuleDisplay[];
  baseCargoCapacity: number;
}

export function loadoutDisplay(data: LoadoutDisplayData): ContainerBuilder[] {
  const containers: ContainerBuilder[] = [];

  // ── Header: ship + combined stats ──
  const statsLines: string[] = [];

  if (data.mods.yieldMultiplier !== 1.0) {
    const pct = Math.round((data.mods.yieldMultiplier - 1) * 100);
    statsLines.push(`• Yield: \`${modBar(data.mods.yieldMultiplier, 0.5, 3.0)}\` **×${data.mods.yieldMultiplier.toFixed(2)}** (${pct > 0 ? "+" : ""}${pct}%)`);
  }
  if (data.mods.cooldownMultiplier !== 1.0) {
    const pct = Math.round((1 - data.mods.cooldownMultiplier) * 100);
    statsLines.push(`• Cooldown: \`${modBar(1 - data.mods.cooldownMultiplier, 0, 0.8)}\` **×${data.mods.cooldownMultiplier.toFixed(2)}** (-${pct}%)`);
  }
  if (data.mods.cargoBonus > 0) {
    statsLines.push(`• Cargo: **${(data.baseCargoCapacity + data.mods.cargoBonus).toLocaleString()}** (${data.baseCargoCapacity.toLocaleString()} + ${data.mods.cargoBonus.toLocaleString()} bonus)`);
  }
  if (data.mods.rareEventChance > 0) {
    statsLines.push(`• Rare Events: **${Math.round(data.mods.rareEventChance * 100)}%** per mine`);
  }
  if (data.mods.extraDropChance > 0) {
    statsLines.push(`• Extra Drops: **+${Math.round(data.mods.extraDropChance * 100)}%**`);
  }
  if (data.mods.rareWeightBonus > 0) {
    statsLines.push(`• Rare Ore Bonus: **+${data.mods.rareWeightBonus} weight**`);
  }

  const header = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🔧 Loadout — ${data.shipEmoji ?? "🚀"} ${data.shipName}\n\n` +
        (statsLines.length > 0
          ? `📊 **Combined Stats:**\n${statsLines.join("\n")}`
          : `📊 *No active modifiers — fit some modules!*`)
      )
    );
  containers.push(header);

  // ── Slot containers ──
  const fittedBySlot = new Map(data.fittedModules.map(m => [m.slotIndex, m]));

  for (let i = 0; i < data.moduleSlots; i++) {
    const mod = fittedBySlot.get(i);

    if (mod) {
      const modStats = formatCompactStats(mod.modifiers);
      const container = new ContainerBuilder()
        .setAccentColor(0x00cc66)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Slot ${i + 1}:** ${mod.emoji ?? "📦"} ${mod.displayName}\n${modStats}`
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`loadout_fit_select:${i}`)
              .setLabel("🔄 Swap")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(data.inventory.length === 0),
            new ButtonBuilder()
              .setCustomId(`loadout_unfit:${i}`)
              .setLabel("❌ Unfit")
              .setStyle(ButtonStyle.Secondary)
          )
        );
      containers.push(container);
    } else {
      const container = new ContainerBuilder()
        .setAccentColor(0x808080)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Slot ${i + 1}:** *Empty*`)
        )
        .addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`loadout_fit_select:${i}`)
              .setLabel("➕ Fit Module")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(data.inventory.length === 0)
          )
        );
      containers.push(container);
    }
  }

  // ── Inventory footer ──
  const invLines = data.inventory.length > 0
    ? data.inventory.map(m =>
        `• ${m.quantity}× ${m.emoji ?? "📦"} ${m.displayName}`
      ).join("\n")
    : "*No unfitted modules*";

  const footer = new ContainerBuilder()
    .setAccentColor(0x334455)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Module Inventory** (unfitted)\n${invLines}`
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("shop_tab:modules")
          .setLabel("🛒 Shop")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("menu_open")
          .setLabel("🏠 Menu")
          .setStyle(ButtonStyle.Secondary)
      )
    );
  containers.push(footer);

  return containers;
}

/**
 * Build a select menu for choosing which module to fit in a slot.
 */
export function loadoutFitSelectMenu(
  slotIndex: number,
  inventory: InventoryModuleDisplay[]
): ContainerBuilder[] {
  if (inventory.length === 0) {
    return [
      new ContainerBuilder()
        .setAccentColor(0x808080)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("*No modules in inventory to fit.*")
        )
        .addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("menu_loadout")
              .setLabel("← Back")
              .setStyle(ButtonStyle.Secondary)
          )
        ),
    ];
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`loadout_fit:${slotIndex}`)
    .setPlaceholder("Choose a module to fit...");

  for (const mod of inventory) {
    const statsText = formatCompactStats(mod.modifiers);
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${mod.displayName} (×${mod.quantity})`)
        .setDescription(statsText.substring(0, 100))
        .setValue(mod.moduleKey)
    );
  }

  return [
    new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Fit module to Slot ${slotIndex + 1}:**`)
      )
      .addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("menu_loadout")
            .setLabel("← Back")
            .setStyle(ButtonStyle.Secondary)
        )
      ),
  ];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function modBar(value: number, min: number, max: number): string {
  const width = 10;
  const normalized = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const filled = Math.round(normalized * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function formatCompactStats(mods: ModifierSource): string {
  const parts: string[] = [];
  if (mods.yieldMultiplier != null && mods.yieldMultiplier !== 1.0) {
    const pct = Math.round((mods.yieldMultiplier - 1) * 100);
    parts.push(`Yield ${pct > 0 ? "+" : ""}${pct}%`);
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
    parts.push(`Cargo +${mods.cargoBonus}`);
  }
  if (mods.rareEventChance != null && mods.rareEventChance > 0) {
    parts.push(`Rare Events +${Math.round(mods.rareEventChance * 100)}%`);
  }
  if (mods.fuelCapacityBonus != null && mods.fuelCapacityBonus > 0) {
    parts.push(`Fuel Cap +${mods.fuelCapacityBonus}`);
  }
  return parts.join(" · ") || "*No bonuses*";
}
