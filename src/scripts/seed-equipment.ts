/**
 * Seed script — populates ship_types, module_types, and new item_types.
 * Run with: npx tsx src/scripts/seed-equipment.ts
 */

import { db, pool } from "../db/index.js";
import { shipTypes, moduleTypes, itemTypes } from "../db/schema.js";

async function seed() {
  console.log("Seeding equipment catalog...");

  // ── Ship Types ──
  const ships = [
    {
      key: "starter_ship",
      displayName: "Starter Ship",
      description: "A basic vessel. Gets the job done.",
      tier: 0,
      price: 0,
      moduleSlots: 3,
      modifiers: {},
      emoji: "🚀",
    },
    {
      key: "mining_barge",
      displayName: "Mining Barge",
      description: "Built for extraction. Slower but mines more.",
      tier: 1,
      price: 50000,
      moduleSlots: 4,
      modifiers: { yieldMultiplier: 1.1, cooldownMultiplier: 0.9 },
      emoji: "⛏️",
    },
    {
      key: "heavy_miner",
      displayName: "Heavy Miner",
      description: "Industrial-grade extraction platform. Maximum yield.",
      tier: 2,
      price: 150000,
      moduleSlots: 5,
      modifiers: { yieldMultiplier: 1.2, cooldownMultiplier: 0.85, cargoBonus: 500 },
      emoji: "🏗️",
    },
    {
      key: "explorer_vessel",
      displayName: "Explorer Vessel",
      description: "Tuned for rare discoveries in deep space.",
      tier: 1,
      price: 40000,
      moduleSlots: 3,
      modifiers: { rareEventChance: 0.05, fuelCapacityBonus: 50 },
      emoji: "🔭",
    },
    {
      key: "freighter",
      displayName: "Freighter",
      description: "Massive cargo hold, but sluggish mining output.",
      tier: 1,
      price: 60000,
      moduleSlots: 4,
      modifiers: { cargoBonus: 2000, yieldMultiplier: 0.9 },
      emoji: "🚢",
    },
  ];

  for (const ship of ships) {
    await db
      .insert(shipTypes)
      .values(ship)
      .onConflictDoUpdate({
        target: shipTypes.key,
        set: {
          displayName: ship.displayName,
          description: ship.description,
          tier: ship.tier,
          price: ship.price,
          moduleSlots: ship.moduleSlots,
          modifiers: ship.modifiers,
          emoji: ship.emoji,
        },
      });
  }
  console.log(`  ✓ ${ships.length} ship types`);

  // ── Module Types ──
  const modules = [
    {
      key: "mk1_laser",
      displayName: "Mk1 Laser",
      description: "Standard mining laser. A modest improvement.",
      category: "laser",
      tier: 1,
      price: 2000,
      modifiers: { yieldMultiplier: 1.08 },
      emoji: "⚡",
    },
    {
      key: "mk2_laser",
      displayName: "Mk2 Laser",
      description: "Improved extraction beam. Stack for higher yields.",
      category: "laser",
      tier: 2,
      price: 8000,
      modifiers: { yieldMultiplier: 1.15 },
      emoji: "⚡",
    },
    {
      key: "mk3_laser",
      displayName: "Mk3 Laser",
      description: "Military-grade mining laser. Cuts through anything.",
      category: "laser",
      tier: 3,
      price: 30000,
      modifiers: { yieldMultiplier: 1.25, extraDropChance: 0.03 },
      emoji: "⚡",
    },
    {
      key: "survey_scanner",
      displayName: "Survey Scanner",
      description: "Detects rare deposits and anomalies while mining.",
      category: "scanner",
      tier: 1,
      price: 3000,
      modifiers: { rareWeightBonus: 3, rareEventChance: 0.03 },
      emoji: "📡",
    },
    {
      key: "deep_scanner",
      displayName: "Deep Scanner",
      description: "Advanced sensor array. Finds what others miss.",
      category: "scanner",
      tier: 2,
      price: 15000,
      modifiers: { rareWeightBonus: 5, rareEventChance: 0.07 },
      emoji: "📡",
    },
    {
      key: "cargo_expander",
      displayName: "Cargo Expander",
      description: "Expands your ship's cargo capacity.",
      category: "cargo",
      tier: 1,
      price: 3000,
      modifiers: { cargoBonus: 300 },
      emoji: "📦",
    },
    {
      key: "cargo_expander_mk2",
      displayName: "Cargo Expander Mk2",
      description: "Heavy-duty cargo expansion module.",
      category: "cargo",
      tier: 2,
      price: 12000,
      modifiers: { cargoBonus: 800 },
      emoji: "📦",
    },
    {
      key: "rapid_cycle",
      displayName: "Rapid Cycle",
      description: "Reduces mining cooldown between operations.",
      category: "utility",
      tier: 1,
      price: 5000,
      modifiers: { cooldownMultiplier: 0.92 },
      emoji: "🔧",
    },
    {
      key: "rapid_cycle_mk2",
      displayName: "Rapid Cycle Mk2",
      description: "Advanced cycling module. Significantly faster mining.",
      category: "utility",
      tier: 2,
      price: 20000,
      modifiers: { cooldownMultiplier: 0.85 },
      emoji: "🔧",
    },
  ];

  for (const mod of modules) {
    await db
      .insert(moduleTypes)
      .values(mod)
      .onConflictDoUpdate({
        target: moduleTypes.key,
        set: {
          displayName: mod.displayName,
          description: mod.description,
          category: mod.category,
          tier: mod.tier,
          price: mod.price,
          modifiers: mod.modifiers,
          emoji: mod.emoji,
        },
      });
  }
  console.log(`  ✓ ${modules.length} module types`);

  // ── New Item Types (for rare events) ──
  const newItems = [
    {
      key: "anomaly_fragment",
      displayName: "Anomaly Fragment",
      category: "ore",
      basePrice: 120,
    },
    {
      key: "ancient_relic",
      displayName: "Ancient Relic",
      category: "ore",
      basePrice: 500,
    },
  ];

  for (const item of newItems) {
    await db
      .insert(itemTypes)
      .values(item)
      .onConflictDoUpdate({
        target: itemTypes.key,
        set: {
          displayName: item.displayName,
          category: item.category,
          basePrice: item.basePrice,
        },
      });
  }
  console.log(`  ✓ ${newItems.length} new item types`);

  console.log("Done!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
