import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} from "discord.js";
import type { Command } from "./types.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import { getPlayerShip, getFittedModules } from "../db/queries/equipment.js";
import { getCargoCount } from "../db/queries/inventory.js";
import { getSystemById } from "../db/queries/systems.js";
import { resolvePlayerModifiers, DEFAULT_MODIFIERS } from "../systems/modifiers.js";

export const statsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("View your pilot profile and ship stats"),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = await ensurePlayer(interaction);

    const [ship, fitted, cargoUsed, system, mods] = await Promise.all([
      getPlayerShip(player.userId),
      getFittedModules(player.userId),
      getCargoCount(player.userId),
      player.currentSystemId ? getSystemById(player.currentSystemId) : null,
      resolvePlayerModifiers(player.userId, { isProxy: false }),
    ]);

    const shipName = ship?.displayName ?? "Starter Ship";
    const effectiveCargoCapacity = player.cargoCapacity + mods.cargoBonus;
    const effectiveFuelCapacity = player.fuelCapacity + mods.fuelCapacityBonus;

    const modLines: string[] = [];
    if (mods.yieldMultiplier !== 1.0) modLines.push(`Yield: **x${mods.yieldMultiplier.toFixed(2)}**`);
    if (mods.cooldownMultiplier !== 1.0) modLines.push(`Cooldown: **x${mods.cooldownMultiplier.toFixed(2)}**`);
    if (mods.rareEventChance > 0) modLines.push(`Rare Events: **${Math.round(mods.rareEventChance * 100)}%**`);
    if (mods.extraDropChance > 0) modLines.push(`Extra Drops: **+${Math.round(mods.extraDropChance * 100)}%**`);
    if (mods.cargoBonus > 0) modLines.push(`Cargo Bonus: **+${mods.cargoBonus}**`);

    const fittedLine = fitted.length > 0
      ? fitted.map(f => `${f.emoji ?? "📦"} ${f.displayName}`).join(" · ")
      : "*No modules fitted*";

    const container = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 📊 Pilot Profile\n\n` +
          `**Location:** ${system?.name ?? "In Transit"}\n` +
          `**Credits:** 💰 ${Number(player.credits).toLocaleString()}¢\n` +
          `**Fuel:** ⛽ ${player.fuel}/${effectiveFuelCapacity}\n` +
          `**Cargo:** 📦 ${cargoUsed}/${effectiveCargoCapacity}\n\n` +
          `**Ship:** ${ship?.emoji ?? "🚀"} ${shipName} (${ship?.moduleSlots ?? 3} slots)\n` +
          `**Loadout:** ${fittedLine}\n` +
          (modLines.length > 0 ? `\n**Active Bonuses**\n${modLines.map(l => `• ${l}`).join("\n")}` : "")
        )
      );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
