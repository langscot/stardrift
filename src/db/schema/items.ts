import {
  pgTable,
  serial,
  varchar,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { players } from "./players.js";
import { systems } from "./systems.js";

export const itemTypes = pgTable("item_types", {
  key: varchar("key", { length: 32 }).primaryKey(),
  displayName: varchar("display_name", { length: 64 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  basePrice: integer("base_price").notNull(),
});

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: serial("id").primaryKey(),
    playerId: varchar("player_id", { length: 20 })
      .notNull()
      .references(() => players.userId),
    itemType: varchar("item_type", { length: 32 }).notNull(),
    quantity: integer("quantity").notNull().default(0),
    storageType: varchar("storage_type", { length: 10 }).notNull(), // "cargo" or "station"
    systemId: integer("system_id").references(() => systems.id), // null for cargo, set for station
  },
  (table) => [
    uniqueIndex("inventory_unique_idx").on(
      table.playerId,
      table.itemType,
      table.storageType,
      table.systemId
    ),
    index("inventory_player_storage_idx").on(
      table.playerId,
      table.storageType
    ),
  ]
);
