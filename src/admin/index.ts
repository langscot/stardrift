import { config } from "../config.js";
import {
  hasElevatedSession,
  getElevatedSessionTTL,
} from "../redis/admin.js";

/** Returns true if the Discord user ID is a configured admin. */
export function isAdmin(userId: string): boolean {
  return config.ADMIN_USER_IDS.includes(userId);
}

/** Returns true if the admin has an active elevated (sudo) session. */
export async function isElevated(userId: string): Promise<boolean> {
  if (!isAdmin(userId)) return false;
  return hasElevatedSession(userId);
}

/** Returns remaining seconds on the elevated session, or 0 if none. */
export async function elevatedSessionTTL(userId: string): Promise<number> {
  return Math.max(0, await getElevatedSessionTTL(userId));
}
