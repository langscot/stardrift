import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { starEmoji, formatStarType } from "./common.js";

export interface MenuContext {
  username: string;
  credits: bigint | number;
  fuel: number;
  fuelCapacity: number;
  cargoUsed: number;
  cargoCapacity: number;
  systemName: string;
  isTransit: boolean;
  /** Channel type player is currently in — drives contextual action buttons */
  channelType: string | null;
}

/**
 * Main dashboard panel. Shows player stats and context-aware action buttons.
 */
export function mainMenuDisplay(ctx: MenuContext): ContainerBuilder[] {
  const creditStr = Number(ctx.credits).toLocaleString();
  const locationStr = ctx.isTransit ? "🚀 *In transit...*" : `📍 **${ctx.systemName}**`;

  const dashboard = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🚀 Stardrift — Captain ${ctx.username}\n` +
        `${locationStr}\n\n` +
        `💰 **${creditStr}¢**\n` +
        `⛽ Fuel: \`${gaugeBar(ctx.fuel, ctx.fuelCapacity)}\` ${Math.round((ctx.fuel / ctx.fuelCapacity) * 100)}%\n` +
        `📦 Cargo: \`${gaugeBar(ctx.cargoUsed, ctx.cargoCapacity)}\` ${Math.round((ctx.cargoUsed / ctx.cargoCapacity) * 100)}%`
      )
    );

  // Always-available navigation row
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("menu_cargo")
      .setLabel("📦 Cargo")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("menu_map")
      .setLabel("🗺️ Map")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("menu_stats")
      .setLabel("📊 Stats")
      .setStyle(ButtonStyle.Secondary)
  );
  dashboard.addActionRowComponents(navRow);

  // Context-sensitive action row based on current channel
  const actionButtons: ButtonBuilder[] = [];

  if (ctx.channelType === "planet" || ctx.channelType === "asteroid_belt") {
    actionButtons.push(
      new ButtonBuilder()
        .setCustomId("menu_mine")
        .setLabel("⚡ Mine")
        .setStyle(ButtonStyle.Primary)
    );
  }
  if (ctx.channelType === "market") {
    actionButtons.push(
      new ButtonBuilder()
        .setCustomId("menu_sell")
        .setLabel("💰 Sell")
        .setStyle(ButtonStyle.Success)
    );
  }
  if (ctx.channelType === "travel_hub") {
    actionButtons.push(
      new ButtonBuilder()
        .setCustomId("menu_travel")
        .setLabel("🚀 Travel")
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (actionButtons.length > 0) {
    dashboard.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(...actionButtons)
    );
  }

  return [dashboard];
}

/**
 * Inventory sub-screen — shown when player clicks 📦 Cargo from menu.
 */
export function menuCargoDisplay(
  cargoItems: Array<{ displayName: string; quantity: number }>,
  stationItems: Array<{ displayName: string; quantity: number }>,
  cargoUsed: number,
  cargoCapacity: number,
  systemName: string
): ContainerBuilder[] {
  const cargoLines = cargoItems.length > 0
    ? cargoItems.map((i) => `• ${i.displayName}: **\`${i.quantity}\`**`).join("\n")
    : "*Empty*";

  const stationLines = stationItems.length > 0
    ? stationItems.map((i) => `• ${i.displayName}: **\`${i.quantity}\`**`).join("\n")
    : "*Empty*";

  const container = new ContainerBuilder()
    .setAccentColor(0xf0a030)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 📦 Cargo & Storage\n\n` +
        `**Ship Cargo** (\`${cargoUsed}/${cargoCapacity}\`)\n${cargoLines}\n\n` +
        `**Station Storage** (${systemName})\n${stationLines}`
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("menu_home")
          .setLabel("← Back")
          .setStyle(ButtonStyle.Secondary)
      )
    );

  return [container];
}

/**
 * Map sub-screen — shown when player clicks 🗺️ Map from menu.
 */
export interface MenuMapSystem {
  id: number;
  name: string;
  starType: string;
  distance: number;
  resourceRating: number;
  isHub: boolean;
  isCurrent: boolean;
}

export function menuMapDisplay(
  currentSystemName: string,
  systems: MenuMapSystem[]
): ContainerBuilder[] {
  const containers: ContainerBuilder[] = [];

  const header = new ContainerBuilder()
    .setAccentColor(0x1a1a2e)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🗺️ Star Map — 50 LY range\nCurrent: **${currentSystemName}**`
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("menu_home")
          .setLabel("← Back")
          .setStyle(ButtonStyle.Secondary)
      )
    );
  containers.push(header);

  if (systems.length === 0) {
    containers.push(
      new ContainerBuilder()
        .setAccentColor(0x808080)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "No other systems found within 50 LY. Use `/map` with a larger range."
          )
        )
    );
    return containers;
  }

  for (const sys of systems.slice(0, 8)) {
    const emoji = starEmoji(sys.starType);
    const container = new ContainerBuilder()
      .setAccentColor(sys.isHub ? 0xffd700 : 0x334455)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji} **${sys.name}**${sys.isCurrent ? " 📍 *You are here*" : ""}${sys.isHub ? " 🏠 Hub" : ""}\n` +
          `${formatStarType(sys.starType)} • ${sys.distance.toFixed(1)} LY • Resources: ${sys.resourceRating}/10`
        )
      );

    if (!sys.isCurrent) {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`travel_start:${sys.id}`)
            .setLabel(`🚀 Travel (${sys.distance.toFixed(1)} LY)`)
            .setStyle(ButtonStyle.Primary)
        )
      );
    }

    containers.push(container);
  }

  return containers;
}

/**
 * Stats sub-screen.
 */
export function menuStatsDisplay(
  username: string,
  credits: bigint | number,
  fuel: number,
  fuelCapacity: number,
  cargoUsed: number,
  cargoCapacity: number,
  systemName: string,
  systemStarType: string,
  systemRating: number
): ContainerBuilder[] {
  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 📊 Captain Stats — ${username}\n\n` +
        `💰 **${Number(credits).toLocaleString()}¢**\n` +
        `⛽ Fuel: \`${gaugeBar(fuel, fuelCapacity)}\` ${Math.round((fuel / fuelCapacity) * 100)}%\n` +
        `📦 Cargo: \`${gaugeBar(cargoUsed, cargoCapacity)}\` ${Math.round((cargoUsed / cargoCapacity) * 100)}%\n\n` +
        `**Current System**\n` +
        `📍 ${systemName}\n` +
        `${starEmoji(systemStarType)} ${formatStarType(systemStarType)} · Resource Rating: ${systemRating}/10`
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("menu_home")
          .setLabel("← Back")
          .setStyle(ButtonStyle.Secondary)
      )
    );

  return [container];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function gaugeBar(value: number, max: number): string {
  const width = 10;
  const filled = Math.round((value / max) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}
