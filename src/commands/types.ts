import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
    | SlashCommandSubcommandsOnlyBuilder;
  /** If true, location-guard middleware runs before execute */
  requiresLocation?: boolean;
  /** Channel types where this command works (e.g., ["planet", "asteroid_belt"]) */
  requiresChannel?: string[];
  /** The command handler */
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
