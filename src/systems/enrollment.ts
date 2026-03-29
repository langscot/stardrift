import {
  Guild,
  ChannelType,
  OverwriteType,
  CategoryChannel,
} from "discord.js";
import { db } from "../db/index.js";
import { systems, planets, asteroidBelts, systemChannels } from "../db/schema.js";
import { eq } from "drizzle-orm";

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
    ? `\ud83d\udce1 ${system.name} [PROXY]`
    : `\u2b50 ${system.name}`;
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

  // Save all channel mappings
  if (channelMappings.length > 0) {
    await db.insert(systemChannels).values(channelMappings);
  }
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
