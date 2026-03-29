import { generateText, type ModelMessage } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { config } from "../config.js";
import { docsContext } from "./docs-context.js";

const SYSTEM_PROMPT = `You are Aria, the AI navigator aboard every pilot's ship in Stardrift — a persistent space MMO played entirely inside Discord.

Your job is to answer player questions about the game: mechanics, commands, strategy, the universe, and how things work.

## Personality
- Friendly, knowledgeable, and concise
- Speak as a helpful shipboard AI, not a generic chatbot
- Use short paragraphs — avoid walls of text
- If you don't know something, say so honestly
- Never make up game mechanics that aren't in the documentation below
- You can offer strategic advice based on documented mechanics

## Game Documentation

${docsContext}

## Documentation Links
When answering, include a relevant link from the docs site so players can read more. Use these URLs:
- Getting Started: https://stardrift.lang.scot/getting-started
- Commands: https://stardrift.lang.scot/commands
- Mining: https://stardrift.lang.scot/mechanics/mining
- Inventory: https://stardrift.lang.scot/mechanics/inventory
- Travel: https://stardrift.lang.scot/mechanics/travel
- Trading: https://stardrift.lang.scot/mechanics/trading
- Galaxy Overview: https://stardrift.lang.scot/universe/galaxy
- Star Systems: https://stardrift.lang.scot/universe/systems
- Star Types: https://stardrift.lang.scot/universe/star-types
- Roadmap: https://stardrift.lang.scot/roadmap
Always include at least one relevant link at the end of your response. If multiple pages are relevant, include up to 3 links.

## Response Rules
- Keep responses under 1500 characters
- Use Discord markdown formatting (**bold**, \`code\`, etc.)
- If asked about features not in the docs, say you don't have info on that
- Do not help with anything unrelated to Stardrift — politely redirect`;

function clampResponse(text: string): string {
  if (text.length > 1990) {
    return text.slice(0, 1987) + "...";
  }
  return text;
}

type ModerationResult = { allowed: true } | { allowed: false; reason: "flagged" | "error" };

export async function moderateContent(text: string): Promise<ModerationResult> {
  if (!config.OPENAI_API_KEY) return { allowed: true };

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: text }),
    });

    if (!res.ok) {
      console.error("Moderation API HTTP error:", res.status, await res.text());
      return { allowed: false, reason: "error" };
    }

    const data = (await res.json()) as { results: Array<{ flagged: boolean }> };
    if (data.results[0]?.flagged) {
      return { allowed: false, reason: "flagged" };
    }
    return { allowed: true };
  } catch (error) {
    console.error("Moderation API error:", error);
    return { allowed: false, reason: "error" };
  }
}

export async function askAria(question: string, userId: string): Promise<string> {
  const { text } = await generateText({
    model: gateway(config.AI_MODEL),
    system: SYSTEM_PROMPT,
    prompt: question,
    maxOutputTokens: 500,
    experimental_telemetry: {
      isEnabled: true,
      metadata: { discordUserId: userId },
    },
  });

  return clampResponse(text);
}

export async function askAriaWithHistory(
  messages: ModelMessage[],
  userId: string
): Promise<string> {
  const { text } = await generateText({
    model: gateway(config.AI_MODEL),
    system: SYSTEM_PROMPT,
    messages,
    maxOutputTokens: 500,
    experimental_telemetry: {
      isEnabled: true,
      metadata: { discordUserId: userId },
    },
  });

  return clampResponse(text);
}
