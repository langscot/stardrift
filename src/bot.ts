import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import { handleInteractionCreate } from "./events/interaction-create.js";
import { handleMessageCreate } from "./events/message-create.js";
import { handleReady } from "./events/ready.js";
import { handleVoiceStateUpdate } from "./events/voice-state-update.js";

export function createBot(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  client.once("clientReady", (readyClient) => {
    handleReady(readyClient);
  });

  client.on("interactionCreate", handleInteractionCreate);
  client.on("messageCreate", handleMessageCreate);
  client.on("voiceStateUpdate", handleVoiceStateUpdate);

  return client;
}

export async function startBot(): Promise<Client> {
  const client = createBot();
  await client.login(config.DISCORD_TOKEN);
  return client;
}
