import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  MessageFlags,
} from "discord.js";
import QRCode from "qrcode";
import { generateSecret, verifyTOTP, totpUri } from "./totp.js";
import { getTotpSecret, upsertTotpSecret } from "../db/queries/admin.js";

/**
 * Entry point for /admin setup.
 * If a secret already exists, shows a danger-confirmation button first.
 * Otherwise goes straight to DM + QR code.
 */
export async function initiateSetup(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const existing = await getTotpSecret(interaction.user.id);

  if (existing) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_totp_regen:${interaction.user.id}`)
        .setLabel("Yes, regenerate — my old authenticator entry will stop working")
        .setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({
      content:
        "⚠️ You already have 2FA configured. Regenerating will invalidate your current authenticator entry — you will need to re-add Stardrift.",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await sendQrDm(interaction);
}

/**
 * Handles the admin_totp_regen button (confirmed regeneration).
 */
export async function handleRegenButton(
  interaction: ButtonInteraction
): Promise<void> {
  await sendQrDm(interaction);
}

/**
 * Handles the admin_totp_verify button — opens a modal for the 6-digit code.
 * Embeds the channel + message IDs in the modal customId so we can delete the
 * QR message after successful verification.
 */
export async function handleVerifyButton(
  interaction: ButtonInteraction
): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId(
      `admin_totp_modal:${interaction.user.id}:${interaction.channelId}:${interaction.message.id}`
    )
    .setTitle("Verify 2FA Setup");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("totp_code")
        .setLabel("6-digit code from your authenticator app")
        .setStyle(TextInputStyle.Short)
        .setMinLength(6)
        .setMaxLength(6)
        .setPlaceholder("123456")
        .setRequired(true)
    )
  );

  await interaction.showModal(modal);
}

/**
 * Handles the admin_totp_modal submission.
 * On success: deletes the QR code DM and confirms setup.
 * On failure: ephemeral error so the user can try again.
 */
export async function handleTotpModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  // customId: admin_totp_modal:{userId}:{channelId}:{messageId}
  const parts = interaction.customId.split(":");
  const [, userId, channelId, messageId] = parts;

  const code = interaction.fields.getTextInputValue("totp_code").trim();
  const secret = await getTotpSecret(userId);

  if (!secret) {
    await interaction.reply({
      content: "No TOTP secret found — run `/admin setup` again.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!verifyTOTP(secret, code)) {
    await interaction.reply({
      content:
        "❌ Invalid code. Make sure your authenticator app is synced to the correct time and try again.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Delete the DM containing the QR code
  try {
    const channel = await interaction.client.channels.fetch(channelId);
    if (channel && "messages" in channel) {
      const msg = await (channel as any).messages.fetch(messageId);
      await msg.delete();
    }
  } catch {
    // Non-fatal — message may already be gone
  }

  await interaction.reply({
    content:
      "✅ **2FA setup complete.** The QR code has been deleted.\n\nUse `/admin activate <code>` whenever you need to start an elevated session.",
    flags: MessageFlags.Ephemeral,
  });
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function sendQrDm(
  interaction: ChatInputCommandInteraction | ButtonInteraction
): Promise<void> {
  const userId = interaction.user.id;
  const secret = generateSecret();
  await upsertTotpSecret(userId, secret);

  const uri = totpUri(secret, interaction.user.username);
  const qrBuffer = await QRCode.toBuffer(uri, {
    type: "png",
    width: 300,
    margin: 2,
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`admin_totp_verify:${userId}`)
      .setLabel("I've scanned it — verify")
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.user.send({
    content: [
      "**Stardrift Admin — 2FA Setup**",
      "Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, Bitwarden, etc.).",
      "",
      "Then click **I've scanned it — verify** and enter the 6-digit code to confirm.",
      "⚠️ This message will be deleted once verification succeeds.",
    ].join("\n"),
    files: [new AttachmentBuilder(qrBuffer, { name: "stardrift-2fa.png" })],
    components: [row],
  });

  if (interaction.isChatInputCommand()) {
    await interaction.reply({
      content: "📬 Check your DMs to complete 2FA setup.",
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await (interaction as ButtonInteraction).update({
      content: "📬 Check your DMs to complete 2FA setup.",
      components: [],
    });
  }
}
