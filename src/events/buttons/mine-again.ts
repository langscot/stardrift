import { ButtonInteraction, MessageFlags } from "discord.js";
import { db } from "../../db/index.js";
import { players } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { executeMining } from "../../systems/mining-action.js";
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

  if (result.type === "cooldown") {
    await interaction.update({
      components: [miningCooldownDisplay(result.remainingSeconds)],
    });
    return;
  }

  if (result.type === "cargo_full") {
    await interaction.update({ components: [cargoFullDisplay()] });
    return;
  }

  if (result.type === "error") {
    await interaction.update({
      components: [
        miningResultDisplay({
          itemDisplayName: result.message,
          quantity: 0,
          cargoUsed: 0,
          cargoCapacity: player.cargoCapacity,
          showButtons: false,
        }),
      ],
    });
    return;
  }

  await interaction.update({
    components: [
      miningResultDisplay({
        itemDisplayName: result.itemDisplayName,
        quantity: result.quantity,
        cargoUsed: result.cargoUsed,
        cargoCapacity: result.cargoCapacity,
        isProxy: result.isProxy,
        showButtons: true,
        channelType: result.channelType,
        referenceId: result.referenceId,
      }),
    ],
  });
}
