import { eq, and, isNotNull } from "drizzle-orm";
import { db } from "../index.js";
import { systems, planets, asteroidBelts, guildSystems } from "../schema.js";

export async function getHubSystem() {
  return db.query.systems.findFirst({
    where: eq(systems.isHub, true),
  });
}

export async function getSystemById(id: number) {
  return db.query.systems.findFirst({
    where: eq(systems.id, id),
  });
}

export async function getSystemByName(name: string) {
  return db.query.systems.findFirst({
    where: eq(systems.name, name),
  });
}

/** @deprecated Use getGuildSystems() for multi-system guilds */
export async function getSystemByGuildId(guildId: string) {
  return db.query.systems.findFirst({
    where: eq(systems.guildId, guildId),
  });
}

export async function getSystemPlanets(systemId: number) {
  return db.query.planets.findMany({
    where: eq(planets.systemId, systemId),
    orderBy: planets.slot,
  });
}

export async function getSystemBelts(systemId: number) {
  return db.query.asteroidBelts.findMany({
    where: eq(asteroidBelts.systemId, systemId),
  });
}

export async function getEnrolledSystems() {
  return db.query.systems.findMany({
    where: isNotNull(systems.guildId),
  });
}

/** Get all systems registered on a guild (owned + proxied). */
export async function getGuildSystems(guildId: string) {
  const rows = await db
    .select({
      system: systems,
      isProxy: guildSystems.isProxy,
      addedAt: guildSystems.addedAt,
      addedByUserId: guildSystems.addedByUserId,
    })
    .from(guildSystems)
    .innerJoin(systems, eq(guildSystems.systemId, systems.id))
    .where(eq(guildSystems.guildId, guildId));
  return rows;
}

/** Check if a guild has a specific system registered (owned or proxy). */
export async function getGuildSystem(guildId: string, systemId: number) {
  return db.query.guildSystems.findFirst({
    where: and(
      eq(guildSystems.guildId, guildId),
      eq(guildSystems.systemId, systemId)
    ),
  });
}

/** Check if a system is being accessed in proxy mode for a given guild. */
export async function isProxyInGuild(
  guildId: string,
  systemId: number
): Promise<boolean> {
  const row = await db.query.guildSystems.findFirst({
    where: and(
      eq(guildSystems.guildId, guildId),
      eq(guildSystems.systemId, systemId)
    ),
  });
  return row?.isProxy ?? false;
}

/**
 * Enroll (own) a system on a guild.
 * Sets ownership on systems table + creates guild_systems entry with isProxy=false.
 */
export async function enrollSystem(
  systemId: number,
  guildId: string,
  ownerUserId: string
) {
  await db
    .update(systems)
    .set({ guildId, ownerUserId, enrolledAt: new Date() })
    .where(eq(systems.id, systemId));

  await db
    .insert(guildSystems)
    .values({ guildId, systemId, isProxy: false, addedByUserId: ownerUserId })
    .onConflictDoNothing();
}

/**
 * Add a system to a guild as a proxy (read-only mirror with debuffs).
 * The system must already be enrolled (owned) by someone.
 */
export async function addProxySystem(
  systemId: number,
  guildId: string,
  addedByUserId: string
) {
  await db
    .insert(guildSystems)
    .values({ guildId, systemId, isProxy: true, addedByUserId })
    .onConflictDoNothing();
}

/**
 * Register the hub system on a guild as a proxy.
 * Used by /setup-hub — Sol Nexus is shared across all guilds, never "owned".
 */
export async function registerHubProxy(guildId: string, addedByUserId: string) {
  const hub = await getHubSystem();
  if (!hub) throw new Error("Hub system not found");

  await db
    .insert(guildSystems)
    .values({ guildId, systemId: hub.id, isProxy: true, addedByUserId })
    .onConflictDoNothing();

  return hub;
}
