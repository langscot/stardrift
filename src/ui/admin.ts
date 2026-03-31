/**
 * Admin dashboard display builders using Components V2.
 */

import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { starEmoji, formatStarType, planetEmoji, separator } from "./common.js";
import type { OverviewStats, SystemRow, PlayerRow } from "../db/queries/admin-dashboard.js";

// ── Overview stats ──────────────────────────────────────────────────────────

export function buildStatsDisplay(stats: OverviewStats): ContainerBuilder[] {
  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 📊 Stardrift Admin — Overview\n\n` +
        `🌌 **Total Systems:** ${stats.totalSystems.toLocaleString()}\n` +
        `🏠 **Enrolled Systems:** ${stats.enrolledSystems.toLocaleString()}\n` +
        `👥 **Total Players:** ${stats.totalPlayers.toLocaleString()}\n` +
        `🚀 **Active Travelers:** ${stats.activeTravelers.toLocaleString()}\n` +
        `🔨 **Active Bans:** ${stats.activeBans.toLocaleString()}`
      )
    );

  return [container];
}

// ── System list ─────────────────────────────────────────────────────────────

export function buildSystemListDisplay(
  systems: SystemRow[],
  page: number,
  totalPages: number,
  totalCount: number,
  filter?: string
): ContainerBuilder[] {
  const containers: ContainerBuilder[] = [];

  const header = new ContainerBuilder()
    .setAccentColor(0x1a1a2e)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🌌 Enrolled Systems` +
        (filter ? ` — filter: "${filter}"` : "") +
        `\nShowing page ${page}/${totalPages} (${totalCount} total)`
      )
    );
  containers.push(header);

  if (systems.length === 0) {
    containers.push(
      new ContainerBuilder()
        .setAccentColor(0x808080)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("*No systems found.*")
        )
    );
    return containers;
  }

  for (const sys of systems) {
    const emoji = starEmoji(sys.starType);
    const hubBadge = sys.isHub ? " 🏠 **HUB**" : "";
    const guildLine = sys.guildId
      ? `Guild: \`${sys.guildId}\` · Owner: \`${sys.ownerUserId}\``
      : "*Unclaimed*";

    const container = new ContainerBuilder()
      .setAccentColor(sys.isHub ? 0xffd700 : 0x334455)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji} **${sys.name}** (ID: ${sys.id})${hubBadge}\n` +
          `${formatStarType(sys.starType)} · Resources: ${sys.resourceRating}/10 · ` +
          `Coords: (${sys.x.toFixed(1)}, ${sys.y.toFixed(1)})\n` +
          guildLine
        )
      );
    containers.push(container);
  }

  return containers;
}

// ── System detail ───────────────────────────────────────────────────────────

export function buildSystemDetailDisplay(
  system: SystemRow,
  planetsList: Array<{ id: number; slot: number; name: string; planetType: string }>,
  beltsList: Array<{ id: number; name: string; richness: number }>,
  guilds: Array<{ guildId: string; isProxy: boolean }>
): ContainerBuilder[] {
  const containers: ContainerBuilder[] = [];

  const emoji = starEmoji(system.starType);
  const hubBadge = system.isHub ? " 🏠 **HUB**" : "";
  const claimInfo = system.guildId
    ? `**Guild:** \`${system.guildId}\`\n**Owner:** \`${system.ownerUserId}\`\n**Enrolled:** ${system.enrolledAt?.toISOString().split("T")[0] ?? "N/A"}`
    : "*Unclaimed*";

  const header = new ContainerBuilder()
    .setAccentColor(system.isHub ? 0xffd700 : 0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${emoji} ${system.name}${hubBadge}\n\n` +
        `**ID:** ${system.id}\n` +
        `**Star Type:** ${formatStarType(system.starType)}\n` +
        `**Resource Rating:** ${system.resourceRating}/10\n` +
        `**Coordinates:** (${system.x.toFixed(1)}, ${system.y.toFixed(1)})\n\n` +
        claimInfo
      )
    );
  containers.push(header);

  // Planets
  if (planetsList.length > 0) {
    const planetLines = planetsList
      .map(
        (p) =>
          `${planetEmoji(p.planetType)} **${p.name}** — Slot ${p.slot}, ${p.planetType.replace("_", " ")}`
      )
      .join("\n");

    containers.push(
      new ContainerBuilder()
        .setAccentColor(0x2e7d32)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🪐 Planets (${planetsList.length})\n${planetLines}`
          )
        )
    );
  }

  // Belts
  if (beltsList.length > 0) {
    const beltLines = beltsList
      .map((b) => `☄️ **${b.name}** — Richness: ${b.richness}/5`)
      .join("\n");

    containers.push(
      new ContainerBuilder()
        .setAccentColor(0x795548)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### ☄️ Asteroid Belts (${beltsList.length})\n${beltLines}`
          )
        )
    );
  }

  // Guild connections
  if (guilds.length > 0) {
    const guildLines = guilds
      .map(
        (g) =>
          `\`${g.guildId}\` — ${g.isProxy ? "📡 Proxy" : "🏠 Owner"}`
      )
      .join("\n");

    containers.push(
      new ContainerBuilder()
        .setAccentColor(0x424242)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🔗 Guild Connections (${guilds.length})\n${guildLines}`
          )
        )
    );
  }

  return containers;
}

// ── Player list ─────────────────────────────────────────────────────────────

export function buildPlayerListDisplay(
  playersList: (PlayerRow & { hasBan: boolean })[],
  page: number,
  totalPages: number,
  totalCount: number,
  search?: string
): ContainerBuilder[] {
  const containers: ContainerBuilder[] = [];

  const header = new ContainerBuilder()
    .setAccentColor(0x1a1a2e)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 👥 Players` +
        (search ? ` — search: "${search}"` : "") +
        `\nShowing page ${page}/${totalPages} (${totalCount} total)`
      )
    );
  containers.push(header);

  if (playersList.length === 0) {
    containers.push(
      new ContainerBuilder()
        .setAccentColor(0x808080)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("*No players found.*")
        )
    );
    return containers;
  }

  for (const p of playersList) {
    const banBadge = p.hasBan ? " 🔨 **BANNED**" : "";
    const credits = Number(p.credits).toLocaleString();
    const location = p.currentSystemId
      ? `System #${p.currentSystemId}`
      : "🚀 In transit";

    const container = new ContainerBuilder()
      .setAccentColor(p.hasBan ? 0xff0000 : 0x334455)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**${p.displayName}**${banBadge}\n` +
          `ID: \`${p.userId}\` · 💰 ${credits}¢ · ⛽ ${p.fuel}/${p.fuelCapacity} · 📍 ${location}`
        )
      );
    containers.push(container);
  }

  return containers;
}

