import {
  ButtonInteraction,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { db } from "../../db/index.js";
import { players, systems } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getSystemById } from "../../db/queries/systems.js";
import { startTravel } from "../../db/queries/travel.js";
import { setTravelState, getTravelState } from "../../redis/travel.js";
import { calculateTravel } from "../../systems/travel.js";

export async function handleTravelConfirm(
  interaction: ButtonInteraction,
  args: string[]
): Promise<void> {
  const toSystemId = parseInt(args[0], 10);
  if (isNaN(toSystemId)) {
    await interaction.reply({
      content: "Invalid destination.",
      flags: 64,
    });
    return;
  }

  const userId = interaction.user.id;

  // Check not already traveling
  const existing = await getTravelState(userId);
  if (existing) {
    await interaction.reply({
      content: "You are already traveling!",
      flags: 64,
    });
    return;
  }

  // Get player
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

  if (player.currentSystemId === toSystemId) {
    await interaction.reply({
      content: "You're already in that system!",
      flags: 64,
    });
    return;
  }

  // Get systems
  const fromSystem = await getSystemById(player.currentSystemId);
  const toSystem = await getSystemById(toSystemId);
  if (!fromSystem || !toSystem) {
    await interaction.reply({
      content: "System not found.",
      flags: 64,
    });
    return;
  }

  // Calculate travel
  const travel = calculateTravel(
    fromSystem.x,
    fromSystem.y,
    toSystem.x,
    toSystem.y
  );

  // Check fuel
  if (player.fuel < travel.fuelCost) {
    await interaction.reply({
      content: `Not enough fuel! Need **${travel.fuelCost}**, have **${player.fuel}**.`,
      flags: 64,
    });
    return;
  }

  // Start travel
  const arrivesAt = new Date(Date.now() + travel.travelTimeSeconds * 1000);

  await startTravel(
    userId,
    fromSystem.id,
    toSystem.id,
    arrivesAt,
    travel.fuelCost
  );

  await setTravelState(userId, toSystem.id, arrivesAt);

  const container = new ContainerBuilder()
    .setAccentColor(0x0066cc)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `\ud83d\ude80 **Departing!**\n` +
        `From: **${fromSystem.name}** \u2192 To: **${toSystem.name}**\n` +
        `Distance: ${travel.distance.toFixed(1)} LY\n` +
        `\u26fd Fuel used: ${travel.fuelCost} (${player.fuel - travel.fuelCost} remaining)\n` +
        `\u23f1\ufe0f ETA: **${travel.travelTimeDisplay}**\n\n` +
        `*You cannot perform actions while in transit.*`
      )
    );

  await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}
