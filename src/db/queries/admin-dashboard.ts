import { eq, sql, count, isNotNull, ilike, and, or } from "drizzle-orm";
import { db } from "../index.js";
import {
  systems,
  planets,
  asteroidBelts,
  guildSystems,
  players,
  inventoryItems,
  activeTravels,
  bans,
} from "../schema.js";

// ── Overview stats ──────────────────────────────────────────────────────────

export interface OverviewStats {
  totalSystems: number;
  enrolledSystems: number;
  totalPlayers: number;
  activeTravelers: number;
  activeBans: number;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const [systemCount] = await db
    .select({ value: count() })
    .from(systems);

  const [enrolledCount] = await db
    .select({ value: count() })
    .from(systems)
    .where(isNotNull(systems.guildId));

  const [playerCount] = await db
    .select({ value: count() })
    .from(players);

  const [travelCount] = await db
    .select({ value: count() })
    .from(activeTravels);

  const [banCount] = await db
    .select({ value: count() })
    .from(bans)
    .where(eq(bans.active, true));

  return {
    totalSystems: systemCount.value,
    enrolledSystems: enrolledCount.value,
    totalPlayers: playerCount.value,
    activeTravelers: travelCount.value,
    activeBans: banCount.value,
  };
}

// ── Systems ─────────────────────────────────────────────────────────────────

const SYSTEMS_PER_PAGE = 10;

export type SystemRow = typeof systems.$inferSelect;

export interface SystemListResult {
  items: SystemRow[];
  page: number;
  totalPages: number;
  totalCount: number;
}

export async function getEnrolledSystemsPaginated(
  page: number,
  filter?: string
): Promise<SystemListResult> {
  const conditions = [isNotNull(systems.guildId)];
  if (filter) {
    conditions.push(ilike(systems.name, `%${filter}%`));
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [{ value: totalCount }] = await db
    .select({ value: count() })
    .from(systems)
    .where(where);

  const totalPages = Math.max(1, Math.ceil(totalCount / SYSTEMS_PER_PAGE));
  const safePage = Math.max(1, Math.min(page, totalPages));

  const items = await db
    .select()
    .from(systems)
    .where(where)
    .orderBy(systems.name)
    .limit(SYSTEMS_PER_PAGE)
    .offset((safePage - 1) * SYSTEMS_PER_PAGE);

  return { items, page: safePage, totalPages, totalCount };
}

export async function getSystemDetailById(id: number) {
  const system = await db.query.systems.findFirst({
    where: eq(systems.id, id),
  });
  if (!system) return null;

  const systemPlanets = await db.query.planets.findMany({
    where: eq(planets.systemId, id),
    orderBy: planets.slot,
  });

  const systemBelts = await db.query.asteroidBelts.findMany({
    where: eq(asteroidBelts.systemId, id),
  });

  const guilds = await db
    .select()
    .from(guildSystems)
    .where(eq(guildSystems.systemId, id));

  return { system, planets: systemPlanets, belts: systemBelts, guilds };
}

export async function getSystemByIdOrName(idOrName: string) {
  const asNum = parseInt(idOrName, 10);
  if (!isNaN(asNum)) {
    return db.query.systems.findFirst({ where: eq(systems.id, asNum) });
  }
  return db.query.systems.findFirst({ where: eq(systems.name, idOrName) });
}

export async function updateSystemFields(
  id: number,
  fields: {
    name?: string;
    resourceRating?: number;
    starType?: string;
  }
) {
  const updates: Record<string, unknown> = {};
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.resourceRating !== undefined)
    updates.resourceRating = fields.resourceRating;
  if (fields.starType !== undefined) updates.starType = fields.starType;

  if (Object.keys(updates).length === 0) return;

  await db.update(systems).set(updates).where(eq(systems.id, id));
}

export async function unenrollSystem(id: number) {
  await db
    .update(systems)
    .set({ guildId: null, ownerUserId: null, enrolledAt: null })
    .where(eq(systems.id, id));

  await db.delete(guildSystems).where(eq(guildSystems.systemId, id));
}

// ── Players ─────────────────────────────────────────────────────────────────

const PLAYERS_PER_PAGE = 10;

export type PlayerRow = typeof players.$inferSelect;

export interface PlayerListResult {
  items: (PlayerRow & { hasBan: boolean })[];
  page: number;
  totalPages: number;
  totalCount: number;
}

export async function getPlayersPaginated(
  page: number,
  search?: string
): Promise<PlayerListResult> {
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(players.displayName, `%${search}%`),
        ilike(players.userId, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ value: totalCount }] = await db
    .select({ value: count() })
    .from(players)
    .where(where);

  const totalPages = Math.max(1, Math.ceil(totalCount / PLAYERS_PER_PAGE));
  const safePage = Math.max(1, Math.min(page, totalPages));

  const rows = await db
    .select()
    .from(players)
    .where(where)
    .orderBy(players.displayName)
    .limit(PLAYERS_PER_PAGE)
    .offset((safePage - 1) * PLAYERS_PER_PAGE);

  // Check bans for each player
  const items = await Promise.all(
    rows.map(async (player) => {
      const activeBan = await db.query.bans.findFirst({
        where: and(eq(bans.playerId, player.userId), eq(bans.active, true)),
      });
      return { ...player, hasBan: !!activeBan };
    })
  );

  return { items, page: safePage, totalPages, totalCount };
}

export async function getPlayerDetail(userId: string) {
  const player = await db.query.players.findFirst({
    where: eq(players.userId, userId),
  });
  if (!player) return null;

  const cargo = await db.query.inventoryItems.findMany({
    where: and(
      eq(inventoryItems.playerId, userId),
      eq(inventoryItems.storageType, "cargo")
    ),
  });

  const playerBans = await db.query.bans.findMany({
    where: eq(bans.playerId, userId),
    orderBy: bans.bannedAt,
  });

  const currentSystem = player.currentSystemId
    ? (await db.query.systems.findFirst({
        where: eq(systems.id, player.currentSystemId),
      })) ?? null
    : null;

  return { player, cargo, bans: playerBans, currentSystem };
}

export async function updatePlayerFields(
  userId: string,
  fields: {
    credits?: number;
    fuel?: number;
    fuelCapacity?: number;
    cargoCapacity?: number;
  }
) {
  const updates: Record<string, unknown> = {};
  if (fields.credits !== undefined) updates.credits = fields.credits;
  if (fields.fuel !== undefined) updates.fuel = fields.fuel;
  if (fields.fuelCapacity !== undefined)
    updates.fuelCapacity = fields.fuelCapacity;
  if (fields.cargoCapacity !== undefined)
    updates.cargoCapacity = fields.cargoCapacity;

  if (Object.keys(updates).length === 0) return;

  await db.update(players).set(updates).where(eq(players.userId, userId));
}
