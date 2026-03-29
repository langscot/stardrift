/**
 * Economy system — NPC price fluctuation.
 */

import { getNpcPrice } from "../db/queries/market.js";

export interface PriceInfo {
  itemType: string;
  displayName: string;
  currentPrice: number;
  basePrice: number;
  ratio: number; // currentPrice / basePrice
}

/**
 * Get price info for an item at a system, including how it compares to base.
 */
export async function getPriceInfo(
  systemId: number,
  itemType: string,
  displayName: string,
  basePrice: number
): Promise<PriceInfo> {
  const currentPrice = await getNpcPrice(systemId, itemType);
  return {
    itemType,
    displayName,
    currentPrice,
    basePrice,
    ratio: currentPrice / basePrice,
  };
}

/**
 * Get a price indicator emoji based on ratio.
 */
export function priceIndicator(ratio: number): string {
  if (ratio >= 0.9) return "\ud83d\udfe2"; // Green circle
  if (ratio >= 0.6) return "\ud83d\udfe1"; // Yellow circle
  return "\ud83d\udd34"; // Red circle
}
