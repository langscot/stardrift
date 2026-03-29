import {
  pgTable,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { players } from "./players.js";
import { systems } from "./systems.js";

export const activeTravels = pgTable(
  "active_travels",
  {
    playerId: varchar("player_id", { length: 20 })
      .primaryKey()
      .references(() => players.userId),
    fromSystemId: integer("from_system_id")
      .notNull()
      .references(() => systems.id),
    toSystemId: integer("to_system_id")
      .notNull()
      .references(() => systems.id),
    departedAt: timestamp("departed_at").notNull().defaultNow(),
    arrivesAt: timestamp("arrives_at").notNull(),
    fuelCost: integer("fuel_cost").notNull(),
  },
  (table) => [index("active_travels_arrives_idx").on(table.arrivesAt)]
);

export const systemChannels = pgTable("system_channels", {
  channelId: varchar("channel_id", { length: 20 }).primaryKey(),
  guildId: varchar("guild_id", { length: 20 }),
  systemId: integer("system_id")
    .notNull()
    .references(() => systems.id),
  channelType: varchar("channel_type", { length: 20 }).notNull(),
  referenceId: integer("reference_id"),
});
