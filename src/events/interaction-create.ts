import { Interaction, MessageFlags } from "discord.js";
import { commands } from "../commands/index.js";
import { ensurePlayer } from "../middleware/player-ensure.js";
import { getBanReason } from "../redis/admin.js";
import { isAdmin } from "../admin/index.js";
import {
  handleVerifyButton,
  handleRegenButton,
  handleTotpModal,
} from "../admin/setup-flow.js";
import { handleSellConfirm } from "./buttons/sell-confirm.js";
import { handleSellAll } from "./buttons/sell-all.js";
import { handleTravelConfirm } from "./buttons/travel-confirm.js";
import { handleMineAgain } from "./buttons/mine-again.js";
import { handleQuickSell } from "./buttons/quick-sell.js";
import { handleMenuNav } from "./buttons/menu-nav.js";
import {
  handleProspectOverview,
  handleProspectBody,
  handleProspectSelect,
} from "./buttons/prospect-nav.js";
import { handleShopButton, handleShopSelect } from "./buttons/shop-buy.js";
import { handleLoadoutButton, handleLoadoutSelect } from "./buttons/loadout-fit.js";

// Commands that run before a player exists (setup/admin — skip ensurePlayer)
const SKIP_ENSURE_PLAYER = new Set(["setup-hub", "admin", "sync"]);

const MENU_ACTIONS = new Set([
  "menu_open",
  "menu_home",
  "menu_cargo",
  "menu_map",
  "menu_stats",
  "menu_mine",
  "menu_sell",
  "menu_travel",
  "menu_loadout",
]);

export async function handleInteractionCreate(
  interaction: Interaction
): Promise<void> {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) {
      console.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      const banReason = await getBanReason(interaction.user.id);
      if (banReason) {
        await interaction.reply({
          content: `You are banned from Stardrift. **Reason:** ${banReason}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (!SKIP_ENSURE_PLAYER.has(interaction.commandName)) {
        await ensurePlayer(interaction);
      }
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing /${interaction.commandName}:`, error);
      const content = "Something went wrong. Please try again.";
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, flags: 64 }).catch(() => {});
      } else {
        await interaction.reply({ content, flags: 64 }).catch(() => {});
      }
    }
    return;
  }

  // Handle button interactions
  if (interaction.isButton()) {
    try {
      const [action, ...args] = interaction.customId.split(":");

      switch (action) {
        case "sell_confirm":
          await handleSellConfirm(interaction, args);
          break;
        case "sell_all":
          await handleSellAll(interaction);
          break;

        case "travel_confirm":
        case "travel_start":
          await handleTravelConfirm(interaction, args);
          break;

        case "mine_again":
          await handleMineAgain(interaction);
          break;

        case "quick_sell":
          await handleQuickSell(interaction);
          break;

        case "prospect_overview":
          await handleProspectOverview(interaction, parseInt(args[0], 10));
          break;

        case "prospect_body":
          await handleProspectBody(interaction, args[0], parseInt(args[1], 10));
          break;

        case "shop_tab":
        case "shop_filter":
        case "shop_confirm_ship":
          await handleShopButton(interaction, action, args);
          break;

        case "loadout_unfit":
        case "loadout_fit_select":
          await handleLoadoutButton(interaction, action, args);
          break;

        case "admin_totp_verify":
          if (isAdmin(interaction.user.id)) {
            await handleVerifyButton(interaction);
          }
          break;

        case "admin_totp_regen":
          if (isAdmin(interaction.user.id)) {
            await handleRegenButton(interaction);
          }
          break;

        default:
          if (MENU_ACTIONS.has(action)) {
            await handleMenuNav(interaction, action);
          } else {
            console.log(`Unhandled button: ${action}`, args);
            await interaction.reply({ content: "Unknown action.", flags: 64 });
          }
      }
    } catch (error) {
      console.error("Error handling button:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: "Something went wrong.", flags: 64 })
          .catch(() => {});
      }
    }
    return;
  }

  // Handle select menu interactions
  if (interaction.isStringSelectMenu()) {
    try {
      const [action, ...args] = interaction.customId.split(":");
      if (action === "prospect_select") {
        await handleProspectSelect(interaction, parseInt(args[0], 10));
      } else if (action === "loadout_fit") {
        await handleLoadoutSelect(interaction, parseInt(args[0], 10));
      } else if (action === "shop_buy_ship_select" || action === "shop_buy_module_select") {
        await handleShopSelect(interaction, action);
      }
    } catch (error) {
      console.error("Error handling select menu:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "Something went wrong.", flags: 64 }).catch(() => {});
      }
    }
    return;
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    try {
      if (interaction.customId.startsWith("admin_totp_modal:")) {
        await handleTotpModal(interaction);
      }
    } catch (error) {
      console.error("Error handling modal:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: "Something went wrong.", flags: 64 })
          .catch(() => {});
      }
    }
    return;
  }
}
