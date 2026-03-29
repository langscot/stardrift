import { eq, and } from "drizzle-orm";
import { db } from "../index.js";
import { adminTotpSecrets, bans } from "../schema.js";

// ── TOTP secrets ──────────────────────────────────────────────────────────────

export async function getTotpSecret(userId: string): Promise<string | null> {
  const row = await db.query.adminTotpSecrets.findFirst({
    where: eq(adminTotpSecrets.userId, userId),
  });
  return row?.secret ?? null;
}

export async function upsertTotpSecret(
  userId: string,
  secret: string
): Promise<void> {
  await db
    .insert(adminTotpSecrets)
    .values({ userId, secret })
    .onConflictDoUpdate({
      target: adminTotpSecrets.userId,
      set: { secret, createdAt: new Date() },
    });
}

// ── Bans ──────────────────────────────────────────────────────────────────────

export async function recordBan(
  playerId: string,
  bannedBy: string,
  reason?: string
): Promise<void> {
  // Deactivate any existing active ban first (idempotent)
  await db
    .update(bans)
    .set({ active: false })
    .where(and(eq(bans.playerId, playerId), eq(bans.active, true)));

  await db.insert(bans).values({ playerId, bannedBy, reason });
}

export async function recordUnban(
  playerId: string,
  unbannedBy: string
): Promise<void> {
  await db
    .update(bans)
    .set({ active: false, unbannedBy, unbannedAt: new Date() })
    .where(and(eq(bans.playerId, playerId), eq(bans.active, true)));
}

export async function getActiveBan(
  playerId: string
): Promise<{ reason: string | null; bannedBy: string } | null> {
  const row = await db.query.bans.findFirst({
    where: and(eq(bans.playerId, playerId), eq(bans.active, true)),
  });
  return row ? { reason: row.reason ?? null, bannedBy: row.bannedBy } : null;
}
