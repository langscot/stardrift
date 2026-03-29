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
import {
  getOverviewStats,
  getEnrolledSystemsPaginated,
  getSystemByIdOrName,
  getSystemDetailById,
  getPlayersPaginated,
  getPlayerDetail,
  updatePlayerFields,
  updateSystemFields,
  unenrollSystem,
} from "../db/queries/admin-dashboard.js";
import {
  buildStatsDisplay,
  buildSystemListDisplay,
  buildSystemDetailDisplay,
  buildPlayerListDisplay,
  buildPlayerDetailDisplay,
} from "../ui/admin.js";
import { errorContainer } from "../ui/common.js";
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

// ── Existing subcommand handlers ────────────────────────────────────────────

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

// ── Dashboard subcommand handlers ───────────────────────────────────────────

/** /admin stats — game overview stats. */
async function handleStats(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;

  const stats = await getOverviewStats();
  const containers = buildStatsDisplay(stats);

  await interaction.reply({
    components: containers,
    flags: MessageFlags.Ephemeral,
  });
}

/** /admin systems [page] [filter] — paginated enrolled systems list. */
async function handleSystems(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;

  const page = interaction.options.getInteger("page") ?? 1;
  const filter = interaction.options.getString("filter") ?? undefined;

  const result = await getEnrolledSystemsPaginated(page, filter);
  const containers = buildSystemListDisplay(
    result.items,
    result.page,
    result.totalPages,
    result.totalCount,
    filter
  );

  await interaction.reply({
    components: containers,
    flags: MessageFlags.Ephemeral,
  });
}

