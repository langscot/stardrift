import { ButtonInteraction, MessageFlags } from "discord.js";
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

/**
 * Handles the "Mine Again" button press.
 * customId format: mine_again:{channelType}:{referenceId}
 * Updates the existing ephemeral message in place.
 */
export async function handleMineAgain(
  interaction: ButtonInteraction
): Promise<void> {
  const player = await db.query.players.findFirst({
    where: eq(players.userId, interaction.user.id),
  });

  if (!player) {
    await interaction.update({
      components: [
        miningResultDisplay({
          itemDisplayName: "Unknown",
          quantity: 0,
          cargoUsed: 0,
          cargoCapacity: 1000,
          showButtons: false,
        }),
      ],
    });
    return;
  }

  const result = await executeMining(
    interaction.user.id,
    interaction.channelId,
    player.cargoCapacity,
    player.currentSystemId
  );

  const ephemeralV2Flags = MessageFlags.IsComponentsV2 | 64;

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

  const displayData = {
    itemDisplayName: result.itemDisplayName,
    quantity: result.quantity,
    cargoUsed: result.cargoUsed,
    cargoCapacity: result.cargoCapacity,
    isProxy: result.isProxy,
    showButtons: true,
    channelType: result.channelType,
    referenceId: result.referenceId,
  };

  await interaction.update({
    components: [miningResultDisplay({ ...displayData, cooldownSeconds: config.MINING_COOLDOWN_SECONDS })],
  });

  setTimeout(async () => {
    try {
      await interaction.editReply({
        components: [miningResultDisplay(displayData)],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      // Message was deleted or token expired — ignore
    }
  }, config.MINING_COOLDOWN_SECONDS * 1000);
}
