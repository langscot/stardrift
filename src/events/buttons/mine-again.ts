import { ButtonInteraction, MessageFlags, TextChannel } from "discord.js";
import { db } from "../../db/index.js";
import { players } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { executeMining } from "../../systems/mining-action.js";
import { config } from "../../config.js";
import {
  miningResultDisplay,
  miningCooldownDisplay,
  cargoFullDisplay,
} from "../../ui/mining.js";
import {
  getTrackedMessageId,
  trackMessage,
  startCooldownCountdown,
} from "../../systems/mining-tracker.js";

/**
 * Handles the "Mine Again" button press.
 * customId format: mine_again:{ownerUserId}:{channelType}:{referenceId}
 *
 * If the clicking user owns the message, update it in place.
 * If a different user clicks, create/update their own tracked message instead.
 */
export async function handleMineAgain(
  interaction: ButtonInteraction
): Promise<void> {
  const parts = interaction.customId.split(":");
  const ownerUserId = parts[1];
  const userId = interaction.user.id;
  const channel = interaction.channel as TextChannel;

  const player = await db.query.players.findFirst({
    where: eq(players.userId, userId),
  });

  if (!player) {
    await interaction.deferUpdate();
    return;
  }

  const result = await executeMining(
    userId,
    interaction.channelId,
    player.cargoCapacity,
    player.currentSystemId
  );

  const ephemeralV2Flags = MessageFlags.IsComponentsV2 | 64;

  // Cooldown / cargo-full / error — always ephemeral follow-up
  if (result.type === "cooldown") {
    await interaction.deferUpdate();
    await interaction.followUp({
      components: [miningCooldownDisplay(result.remainingSeconds)],
      flags: ephemeralV2Flags,
    });
    return;
  }

  if (result.type === "cargo_full") {
    await interaction.deferUpdate();
    await interaction.followUp({ components: [cargoFullDisplay()], flags: ephemeralV2Flags });
    return;
  }

  if (result.type === "error") {
    await interaction.deferUpdate();
    await interaction.followUp({ content: result.message, flags: 64 });
    return;
  }

  // Success — build display
  const displayData = {
    itemDisplayName: result.itemDisplayName,
    quantity: result.quantity,
    cargoUsed: result.cargoUsed,
    cargoCapacity: result.cargoCapacity,
    isProxy: result.isProxy,
    showButtons: true,
    ownerUserId: userId,
    channelType: result.channelType,
    referenceId: result.referenceId,
  };

  const messagePayload = {
    components: [miningResultDisplay({ ...displayData, cooldownSeconds: config.MINING_COOLDOWN_SECONDS })],
    flags: MessageFlags.IsComponentsV2 as number,
  };

  let messageId: string;

  if (userId === ownerUserId) {
    // Owner clicking their own button — update in place
    await interaction.update(messagePayload);
    messageId = interaction.message.id;
  } else {
    // Different user — acknowledge the button, then send/edit their own message
    await interaction.deferUpdate();

    const existingId = getTrackedMessageId(interaction.channelId, userId);
    if (existingId) {
      try {
        const existing = await channel.messages.fetch(existingId);
        await existing.edit(messagePayload);
        messageId = existingId;
      } catch {
        const msg = await channel.send(messagePayload);
        messageId = msg.id;
      }
    } else {
      const msg = await channel.send(messagePayload);
      messageId = msg.id;
    }
  }

  // Track and reset the 2-min inactivity timer
  trackMessage(interaction.channelId, userId, messageId, channel);

  // Tick down the cooldown label every second
  startCooldownCountdown(channel, messageId, config.MINING_COOLDOWN_SECONDS, displayData);
}
