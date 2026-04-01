import type { MinedItemDisplay } from "../ui/mining.js";

export interface TrackedMiningData {
  messageId: string;
  items: MinedItemDisplay[];
  cargoUsed: number;
  cargoCapacity: number;
  isProxy?: boolean;
  ownerUserId?: string;
  channelType?: string;
  referenceId?: number | null;
  flavorText?: string;
  cooldownExpiresAt?: number;
}

/** channelId:userId -> tracked mining data */
const tracked = new Map<string, TrackedMiningData>();

function key(channelId: string, userId: string) {
  return `${channelId}:${userId}`;
}

export function getTracked(
  channelId: string,
  userId: string
): TrackedMiningData | null {
  return tracked.get(key(channelId, userId)) ?? null;
}

export function getTrackedMessageId(
  channelId: string,
  userId: string
): string | null {
  return tracked.get(key(channelId, userId))?.messageId ?? null;
}

/**
 * Store a message reference and display data so cooldown clicks can update in place.
 */
export function trackMessage(
  channelId: string,
  userId: string,
  data: TrackedMiningData
): void {
  tracked.set(key(channelId, userId), data);
}

/** No-op — kept for call-site compatibility. */
export function stopCountdown(_messageId: string): void {}