/** /admin system <name_or_id> — detailed view of a single system. */
async function handleSystem(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;

  const idOrName = interaction.options.getString("name_or_id", true);
  const system = await getSystemByIdOrName(idOrName);

  if (!system) {
    await interaction.reply({
      components: [errorContainer(`System "${idOrName}" not found.`)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const detail = await getSystemDetailById(system.id);
  if (!detail) {
    await interaction.reply({
      components: [errorContainer("Failed to load system detail.")],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const containers = buildSystemDetailDisplay(
    detail.system,
    detail.planets,
    detail.belts,
    detail.guilds
  );

  await interaction.reply({
    components: containers,
    flags: MessageFlags.Ephemeral,
  });
}

/** /admin players [page] [search] — paginated player list. */
async function handlePlayers(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;

  const page = interaction.options.getInteger("page") ?? 1;
  const search = interaction.options.getString("search") ?? undefined;

  const result = await getPlayersPaginated(page, search);
  const containers = buildPlayerListDisplay(
    result.items,
    result.page,
    result.totalPages,
    result.totalCount,
    search
  );

  await interaction.reply({
    components: containers,
    flags: MessageFlags.Ephemeral,
  });
}

/** /admin player <user> — detailed player view. */
async function handlePlayer(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;

  const target = interaction.options.getUser("user", true);
  const detail = await getPlayerDetail(target.id);

  if (!detail) {
    await interaction.reply({
      components: [errorContainer(`Player <@${target.id}> has no game record.`)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const containers = buildPlayerDetailDisplay(
    detail.player,
    detail.cargo,
    detail.bans,
    detail.currentSystem
  );

  await interaction.reply({
    components: containers,
    flags: MessageFlags.Ephemeral,
  });
}

/** /admin edit-player <user> [credits] [fuel] [fuel_capacity] [cargo_capacity] — modify player stats (elevated). */
async function handleEditPlayer(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;
  if (await rejectIfNotElevated(interaction)) return;

  const target = interaction.options.getUser("user", true);

  const player = await db.query.players.findFirst({
    where: eq(players.userId, target.id),
  });
  if (!player) {
    await interaction.reply({
      components: [errorContainer(`Player <@${target.id}> has no game record.`)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const credits = interaction.options.getInteger("credits") ?? undefined;
  const fuel = interaction.options.getInteger("fuel") ?? undefined;
  const fuelCapacity = interaction.options.getInteger("fuel_capacity") ?? undefined;
  const cargoCapacity = interaction.options.getInteger("cargo_capacity") ?? undefined;

  if (
    credits === undefined &&
    fuel === undefined &&
    fuelCapacity === undefined &&
    cargoCapacity === undefined
  ) {
    await interaction.reply({
      content: "No fields to update. Provide at least one option.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await updatePlayerFields(target.id, {
    credits,
    fuel,
    fuelCapacity,
    cargoCapacity,
  });

  const changes: string[] = [];
  if (credits !== undefined) changes.push(`Credits → **${credits.toLocaleString()}**`);
  if (fuel !== undefined) changes.push(`Fuel → **${fuel}**`);
  if (fuelCapacity !== undefined) changes.push(`Fuel Capacity → **${fuelCapacity}**`);
  if (cargoCapacity !== undefined) changes.push(`Cargo Capacity → **${cargoCapacity}**`);

  await interaction.reply({
    content: `Updated <@${target.id}>:\n${changes.join("\n")}`,
    flags: MessageFlags.Ephemeral,
  });
}

/** /admin edit-system <name_or_id> [name] [resource_rating] [star_type] — modify system (elevated). */
async function handleEditSystem(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;
  if (await rejectIfNotElevated(interaction)) return;

  const idOrName = interaction.options.getString("name_or_id", true);
  const system = await getSystemByIdOrName(idOrName);

  if (!system) {
    await interaction.reply({
      components: [errorContainer(`System "${idOrName}" not found.`)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const name = interaction.options.getString("name") ?? undefined;
  const resourceRating = interaction.options.getInteger("resource_rating") ?? undefined;
  const starType = interaction.options.getString("star_type") ?? undefined;

  if (name === undefined && resourceRating === undefined && starType === undefined) {
    await interaction.reply({
      content: "No fields to update. Provide at least one option.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await updateSystemFields(system.id, { name, resourceRating, starType });

  const changes: string[] = [];
  if (name !== undefined) changes.push(`Name → **${name}**`);
  if (resourceRating !== undefined) changes.push(`Resource Rating → **${resourceRating}**`);
  if (starType !== undefined) changes.push(`Star Type → **${starType}**`);

  await interaction.reply({
    content: `Updated system **${system.name}** (ID: ${system.id}):\n${changes.join("\n")}`,
    flags: MessageFlags.Ephemeral,
  });
}

/** /admin unenroll <name_or_id> — remove guild claim from a system (elevated). */
async function handleUnenroll(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (await rejectIfNotAdmin(interaction)) return;
  if (await rejectIfNotElevated(interaction)) return;

  const idOrName = interaction.options.getString("name_or_id", true);
  const system = await getSystemByIdOrName(idOrName);

  if (!system) {
    await interaction.reply({
      components: [errorContainer(`System "${idOrName}" not found.`)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!system.guildId) {
    await interaction.reply({
      content: `System **${system.name}** is not enrolled by any guild.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildId = system.guildId;
  await unenrollSystem(system.id);

  await interaction.reply({
    content: `Unenrolled system **${system.name}** (ID: ${system.id}) from guild \`${guildId}\`. All guild connections removed.`,
    flags: MessageFlags.Ephemeral,
  });
}

// ── Command definition ────────────────────────────────────────────────────────

export const adminCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Admin commands")
    // ── Existing subcommands ──
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
    )
    // ── Dashboard read-only subcommands ──
    .addSubcommand((sub) =>
      sub
        .setName("stats")
        .setDescription("Game overview — systems, players, travelers, bans")
    )
    .addSubcommand((sub) =>
      sub
        .setName("systems")
        .setDescription("List enrolled/claimed systems")
        .addIntegerOption((opt) =>
          opt.setName("page").setDescription("Page number (default 1)").setMinValue(1)
        )
        .addStringOption((opt) =>
          opt.setName("filter").setDescription("Filter systems by name")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("system")
        .setDescription("View a system in detail")
        .addStringOption((opt) =>
          opt
            .setName("name_or_id")
            .setDescription("System name or ID")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("players")
        .setDescription("List players")
        .addIntegerOption((opt) =>
          opt.setName("page").setDescription("Page number (default 1)").setMinValue(1)
        )
        .addStringOption((opt) =>
          opt.setName("search").setDescription("Search by name or user ID")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("player")
        .setDescription("View a player in detail")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The player to inspect").setRequired(true)
        )
    )
    // ── Dashboard write subcommands (require elevation) ──
    .addSubcommand((sub) =>
      sub
        .setName("edit-player")
        .setDescription("Modify a player's stats (requires elevation)")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("The player to edit").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName("credits").setDescription("Set credits")
        )
        .addIntegerOption((opt) =>
          opt.setName("fuel").setDescription("Set fuel").setMinValue(0)
        )
        .addIntegerOption((opt) =>
          opt.setName("fuel_capacity").setDescription("Set max fuel").setMinValue(1)
        )
        .addIntegerOption((opt) =>
          opt.setName("cargo_capacity").setDescription("Set max cargo").setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit-system")
        .setDescription("Modify a system's properties (requires elevation)")
        .addStringOption((opt) =>
          opt
            .setName("name_or_id")
            .setDescription("System name or ID")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("name").setDescription("New system name")
        )
        .addIntegerOption((opt) =>
          opt
            .setName("resource_rating")
            .setDescription("New resource rating (1-10)")
            .setMinValue(1)
            .setMaxValue(10)
        )
        .addStringOption((opt) =>
          opt
            .setName("star_type")
            .setDescription("New star type")
            .addChoices(
              { name: "Yellow Dwarf", value: "yellow_dwarf" },
              { name: "Red Giant", value: "red_giant" },
              { name: "Blue Giant", value: "blue_giant" },
              { name: "Neutron Star", value: "neutron_star" },
              { name: "Black Hole", value: "black_hole" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("unenroll")
        .setDescription("Remove guild claim from a system (requires elevation)")
        .addStringOption((opt) =>
          opt
            .setName("name_or_id")
            .setDescription("System name or ID")
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    // Setup has its own admin check inline
    if (sub === "setup") {
      if (!isAdmin(interaction.user.id)) {
        await interaction.reply({ content: "Access denied.", flags: MessageFlags.Ephemeral });
        return;
      }
      return initiateSetup(interaction);
    }

    switch (sub) {
      // Auth
      case "activate":    return handleActivate(interaction);
      case "status":      return handleStatus(interaction);
      // Moderation
      case "ban":         return handleBan(interaction);
      case "unban":       return handleUnban(interaction);
      // Dashboard — read
      case "stats":       return handleStats(interaction);
      case "systems":     return handleSystems(interaction);
      case "system":      return handleSystem(interaction);
      case "players":     return handlePlayers(interaction);
      case "player":      return handlePlayer(interaction);
      // Dashboard — write (elevated)
      case "edit-player":  return handleEditPlayer(interaction);
      case "edit-system":  return handleEditSystem(interaction);
      case "unenroll":     return handleUnenroll(interaction);
    }
  },
};
