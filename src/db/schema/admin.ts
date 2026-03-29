import {
  pgTable,
  varchar,
  text,
  timestamp,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import { players } from "./players.js";

/** Stores per-admin TOTP secrets for privilege escalation. */
export const adminTotpSecrets = pgTable("admin_totp_secrets", {
  userId: varchar("user_id", { length: 20 }).primaryKey(),
  secret: text("secret").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Full audit log of all bans and unbans. */
export const bans = pgTable("bans", {
  id: serial("id").primaryKey(),
  playerId: varchar("player_id", { length: 20 })
    .notNull()
    .references(() => players.userId),
  bannedBy: varchar("banned_by", { length: 20 }).notNull(),
  reason: text("reason"),
  bannedAt: timestamp("banned_at").notNull().defaultNow(),
  active: boolean("active").notNull().default(true),
  unbannedBy: varchar("unbanned_by", { length: 20 }),
  unbannedAt: timestamp("unbanned_at"),
});
