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
