import { REST, Routes } from "discord.js";
import { config } from "./config.js";

// Import commands to trigger registration
import { commands } from "./commands/index.js";

async function deploy() {
  const rest = new REST().setToken(config.DISCORD_TOKEN);

  const commandData = commands.map((cmd) => cmd.data.toJSON());

  console.log(`Registering ${commandData.length} commands...`);

  if (config.DISCORD_DEV_GUILD_ID) {
    // Guild commands (instant, for development)
    await rest.put(
      Routes.applicationGuildCommands(
        config.DISCORD_CLIENT_ID,
        config.DISCORD_DEV_GUILD_ID
      ),
      { body: commandData }
    );
    console.log(`Registered ${commandData.length} guild commands (dev guild)`);
  } else {
    // Global commands (takes up to an hour to propagate)
    await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), {
      body: commandData,
    });
    console.log(`Registered ${commandData.length} global commands`);
  }
}

deploy().catch(console.error);
