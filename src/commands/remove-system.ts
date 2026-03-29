import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { systems, guildSystems, systemChannels } from "../db/schema.js";
import { getSystemByName, getGuildSystem } from "../db/queries/systems.js";
import type { Command } from "./types.js";

export const removeSystemCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("remove-system")
    .setDescription(
      "Remove a system from this server and delete its channels (admin only)"
    )
    .addStringOption((opt) =>
      opt
        .setName("system")
        .setDescription("Name of the system to remove")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Server only.", flags: 64 });
      return;
    }

    const systemName = interaction.options.getString("system", true).trim();
    await interaction.deferReply();

    const system = await getSystemByName(systemName);
    if (!system) {
      await interaction.editReply(
        `No system named **${systemName}** found.`
      );
      return;
    }

    const guildSystem = await getGuildSystem(interaction.guild.id, system.id);
    if (!guildSystem) {
      await interaction.editReply(
        `**${system.name}** is not registered on this server.`
      );
      return;
    }

    // Get all channel mappings for this guild+system
    const mappings = await db
      .select()
      .from(systemChannels)
      .where(
        and(
          eq(systemChannels.guildId, interaction.guild.id),
          eq(systemChannels.systemId, system.id)
        )
      );

    // Find the category (parent of the first channel)
    let categoryId: string | null = null;
    let deletedCount = 0;

    for (const mapping of mappings) {
      const channel = interaction.guild.channels.cache.get(mapping.channelId);
      if (channel) {
        if (!categoryId) categoryId = channel.parentId;
        try {
          await channel.delete();
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete channel ${mapping.channelId}:`, err);
        }
      }
    }

    // Delete the category itself
    if (categoryId) {
      const category = interaction.guild.channels.cache.get(categoryId);
      if (category) {
        try {
          await category.delete();
        } catch (err) {
          console.error(`Failed to delete category ${categoryId}:`, err);
        }
      }
    }

    // Remove channel mappings from DB
    if (mappings.length > 0) {
      await db
        .delete(systemChannels)
        .where(
          and(
            eq(systemChannels.guildId, interaction.guild.id),
            eq(systemChannels.systemId, system.id)
          )
        );
    }

    // Remove guild_systems entry
    await db
      .delete(guildSystems)
      .where(
        and(
          eq(guildSystems.guildId, interaction.guild.id),
          eq(guildSystems.systemId, system.id)
        )
      );

    // If this guild owned the system (not proxy), clear ownership so it can be re-enrolled
    if (!guildSystem.isProxy) {
      await db
        .update(systems)
        .set({ guildId: null, ownerUserId: null, enrolledAt: null })
        .where(eq(systems.id, system.id));
    }

    const typeLabel = guildSystem.isProxy ? "proxy" : "owned";
    await interaction.editReply(
      `**${system.name}** (${typeLabel}) has been removed from this server.\n` +
        `${deletedCount} channel${deletedCount === 1 ? "" : "s"} + category deleted.`
    );
  },
};
