import { Collection } from "discord.js";
import type { Command } from "./types.js";
import { setupHubCommand } from "./setup-hub.js";
import { mineCommand } from "./mine.js";
import { inventoryCommand } from "./inventory.js";
import { sellCommand } from "./sell.js";
import { travelCommand } from "./travel.js";
import { mapCommand } from "./map.js";
import { enrollCommand } from "./enroll.js";
import { addProxyCommand } from "./add-proxy.js";
import { systemsCommand } from "./systems.js";
import { menuCommand } from "./menu.js";
import { adminCommand } from "./admin.js";
import { syncCommand } from "./sync.js";
import { removeSystemCommand } from "./remove-system.js";

export const commands = new Collection<string, Command>();

function registerCommand(command: Command) {
  commands.set(command.data.name, command);
}

// Register all commands
registerCommand(setupHubCommand);
registerCommand(mineCommand);
registerCommand(inventoryCommand);
registerCommand(sellCommand);
registerCommand(travelCommand);
registerCommand(mapCommand);
registerCommand(enrollCommand);
registerCommand(addProxyCommand);
registerCommand(systemsCommand);
registerCommand(menuCommand);
registerCommand(adminCommand);
registerCommand(syncCommand);
registerCommand(removeSystemCommand);
