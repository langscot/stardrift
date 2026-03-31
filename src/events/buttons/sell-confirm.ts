import {
  ButtonInteraction,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { removeFromCargo } from "../../db/queries/inventory.js";
import { recordNpcSale } from "../../db/queries/market.js";
import { addCredits } from "../../db/queries/players.js";
import { isProxyInGuild } from "../../db/queries/systems.js";
import { db } from "../../db/index.js";
import { players, systemChannels, itemTypes } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getTravelState } from "../../redis/travel.js";
import { PROXY_SELL_MULTIPLIER } from "../../middleware/location-guard.js";

export async function handleSellConfirm(
  interaction: ButtonInteraction,
  args: string[]
): Promise<void> {
  const [itemType, quantityStr] = args;
  const quantity = parseInt(quantityStr, 10);

  if (!itemType || isNaN(quantity) || quantity <= 0) {
    await interaction.reply({
      content: "Invalid sell parameters.",
      flags: 64,
    });
    return;
  }

  const userId = interaction.user.id;

  // Verify player is not traveling
  const travelState = await getTravelState(userId);
  if (travelState) {
    await interaction.reply({
      content: "You can't sell while traveling.",
      flags: 64,
    });
    return;
  }

  // Get player's current system
  const player = await db.query.players.findFirst({
    where: eq(players.userId, userId),
  });
  if (!player?.currentSystemId) {
    await interaction.reply({
      content: "You're not docked at a system.",
      flags: 64,
    });
    return;
  }

  // Check the channel belongs to a market
  const channel = await db.query.systemChannels.findFirst({
    where: eq(systemChannels.channelId, interaction.channelId),
  });
  if (!channel || channel.channelType !== "market") {
    await interaction.reply({
      content: "You can only sell at a station market.",
      flags: 64,
    });
    return;
  }

  // Determine proxy status (null guildId = legacy channel, treat as non-proxy)
  const proxy = channel.guildId
    ? await isProxyInGuild(channel.guildId, channel.systemId)
    : false;

  // Remove items from cargo
  const removed = await removeFromCargo(userId, itemType, quantity);
  if (!removed) {
    await interaction.reply({
      content: "You don't have enough of that item.",
      flags: 64,
    });
    return;
  }

  // Record sale and get credits
  let creditsEarned = await recordNpcSale(
    player.currentSystemId,
    itemType,
    quantity
  );

  // Apply proxy tax
  if (proxy) {
    creditsEarned = Math.floor(creditsEarned * PROXY_SELL_MULTIPLIER);
  }

  // Add credits to player
  await addCredits(userId, creditsEarned);

  // Get display name
  const item = await db.query.itemTypes.findFirst({
    where: eq(itemTypes.key, itemType),
  });

  const proxyNote = proxy
    ? `\n\ud83d\udce1 *Proxy market — 20% fee applied. Visit the system's home server for full rates.*`
    : "";

  const container = new ContainerBuilder()
    .setAccentColor(proxy ? 0xffaa00 : 0x00cc66)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `\ud83d\udcb0 **Sale Complete!**\n` +
        `Sold **${quantity}x ${item?.displayName ?? itemType}** for **${creditsEarned.toLocaleString()}¢**` +
        proxyNote
      )
    );

  await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}
