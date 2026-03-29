import {
  pgTable,
  varchar,
  integer,
  bigint,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { systems } from "./systems.js";

export const npcSellLedger = pgTable(
  "npc_sell_ledger",
  {
    systemId: integer("system_id")
      .notNull()
      .references(() => systems.id),
    itemType: varchar("item_type", { length: 32 }).notNull(),
    totalSold: bigint("total_sold", { mode: "number" }).notNull().default(0),
    lastSoldAt: timestamp("last_sold_at"),
  },
  (table) => [primaryKey({ columns: [table.systemId, table.itemType] })]
);
