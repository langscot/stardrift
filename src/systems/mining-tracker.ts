import { type TextChannel, MessageFlags } from "discord.js";
import { miningResultDisplay, type MinedItemDisplay } from "../ui/mining.js";
import { config } from "../config.js";

interface MiningDisplayData {
  items: MinedItemDisplay[];
  cargoUsed: number;
  cargoCapacity: number;
  isProxy?: boolean;
  showButtons?: boolean;
  ownerUserId?: string;
  channelType?: string;
  referenceId?: number | null;
  cooldownSeconds?: number;
  flavorText?: string;
}

/** channelId:userId -> tracked messageId */
const tracked = new Map<string, string>();

/** messageId -> active countdown interval (so we can cancel it) */
const countdowns = new Map<string, ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>>();

function key(channelId: string, userId: string) {
  return `${channelId}:${userId}`;
}

export function getTrackedMessageId(
  channelId: string,
  userId: string
): string | null {
  return tracked.get(key(channelId, userId)) ?? null;
}

/**
 * Store a message reference so subsequent mines update the same message in place.
 */
export function trackMessage(
  channelId: string,
  userId: string,
  messageId: string
): void {
  tracked.set(key(channelId, userId), messageId);
}

/**
 * Cancel any running cooldown countdown for a message.
 * Call this before overwriting a tracked mining message with different content.
 */
export function stopCountdown(messageId: string): void {
  const timer = countdowns.get(messageId);
  if (timer != null) {
    clearInterval(timer as ReturnType<typeof setInterval>);
    clearTimeout(timer as ReturnType<typeof setTimeout>);
    countdowns.delete(messageId);
  }
}

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
  // Cancel any existing countdown for this message
  stopCountdown(messageId);

  if (!config.MINING_COOLDOWN_COUNTDOWN) {
    // Single edit after the full cooldown
    const timeout = setTimeout(async () => {
      countdowns.delete(messageId);
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
    countdowns.set(messageId, timeout);
    return;
  }

  let remaining = cooldownSeconds;

  const interval = setInterval(async () => {
    remaining--;
    try {
      const msg = await channel.messages.fetch(messageId);
      if (remaining <= 0) {
        clearInterval(interval);
        countdowns.delete(messageId);
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
      countdowns.delete(messageId);
    }
  }, 1000);
  countdowns.set(messageId, interval);
}
