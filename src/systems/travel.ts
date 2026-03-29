/**
 * Travel system — distance, fuel cost, travel time calculations.
 */

import { config } from "../config.js";

export interface TravelCalc {
  distance: number; // Light-years
  fuelCost: number;
  travelTimeSeconds: number;
  travelTimeDisplay: string;
}

/**
 * Calculate travel parameters between two systems.
 */
export function calculateTravel(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): TravelCalc {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const roundedDist = Math.round(distance * 10) / 10;

  const fuelCost = Math.max(1, Math.ceil(roundedDist * config.FUEL_PER_LY));
  const travelTimeSeconds = Math.max(
    30, // Minimum 30 seconds
    Math.round(roundedDist * config.SECONDS_PER_LY)
  );

  return {
    distance: roundedDist,
    fuelCost,
    travelTimeSeconds,
    travelTimeDisplay: formatDuration(travelTimeSeconds),
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
