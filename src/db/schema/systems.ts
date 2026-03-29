import {
  pgTable,
  serial,
  varchar,
  real,
  smallint,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

export const systems = pgTable(
  "systems",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 64 }).notNull().unique(),
    x: real("x").notNull(),
    y: real("y").notNull(),
    starType: varchar("star_type", { length: 20 }).notNull(),
    resourceRating: smallint("resource_rating").notNull(),
    isHub: boolean("is_hub").notNull().default(false),
    guildId: varchar("guild_id", { length: 20 }),
    ownerUserId: varchar("owner_user_id", { length: 20 }),
    enrolledAt: timestamp("enrolled_at"),
  },
  (table) => [
    uniqueIndex("systems_guild_id_idx").on(table.guildId),
    index("systems_coords_idx").on(table.x, table.y),
  ]
);

export const planets = pgTable(
  "planets",
  {
    id: serial("id").primaryKey(),
    systemId: integer("system_id")
      .notNull()
      .references(() => systems.id),
    slot: smallint("slot").notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    planetType: varchar("planet_type", { length: 20 }).notNull(),
    channelId: varchar("channel_id", { length: 20 }),
  },
  (table) => [index("planets_system_id_idx").on(table.systemId)]
);

export const asteroidBelts = pgTable(
  "asteroid_belts",
  {
    id: serial("id").primaryKey(),
    systemId: integer("system_id")
      .notNull()
      .references(() => systems.id),
    name: varchar("name", { length: 64 }).notNull(),
    richness: smallint("richness").notNull(),
    channelId: varchar("channel_id", { length: 20 }),
  },
  (table) => [index("asteroid_belts_system_id_idx").on(table.systemId)]
);

/**
 * Junction table linking Discord guilds to star systems.
 * A guild can host multiple systems (owned or proxied).
 * A system can appear in multiple guilds (as proxy).
 * isProxy=false means this guild owns/enrolled the system.
 * isProxy=true means this guild mirrors another guild's system.
 */
export const guildSystems = pgTable(
  "guild_systems",
  {
    guildId: varchar("guild_id", { length: 20 }).notNull(),
    systemId: integer("system_id")
      .notNull()
      .references(() => systems.id),
    isProxy: boolean("is_proxy").notNull().default(false),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    addedByUserId: varchar("added_by_user_id", { length: 20 }),
  },
  (table) => [
    primaryKey({ columns: [table.guildId, table.systemId] }),
    index("guild_systems_guild_idx").on(table.guildId),
    index("guild_systems_system_idx").on(table.systemId),
  ]
);
