import { Message } from "discord.js";
import type { ModelMessage } from "ai";
import { config } from "../config.js";
import { askAria, askAriaWithHistory, moderateContent } from "../ai/index.js";
import { checkRateLimit } from "../redis/cooldowns.js";
import { isAdmin } from "../admin/index.js";
import { getBanReason } from "../redis/admin.js";

const ASK_RATE_LIMIT = 2;
const ASK_RATE_WINDOW = 60;
const HISTORY_FETCH_LIMIT = 20;

export async function handleMessageCreate(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!config.AI_GATEWAY_API_KEY) return;

  const isAriaChannel =
    config.ARIA_CHANNEL_ID && message.channelId === config.ARIA_CHANNEL_ID;
  const isMention = message.mentions.has(message.client.user!);

  if (!isAriaChannel && !isMention) return;

  const question = message.content.replace(/<@!?\d+>/g, "").trim();

  if (!question) {
    await message.reply(
      "Need a question, pilot! Try something like: `@Aria how do I mine?`"
    );
    return;
  }

  // Banned players cannot use Aria
  const banReason = await getBanReason(message.author.id);
  if (banReason) {
    await message.reply(`You are banned from Stardrift. **Reason:** ${banReason}`);
    return;
  }

  // Admins bypass the rate limit entirely
  if (!isAdmin(message.author.id)) {
    const rateCheck = await checkRateLimit(
      message.author.id,
      "ask",
      ASK_RATE_LIMIT,
      ASK_RATE_WINDOW
    );

    if (!rateCheck.allowed) {
      await message.reply(
        `Slow down, pilot! You can ask me ${ASK_RATE_LIMIT} questions per minute. Try again in ${rateCheck.retryAfterSeconds}s.`
      );
      return;
    }
  }

  const moderation = await moderateContent(question);
  if (!moderation.allowed) {
    const reply =
      moderation.reason === "flagged"
        ? "That question isn't something I can help with, pilot. Keep it on-topic and respectful."
        : "My safety systems are offline right now. Try again in a moment.";
    await message.reply(reply);
    return;
  }

  if ("sendTyping" in message.channel) {
    await message.channel.sendTyping();
  }

  try {
    let response: string;

    if (isAriaChannel) {
      const history = await buildChannelHistory(message);
      response = await askAriaWithHistory(history, message.author.id);
    } else {
      response = await askAria(question, message.author.id);
    }

    await message.reply(response);
  } catch (error) {
    console.error("AI Q&A error:", error);
    await message
      .reply(
        "My navigation systems are offline right now. Try again in a moment."
      )
      .catch(() => {});
  }
}

async function buildChannelHistory(
  message: Message
): Promise<ModelMessage[]> {
  const botId = message.client.user!.id;
  const fetched = await message.channel.messages.fetch({
    limit: HISTORY_FETCH_LIMIT,
    before: message.id,
  });

  const history: ModelMessage[] = [];

  // Messages come newest-first, reverse for chronological order
  for (const msg of [...fetched.values()].reverse()) {
    if (msg.author.id === botId) {
      history.push({ role: "assistant", content: msg.content });
    } else if (!msg.author.bot) {
      history.push({
        role: "user",
        content: msg.content.replace(/<@!?\d+>/g, "").trim(),
      });
    }
  }

  // Add the current message
  history.push({
    role: "user",
    content: message.content.replace(/<@!?\d+>/g, "").trim(),
  });

  return history;
}
