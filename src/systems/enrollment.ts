import {
  Guild,
  ChannelType,
  OverwriteType,
  CategoryChannel,
} from "discord.js";
import { db } from "../db/index.js";
import { systems, planets, asteroidBelts, systemChannels } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { config } from "../config.js";

/** Prefix a channel/category name with [TEST] when running in test mode */
const t = (name: string) => config.BOT_ENV === "test" ? `[TEST] ${name}` : name;

interface ChannelMapping {
  channelType: string;
  referenceId: number | null;
}

/**
 * Create all game channels for a system within a guild and record mappings.
 * Works for both owned systems and proxied systems — the guildId on each
 * channel record is what distinguishes them in the DB.
 */
export async function createSystemChannels(
  guild: Guild,
  systemId: number,
  isProxy = false
): Promise<void> {
  // Get system info
  const system = await db.query.systems.findFirst({
    where: eq(systems.id, systemId),
  });
  if (!system) throw new Error(`System ${systemId} not found`);

  const systemPlanets = await db.query.planets.findMany({
    where: eq(planets.systemId, systemId),
    orderBy: planets.slot,
  });

  const systemBelts = await db.query.asteroidBelts.findMany({
    where: eq(asteroidBelts.systemId, systemId),
  });

  // Create category — proxy systems get a 📡 prefix to signal their status
  const categoryName = isProxy
    ? t(`\ud83d\udce1 ${system.name} [PROXY]`)
    : t(`\u2b50 ${system.name}`);
  const category = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
  });

  const channelMappings: Array<{
    channelId: string;
    guildId: string;
    systemId: number;
    channelType: string;
    referenceId: number | null;
  }> = [];

  // Helper to create a text channel under the category
  async function createChannel(
    name: string,
    topic: string,
    mapping: ChannelMapping
  ) {
    const ch = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: category.id,
      topic,
    });
    channelMappings.push({
      channelId: ch.id,
      guildId: guild.id,
      systemId,
      channelType: mapping.channelType,
      referenceId: mapping.referenceId,
    });
    return ch;
  }

  // System overview
  await createChannel(
    "system-overview",
    `${system.name} \u2014 ${formatStarType(system.starType)} \u2014 Resource Rating: ${system.resourceRating}/10`,
    { channelType: "overview", referenceId: null }
  );

  // Station market
  await createChannel(
    "station-market",
    "Buy and sell goods at this station",
    { channelType: "market", referenceId: null }
  );

  // Travel hub
  await createChannel(
    "travel-hub",
    "Depart to other star systems",
    { channelType: "travel_hub", referenceId: null }
  );

  // Planet channels
  for (const planet of systemPlanets) {
    const typeName = planet.planetType.replace("_", " ");
    await createChannel(
      `planet-${planet.slot}-${slugify(planet.name)}`,
      `${planet.name} \u2014 ${typeName} world`,
      { channelType: "planet", referenceId: planet.id }
    );
  }

  // Asteroid belt channels
  for (const belt of systemBelts) {
    await createChannel(
      `asteroid-belt${systemBelts.length > 1 ? `-${slugify(belt.name)}` : ""}`,
      `${belt.name} \u2014 Richness: ${belt.richness}/5`,
      { channelType: "asteroid_belt", referenceId: belt.id }
    );
  }

  // System log
  await createChannel(
    "system-log",
    "Activity feed for this system",
    { channelType: "system_log", referenceId: null }
  );

  // Ship dock — "Join to Create" voice channel for temporary ship VCs
  const dockChannel = await guild.channels.create({
    name: "\u{1F680} Join to open ship",
    type: ChannelType.GuildVoice,
    parent: category.id,
  });
  channelMappings.push({
    channelId: dockChannel.id,
    guildId: guild.id,
    systemId,
    channelType: "ship_dock",
    referenceId: null,
  });

  // Save all channel mappings
  if (channelMappings.length > 0) {
    await db.insert(systemChannels).values(channelMappings);
  }
}

/**
 * Expected channel definitions for a system.
 * Used by sync to determine what should exist.
 */
