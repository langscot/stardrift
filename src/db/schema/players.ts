import {
  pgTable,
  varchar,
  integer,
  bigint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { systems } from "./systems.js";

export const players = pgTable(
  "players",
  {
    userId: varchar("user_id", { length: 20 }).primaryKey(),
    displayName: varchar("display_name", { length: 64 }).notNull(),
    currentSystemId: integer("current_system_id").references(() => systems.id),
    /** e.g. 'planet', 'asteroid_belt', 'station', 'wormhole', 'ship' */
    currentLocationType: varchar("current_location_type", { length: 20 }),
    /** ID within the corresponding type's table (planets.id, asteroid_belts.id, etc.) */
    currentLocationId: integer("current_location_id"),
    credits: bigint("credits", { mode: "number" }).notNull().default(0),
    fuel: integer("fuel").notNull().default(100),
    fuelCapacity: integer("fuel_capacity").notNull().default(100),
    cargoCapacity: integer("cargo_capacity").notNull().default(1000),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("players_system_idx").on(table.currentSystemId)]
);
