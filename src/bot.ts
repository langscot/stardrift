import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import { handleInteractionCreate } from "./events/interaction-create.js";
import { handleMessageCreate } from "./events/message-create.js";
import { handleReady } from "./events/ready.js";

export function createBot(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once("clientReady", (readyClient) => {
    handleReady(readyClient);
  });

  client.on("interactionCreate", handleInteractionCreate);
  client.on("messageCreate", handleMessageCreate);

  return client;
}

export async function startBot(): Promise<Client> {
  const client = createBot();
  await client.login(config.DISCORD_TOKEN);
  return client;
}
