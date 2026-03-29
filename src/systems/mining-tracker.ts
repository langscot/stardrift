import { type TextChannel, MessageFlags } from "discord.js";
import { miningResultDisplay } from "../ui/mining.js";
import { config } from "../config.js";

interface MiningDisplayData {
  itemDisplayName: string;
  quantity: number;
  cargoUsed: number;
  cargoCapacity: number;
  isProxy?: boolean;
  showButtons?: boolean;
  ownerUserId?: string;
  channelType?: string;
  referenceId?: number | null;
  cooldownSeconds?: number;
}

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

interface TrackedMessage {
  messageId: string;
  channelId: string;
  timer: NodeJS.Timeout;
}

/** channelId:userId -> tracked message */
const tracked = new Map<string, TrackedMessage>();

function key(channelId: string, userId: string) {
  return `${channelId}:${userId}`;
}

export function getTrackedMessageId(
  channelId: string,
  userId: string
): string | null {
  return tracked.get(key(channelId, userId))?.messageId ?? null;
}

/**
 * Store a message reference and start/reset the 2-minute inactivity timer.
 * When the timer fires the message is deleted from Discord and the entry is removed.
 */
export function trackMessage(
  channelId: string,
  userId: string,
  messageId: string,
  channel: TextChannel
): void {
  const k = key(channelId, userId);
  const existing = tracked.get(k);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(async () => {
    tracked.delete(k);
    try {
      const msg = await channel.messages.fetch(messageId);
      await msg.delete();
    } catch {
      // message already gone — ignore
    }
  }, INACTIVITY_TIMEOUT_MS);

  tracked.set(k, { messageId, channelId, timer });
}

export function clearTrackedMessage(
  channelId: string,
  userId: string
): void {
  const k = key(channelId, userId);
  const existing = tracked.get(k);
  if (existing) {
    clearTimeout(existing.timer);
    tracked.delete(k);
  }
}

/**
 * Tick down the "Ready in Xs" button label every second, then re-enable the button.
 * Edits the Discord message once per second during the cooldown.
 */
/**
 * After a mine, count down the cooldown then re-enable the button.
 * When MINING_COOLDOWN_COUNTDOWN is true, edits every second to show a live timer.
 * When false, waits the full duration then does a single edit.
 */
export function startCooldownCountdown(
  channel: TextChannel,
  messageId: string,
  cooldownSeconds: number,
  displayData: MiningDisplayData
): void {
  if (!config.MINING_COOLDOWN_COUNTDOWN) {
    // Single edit after the full cooldown
    setTimeout(async () => {
      try {
        const msg = await channel.messages.fetch(messageId);
        await msg.edit({
          components: [miningResultDisplay(displayData)],
          flags: MessageFlags.IsComponentsV2 as number,
        });
      } catch {
        // Message was deleted — ignore
      }
    }, cooldownSeconds * 1000);
    return;
  }

  let remaining = cooldownSeconds;

  const interval = setInterval(async () => {
    remaining--;
    try {
      const msg = await channel.messages.fetch(messageId);
      if (remaining <= 0) {
        clearInterval(interval);
        await msg.edit({
          components: [miningResultDisplay(displayData)],
          flags: MessageFlags.IsComponentsV2 as number,
        });
      } else {
        await msg.edit({
          components: [miningResultDisplay({ ...displayData, cooldownSeconds: remaining })],
          flags: MessageFlags.IsComponentsV2 as number,
        });
      }
    } catch {
      clearInterval(interval);
    }
  }, 1000);
}
