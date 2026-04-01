import {
  pgTable,
  varchar,
  integer,
  smallint,
  serial,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { players } from "./players.js";

/**
 * Ship catalog — each row defines a ship class players can buy.
 * Adding a new ship = inserting a row here. No code changes needed.
 */
export const shipTypes = pgTable("ship_types", {
  key: varchar("key", { length: 32 }).primaryKey(),
  displayName: varchar("display_name", { length: 64 }).notNull(),
  description: varchar("description", { length: 256 }),
  tier: smallint("tier").notNull().default(0),
  price: integer("price").notNull().default(0),
  moduleSlots: smallint("module_slots").notNull().default(3),
  /** ModifierSource JSON — ship base stat bonuses */
  modifiers: jsonb("modifiers").notNull().default({}),
  emoji: varchar("emoji", { length: 64 }),
});

/**
 * Module catalog — each row defines a module type players can buy and fit.
 * Adding a new module = inserting a row here.
 */
export const moduleTypes = pgTable("module_types", {
  key: varchar("key", { length: 32 }).primaryKey(),
  displayName: varchar("display_name", { length: 64 }).notNull(),
  description: varchar("description", { length: 256 }),
  category: varchar("category", { length: 20 }).notNull(), // laser, scanner, cargo, utility
  tier: smallint("tier").notNull().default(1),
  price: integer("price").notNull().default(0),
  /** ModifierSource JSON — per-copy stat bonuses */
  modifiers: jsonb("modifiers").notNull().default({}),
  emoji: varchar("emoji", { length: 64 }),
});

/**
 * Player's current ship — one row per player (PK on playerId).
 * No row = starter_ship defaults.
 */
export const playerShips = pgTable("player_ships", {
  playerId: varchar("player_id", { length: 20 })
    .primaryKey()
    .references(() => players.userId),
  shipKey: varchar("ship_key", { length: 32 })
    .notNull()
    .references(() => shipTypes.key),
  equippedAt: timestamp("equipped_at").notNull().defaultNow(),
});

/**
 * Fitted modules — one row per occupied slot.
 * Unique on (playerId, slotIndex) to enforce one module per slot.
 */
export const playerModules = pgTable(
  "player_modules",
  {
    id: serial("id").primaryKey(),
    playerId: varchar("player_id", { length: 20 })
      .notNull()
      .references(() => players.userId),
    slotIndex: smallint("slot_index").notNull(),
    moduleKey: varchar("module_key", { length: 32 })
      .notNull()
      .references(() => moduleTypes.key),
    equippedAt: timestamp("equipped_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("player_modules_slot_idx").on(table.playerId, table.slotIndex),
    index("player_modules_player_idx").on(table.playerId),
  ]
);

/**
 * Module inventory — owned but not fitted modules.
 * quantity tracks how many copies the player has in inventory (unfitted).
 */
export const playerModuleInventory = pgTable(
  "player_module_inventory",
  {
    id: serial("id").primaryKey(),
    playerId: varchar("player_id", { length: 20 })
      .notNull()
      .references(() => players.userId),
    moduleKey: varchar("module_key", { length: 32 })
      .notNull()
      .references(() => moduleTypes.key),
    quantity: integer("quantity").notNull().default(1),
  },
  (table) => [
    uniqueIndex("player_module_inv_idx").on(table.playerId, table.moduleKey),
    index("player_module_inv_player_idx").on(table.playerId),
  ]
);