function getExpectedChannels(
  system: { id: number; name: string; starType: string; resourceRating: number },
  systemPlanets: Array<{ id: number; slot: number; name: string; planetType: string }>,
  systemBelts: Array<{ id: number; name: string; richness: number }>
): Array<{
  name: string;
  topic: string;
  channelType: string;
  referenceId: number | null;
  isVoice: boolean;
}> {
  const channels: Array<{
    name: string;
    topic: string;
    channelType: string;
    referenceId: number | null;
    isVoice: boolean;
  }> = [];

  channels.push({
    name: "system-overview",
    topic: `${system.name} \u2014 ${formatStarType(system.starType)} \u2014 Resource Rating: ${system.resourceRating}/10`,
    channelType: "overview",
    referenceId: null,
    isVoice: false,
  });

  channels.push({
    name: "station-market",
    topic: "Buy and sell goods at this station",
    channelType: "market",
    referenceId: null,
    isVoice: false,
  });

  channels.push({
    name: "travel-hub",
    topic: "Depart to other star systems",
    channelType: "travel_hub",
    referenceId: null,
    isVoice: false,
  });

  for (const planet of systemPlanets) {
    const typeName = planet.planetType.replace("_", " ");
    channels.push({
      name: `planet-${planet.slot}-${slugify(planet.name)}`,
      topic: `${planet.name} \u2014 ${typeName} world`,
      channelType: "planet",
      referenceId: planet.id,
      isVoice: false,
    });
  }

  for (const belt of systemBelts) {
    channels.push({
      name: `asteroid-belt${systemBelts.length > 1 ? `-${slugify(belt.name)}` : ""}`,
      topic: `${belt.name} \u2014 Richness: ${belt.richness}/5`,
      channelType: "asteroid_belt",
      referenceId: belt.id,
      isVoice: false,
    });
  }

  channels.push({
    name: "system-log",
    topic: "Activity feed for this system",
    channelType: "system_log",
    referenceId: null,
    isVoice: false,
  });

  channels.push({
    name: "\u{1F680} Join to open ship",
    topic: "",
    channelType: "ship_dock",
    referenceId: null,
    isVoice: true,
  });

  return channels;
}

/**
 * Sync channels for a system within a guild.
 * Creates missing channels and removes stale ones that no longer match game design.
 * Returns a summary of what was done.
 */
export async function syncSystemChannels(
  guild: Guild,
  systemId: number,
  isProxy: boolean
): Promise<{ created: string[]; removed: string[] }> {
  const system = await db.query.systems.findFirst({
    where: eq(systems.id, systemId),
  });
  if (!system) throw new Error(`System ${systemId} not found`);

  const systemPlanets = await db.query.planets.findMany({
    where: eq(planets.systemId, systemId),
    orderBy: planets.slot,
  });

  const systemBelts = await db.query.asteroidBelts.findMany({
    where: eq(asteroidBelts.systemId, systemId),
  });

  // Get existing channel mappings for this guild+system
  const existingMappings = await db
    .select()
    .from(systemChannels)
    .where(
      and(
        eq(systemChannels.guildId, guild.id),
        eq(systemChannels.systemId, systemId)
      )
    );

  const expected = getExpectedChannels(system, systemPlanets, systemBelts);
  const created: string[] = [];
  const removed: string[] = [];

  // Build a lookup of existing channel types + referenceIds
  const existingByKey = new Map(
    existingMappings.map((m) => [`${m.channelType}:${m.referenceId ?? "null"}`, m])
  );

  // Find the category channel (parent of existing channels)
  let categoryId: string | null = null;
  if (existingMappings.length > 0) {
    const firstChannel = guild.channels.cache.get(existingMappings[0].channelId);
    categoryId = firstChannel?.parentId ?? null;
  }

  // If no category exists, create one (shouldn't happen normally)
  if (!categoryId) {
    const categoryName = isProxy
      ? t(`\ud83d\udce1 ${system.name} [PROXY]`)
      : t(`\u2b50 ${system.name}`);
    const category = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
    });
    categoryId = category.id;
  }

  // Create missing channels
  for (const expected_ch of expected) {
    const key = `${expected_ch.channelType}:${expected_ch.referenceId ?? "null"}`;
    if (existingByKey.has(key)) continue;

    const ch = await guild.channels.create({
      name: expected_ch.name,
      type: expected_ch.isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
      parent: categoryId,
      ...(expected_ch.isVoice ? {} : { topic: expected_ch.topic }),
    });

    await db.insert(systemChannels).values({
      channelId: ch.id,
      guildId: guild.id,
      systemId,
      channelType: expected_ch.channelType,
      referenceId: expected_ch.referenceId,
    });

    created.push(expected_ch.name);
  }

  // Remove stale channels (exist in DB but not in expected list)
  const expectedKeys = new Set(
    expected.map((e) => `${e.channelType}:${e.referenceId ?? "null"}`)
  );

  for (const mapping of existingMappings) {
    const key = `${mapping.channelType}:${mapping.referenceId ?? "null"}`;
    if (expectedKeys.has(key)) continue;

    // Delete the Discord channel
    const discordChannel = guild.channels.cache.get(mapping.channelId);
    if (discordChannel) {
      try {
        await discordChannel.delete();
        removed.push(discordChannel.name);
      } catch (err) {
        console.error(`Failed to delete stale channel ${mapping.channelId}:`, err);
        removed.push(`${mapping.channelType} (delete failed)`);
      }
    } else {
      removed.push(`${mapping.channelType} (already gone)`);
    }

    // Remove from DB
    await db
      .delete(systemChannels)
      .where(eq(systemChannels.channelId, mapping.channelId));
  }

  return { created, removed };
}

function formatStarType(starType: string): string {
  return starType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}
