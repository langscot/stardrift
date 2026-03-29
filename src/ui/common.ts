/**
 * Common UI helpers for Components V2 displays.
 */

import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";

/**
 * Create an error container.
 */
export function errorContainer(message: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`\u274c ${message}`)
    );
}

/**
 * Create a separator.
 */
export function separator(
  spacing: SeparatorSpacingSize = SeparatorSpacingSize.Small
): SeparatorBuilder {
  return new SeparatorBuilder().setSpacing(spacing);
}

/**
 * Star type emoji mapping.
 */
export function starEmoji(starType: string): string {
  const emojis: Record<string, string> = {
    yellow_dwarf: "\u2b50",
    red_giant: "\ud83d\udd34",
    blue_giant: "\ud83d\udd35",
    neutron_star: "\u26a1",
    black_hole: "\u26ab",
  };
  return emojis[starType] ?? "\u2b50";
}

/**
 * Planet type emoji mapping.
 */
export function planetEmoji(planetType: string): string {
  const emojis: Record<string, string> = {
    rocky: "\ud83e\udea8",
    temperate: "\ud83c\udf0d",
    gas_giant: "\ud83e\ude90",
    ice: "\u2744\ufe0f",
    barren: "\ud83c\udf11",
    volcanic: "\ud83c\udf0b",
    scorched: "\u2600\ufe0f",
  };
  return emojis[planetType] ?? "\ud83c\udf0f";
}

/**
 * Format a star type string for display.
 */
export function formatStarType(starType: string): string {
  return starType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
