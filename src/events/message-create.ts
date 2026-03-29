import { Message } from "discord.js";
import { config } from "../config.js";
import { askAria } from "../ai/index.js";
import { checkRateLimit } from "../redis/cooldowns.js";

const ASK_RATE_LIMIT = 2;
const ASK_RATE_WINDOW = 60;

export async function handleMessageCreate(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!config.AI_GATEWAY_API_KEY) return;
  if (!message.mentions.has(message.client.user!)) return;

  const question = message.content.replace(/<@!?\d+>/g, "").trim();

  if (!question) {
    await message.reply(
      "Need a question, pilot! Try something like: `@Aria how do I mine?`"
    );
    return;
  }

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

  if ("sendTyping" in message.channel) {
    await message.channel.sendTyping();
  }

  try {
    const response = await askAria(question);
    await message.reply(response);
  } catch (error) {
    console.error("AI Q&A error:", error);
    await message
      .reply("My navigation systems are offline right now. Try again in a moment.")
      .catch(() => {});
  }
}
