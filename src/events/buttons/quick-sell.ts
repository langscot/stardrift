import {
  ButtonInteraction,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { getCargoItems, removeFromCargo } from "../../db/queries/inventory.js";
import { recordNpcSale } from "../../db/queries/market.js";
import { addCredits } from "../../db/queries/players.js";
import { isProxyInGuild } from "../../db/queries/systems.js";
import { db } from "../../db/index.js";
import { players, systemChannels } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getTravelState } from "../../redis/travel.js";
import { PROXY_SELL_MULTIPLIER } from "../../middleware/location-guard.js";
import { ITEM_EMOJI } from "../../systems/mining-action.js";
import { pickSellFlavor } from "../../ui/market.js";
import { stopCountdown } from "../../systems/mining-tracker.js";

/**
 * Quick-sell button from the mining screen.
 * Sells entire cargo at NPC prices without needing to be in a market channel.
 * customId format: quick_sell:{ownerUserId}
 */
export async function handleQuickSell(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.user.id;

  const travelState = await getTravelState(userId);
  if (travelState) {
    await interaction.reply({ content: "You can't sell while traveling.", flags: 64 });
    return;
  }

  const player = await db.query.players.findFirst({
    where: eq(players.userId, userId),
  });
  if (!player?.currentSystemId) {
    await interaction.reply({ content: "You're not docked at a system.", flags: 64 });
    return;
  }

  const channel = await db.query.systemChannels.findFirst({
    where: eq(systemChannels.channelId, interaction.channelId),
  });
  const proxy = channel?.guildId
    ? await isProxyInGuild(channel.guildId, channel.systemId)
    : false;

  const cargo = await getCargoItems(userId);
  if (cargo.length === 0) {
    await interaction.reply({ content: "Your cargo is already empty.", flags: 64 });
    return;
  }

  const allItemTypes = await db.query.itemTypes.findMany();
  const itemTypeMap = new Map(allItemTypes.map((it) => [it.key, it]));

  let totalCredits = 0;
  const lines: string[] = [];

  for (const item of cargo) {
    const removed = await removeFromCargo(userId, item.itemType, item.quantity);
    if (!removed) continue;

    let credits = await recordNpcSale(player.currentSystemId, item.itemType, item.quantity);
    if (proxy) credits = Math.floor(credits * PROXY_SELL_MULTIPLIER);

    totalCredits += credits;
    const displayName = itemTypeMap.get(item.itemType)?.displayName ?? item.itemType;
    const emoji = ITEM_EMOJI[item.itemType] ?? "✦";
    lines.push(`${emoji} **${item.quantity}x** ${displayName} — **${credits.toLocaleString()}¢**`);
  }

  await addCredits(userId, totalCredits);

  const updatedPlayer = await db.query.players.findFirst({
    where: eq(players.userId, userId),
  });
  const newBalance = updatedPlayer?.credits ?? 0;

  const proxyNote = proxy
    ? `\n\n📡 *Proxy market — 20% fee applied.*`
    : "";

  const flavor = pickSellFlavor(userId);

  const parts = interaction.customId.split(":");
  const ownerUserId = parts[1];

  const container = new ContainerBuilder()
    .setAccentColor(proxy ? 0xffaa00 : 0x00cc66)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `💰 ${flavor}\n\n` +
        lines.join("\n") +
        `\n\n**Total earned: ${totalCredits.toLocaleString()}¢**` +
        `\n💳 Balance: **${newBalance.toLocaleString()}¢**` +
        proxyNote
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`mine_again:${ownerUserId}:planet:0`)
          .setLabel("⚡ Mine Again")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("menu_open")
          .setLabel("🏠 Menu")
          .setStyle(ButtonStyle.Secondary)
      )
    );

  // Stop the mining cooldown countdown so it doesn't overwrite this message
  stopCountdown(interaction.message.id);

  // Replace the mine message in place
  await interaction.update({
    components: [container],
    flags: MessageFlags.IsComponentsV2 as number,
  });
}
