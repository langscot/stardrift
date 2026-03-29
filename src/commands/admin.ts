import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import type { Command } from "./types.js";
import { isAdmin, isElevated, elevatedSessionTTL } from "../admin/index.js";
import { verifyTOTP } from "../admin/totp.js";
import { initiateSetup } from "../admin/setup-flow.js";
import {
  createElevatedSession,
  setBanCache,
  clearBanCache,
} from "../redis/admin.js";
import {
  getTotpSecret,
  recordBan,
  recordUnban,
  getActiveBan,
} from "../db/queries/admin.js";
import { db } from "../db/index.js";
import { players } from "../db/schema.js";
import { eq } from "drizzle-orm";

// ── Guard helpers ─────────────────────────────────────────────────────────────

async function rejectIfNotAdmin(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  if (!isAdmin(interaction.user.id)) {
    await interaction.reply({
      content: "Access denied.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  return false;
}

async function rejectIfNotElevated(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  if (!(await isElevated(interaction.user.id))) {
    await interaction.reply({
      content:
        "You need an active elevated session. Run `/admin activate <code>` first.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  return false;
}

// ── Subcommand handlers ───────────────────────────────────────────────────────

/** /admin activate <code> — verify TOTP and grant a 15-minute elevated session. */
async function handleActivate(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;

  const code = interaction.options.getString("code", true).trim();
  const secret = await getTotpSecret(interaction.user.id);

  if (!secret) {
    await interaction.reply({
      content: "No TOTP secret found. Run `/admin setup` first.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!verifyTOTP(secret, code)) {
    await interaction.reply({
      content: "Invalid code. Elevation denied.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await createElevatedSession(interaction.user.id);

  await interaction.reply({
    content:
      "Elevated session active for **15 minutes**. Use this time to run privileged commands.",
    flags: MessageFlags.Ephemeral,
  });
}

/** /admin status — show current session info. */
async function handleStatus(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;

  const ttl = await elevatedSessionTTL(interaction.user.id);

  if (ttl <= 0) {
    await interaction.reply({
      content:
        "No active elevated session. Run `/admin activate <code>` to elevate.",
      flags: MessageFlags.Ephemeral,
    });
  } else {
    const mins = Math.floor(ttl / 60);
    const secs = ttl % 60;
    await interaction.reply({
      content: `Elevated session active — expires in **${mins}m ${secs}s**.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

/** /admin ban <user> [reason] — ban a player (requires elevated session). */
async function handleBan(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;
  if (await rejectIfNotElevated(interaction)) return;

  const target = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? undefined;

  if (target.id === interaction.user.id) {
    await interaction.reply({
      content: "You cannot ban yourself.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (isAdmin(target.id)) {
    await interaction.reply({
      content: "You cannot ban another admin.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const player = await db.query.players.findFirst({
    where: eq(players.userId, target.id),
  });
  if (!player) {
    await interaction.reply({
      content: `<@${target.id}> has no player record — they've never played Stardrift.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await recordBan(target.id, interaction.user.id, reason);
  await setBanCache(target.id, reason ?? "No reason given");

  await interaction.reply({
    content: [`**Banned:** <@${target.id}>`, reason ? `**Reason:** ${reason}` : ""]
      .filter(Boolean)
      .join("\n"),
    flags: MessageFlags.Ephemeral,
  });
}

/** /admin unban <user> — lift a ban (requires elevated session). */
async function handleUnban(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;
  if (await rejectIfNotElevated(interaction)) return;

  const target = interaction.options.getUser("user", true);

  const activeBan = await getActiveBan(target.id);
  if (!activeBan) {
    await interaction.reply({
      content: `<@${target.id}> is not currently banned.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await recordUnban(target.id, interaction.user.id);
  await clearBanCache(target.id);

  await interaction.reply({
    content: `**Unbanned:** <@${target.id}>`,
    flags: MessageFlags.Ephemeral,
  });
}

// ── Command definition ────────────────────────────────────────────────────────

export const adminCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Admin commands")
    .addSubcommand((sub) =>
      sub.setName("setup").setDescription("Set up your admin 2FA (sends QR code via DM)")
    )
    .addSubcommand((sub) =>
      sub
        .setName("activate")
        .setDescription("Activate an elevated admin session (15 min)")
        .addStringOption((opt) =>
          opt
            .setName("code")
            .setDescription("6-digit TOTP code from your authenticator app")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show your current admin session status")
    )
    .addSubcommand((sub) =>
      sub
        .setName("ban")
        .setDescription("Ban a player from Stardrift")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The player to ban").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("reason").setDescription("Reason for the ban").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("unban")
        .setDescription("Lift a player's ban")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The player to unban").setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // setup is handled here; all others require admin check inside
    const sub = interaction.options.getSubcommand();

    if (sub === "setup") {
      if (!isAdmin(interaction.user.id)) {
        await interaction.reply({ content: "Access denied.", flags: MessageFlags.Ephemeral });
        return;
      }
      return initiateSetup(interaction);
    }

    switch (sub) {
      case "activate": return handleActivate(interaction);
      case "status":   return handleStatus(interaction);
      case "ban":      return handleBan(interaction);
      case "unban":    return handleUnban(interaction);
    }
  },
};