// ── Player detail ───────────────────────────────────────────────────────────

export function buildPlayerDetailDisplay(
  player: PlayerRow,
  cargo: Array<{ itemType: string; quantity: number }>,
  playerBans: Array<{
    id: number;
    reason: string | null;
    bannedAt: Date;
    active: boolean;
    bannedBy: string;
  }>,
  currentSystem: { name: string; starType: string } | null
): ContainerBuilder[] {
  const containers: ContainerBuilder[] = [];

  const credits = Number(player.credits).toLocaleString();
  const location = currentSystem
    ? `${starEmoji(currentSystem.starType)} ${currentSystem.name}`
    : "🚀 In transit";

  const header = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 👤 ${player.displayName}\n\n` +
        `**User ID:** \`${player.userId}\`\n` +
        `**Credits:** 💰 ${credits}¢\n` +
        `**Fuel:** ⛽ ${player.fuel}/${player.fuelCapacity}\n` +
        `**Cargo Capacity:** 📦 ${player.cargoCapacity}\n` +
        `**Location:** ${location}\n` +
        `**Joined:** ${player.createdAt.toISOString().split("T")[0]}`
      )
    );
  containers.push(header);

  // Cargo
  if (cargo.length > 0) {
    const cargoLines = cargo
      .map((c) => `• ${c.itemType}: **\`${c.quantity}\`**`)
      .join("\n");

    containers.push(
      new ContainerBuilder()
        .setAccentColor(0xf0a030)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 📦 Cargo (${cargo.length} types)\n${cargoLines}`
          )
        )
    );
  } else {
    containers.push(
      new ContainerBuilder()
        .setAccentColor(0x808080)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### 📦 Cargo\n*Empty*")
        )
    );
  }

  // Ban history
  if (playerBans.length > 0) {
    const banLines = playerBans
      .map((b) => {
        const status = b.active ? "🔴 **ACTIVE**" : "⚪ Lifted";
        const date = b.bannedAt.toISOString().split("T")[0];
        return `${status} — ${date} by \`${b.bannedBy}\`${b.reason ? `: ${b.reason}` : ""}`;
      })
      .join("\n");

    containers.push(
      new ContainerBuilder()
        .setAccentColor(0xff0000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🔨 Ban History (${playerBans.length})\n${banLines}`
          )
        )
    );
  }

  return containers;
}
