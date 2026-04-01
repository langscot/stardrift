import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { players } from "../schema.js";

export async function getPlayer(userId: string) {
  return db.query.players.findFirst({
    where: eq(players.userId, userId),
  });
}

export async function updatePlayerSystem(
  userId: string,
  systemId: number | null
) {
  await db
    .update(players)
    .set({ currentSystemId: systemId })
    .where(eq(players.userId, userId));
}

export async function addCredits(userId: string, amount: number) {
  const player = await getPlayer(userId);
  if (!player) throw new Error("Player not found");
  await db
    .update(players)
    .set({ credits: player.credits + amount })
    .where(eq(players.userId, userId));
}

export async function deductFuel(userId: string, amount: number) {
  const player = await getPlayer(userId);
  if (!player) throw new Error("Player not found");
  if (player.fuel < amount) throw new Error("Not enough fuel");
  await db
    .update(players)
    .set({ fuel: player.fuel - amount })
    .where(eq(players.userId, userId));
}

export async function deductCredits(userId: string, amount: number) {
  const player = await getPlayer(userId);
  if (!player) throw new Error("Player not found");
  if (Number(player.credits) < amount) throw new Error("Not enough credits");
  await db
    .update(players)
    .set({ credits: Number(player.credits) - amount })
    .where(eq(players.userId, userId));
}
