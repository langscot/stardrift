/**
 * Galaxy seed script.
 * Generates ~100,000 solar systems and inserts them into the database.
 * Run with: npm run db:seed
 */

import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "../db/schema.js";
import {
  generateSystemName,
  generateCoreCoordinate,
  generateClusterCoordinate,
  pickStarType,
  generatePlanets,
  generateBelts,
  calculateResourceRating,
  HUB_SYSTEM,
  ITEM_TYPES,
} from "../systems/galaxy.js";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

const TARGET_SYSTEMS = 100_000;
const BATCH_SIZE = 1000;
const CLUSTER_COUNT = 8;
const CLUSTER_MIN_SYSTEMS = 800;
const CLUSTER_MAX_SYSTEMS = 2000;
const CLUSTER_STD_DEV = 30;
const CLUSTER_MAX_RADIUS = 300;

async function main() {
  console.log("Starting galaxy generation...");

  // Check if systems already exist
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.systems);

  if (countResult.count > 0) {
    console.log(
      `Galaxy already has ${countResult.count} systems. Skipping generation.`
    );
    console.log("To regenerate, drop the tables and re-run migrations first.");
    await pool.end();
    return;
  }

  const usedNames = new Set<string>();
  const allSystems: Array<{
    name: string;
    x: number;
    y: number;
    starType: string;
    resourceRating: number;
    isHub: boolean;
  }> = [];

  // 1. Create the hub system
  console.log("Creating hub system: Sol Nexus");
  usedNames.add(HUB_SYSTEM.name);
  allSystems.push({
    name: HUB_SYSTEM.name,
    x: HUB_SYSTEM.x,
    y: HUB_SYSTEM.y,
    starType: HUB_SYSTEM.starType,
    resourceRating: HUB_SYSTEM.resourceRating,
    isHub: true,
  });

  // 2. Generate cluster seeds
  const clusters: Array<{ cx: number; cy: number; count: number }> = [];
  for (let i = 0; i < CLUSTER_COUNT; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const dist = 50 + Math.random() * CLUSTER_MAX_RADIUS;
    clusters.push({
      cx: Math.round(Math.cos(angle) * dist * 10) / 10,
      cy: Math.round(Math.sin(angle) * dist * 10) / 10,
      count:
        CLUSTER_MIN_SYSTEMS +
        Math.floor(Math.random() * (CLUSTER_MAX_SYSTEMS - CLUSTER_MIN_SYSTEMS)),
    });
  }

  // 3. Generate cluster systems
  let clusterTotal = 0;
  for (const cluster of clusters) {
    console.log(
      `Generating cluster at (${cluster.cx}, ${cluster.cy}) — ${cluster.count} systems`
    );
    for (let j = 0; j < cluster.count; j++) {
      const { x, y } = generateClusterCoordinate(
        cluster.cx,
        cluster.cy,
        CLUSTER_STD_DEV
      );
      const dist = Math.sqrt(x * x + y * y);
      const starType = pickStarType(dist);
      const name = generateSystemName(usedNames);
      const planetTypes = generatePlanets(name, starType).map(
        (p) => p.planetType
      );
      const resourceRating = calculateResourceRating(starType, planetTypes);

      allSystems.push({
        name,
        x,
        y,
        starType,
        resourceRating,
        isHub: false,
      });
      clusterTotal++;
    }
  }

  // 4. Fill remaining with core distribution
  const remaining = TARGET_SYSTEMS - allSystems.length;
  console.log(
    `Generated ${clusterTotal} cluster systems. Filling ${remaining} core systems...`
  );

  for (let i = 0; i < remaining; i++) {
    const { x, y } = generateCoreCoordinate();
    const dist = Math.sqrt(x * x + y * y);
    const starType = pickStarType(dist);
    const name = generateSystemName(usedNames);
    const planetTypes = generatePlanets(name, starType).map(
      (p) => p.planetType
    );
    const resourceRating = calculateResourceRating(starType, planetTypes);

    allSystems.push({
      name,
      x,
      y,
      starType,
      resourceRating,
      isHub: false,
    });

    if ((i + 1) % 10000 === 0) {
      console.log(`  ${i + 1}/${remaining} core systems generated`);
    }
  }

  console.log(`Total systems generated: ${allSystems.length}`);

  // 5. Batch insert systems
  console.log("Inserting systems...");
  for (let i = 0; i < allSystems.length; i += BATCH_SIZE) {
    const batch = allSystems.slice(i, i + BATCH_SIZE);
    await db.insert(schema.systems).values(batch);
    if ((i + BATCH_SIZE) % 10000 === 0 || i + BATCH_SIZE >= allSystems.length) {
      console.log(
        `  Inserted ${Math.min(i + BATCH_SIZE, allSystems.length)}/${allSystems.length} systems`
      );
    }
  }

  // 6. Generate and insert planets for each system
  console.log("Generating planets...");
  const systemRows = await db.select().from(schema.systems);
  const systemMap = new Map(systemRows.map((s) => [s.name, s]));

  let planetBatch: Array<{
    systemId: number;
    slot: number;
    name: string;
    planetType: string;
  }> = [];

  let beltBatch: Array<{
    systemId: number;
    name: string;
    richness: number;
  }> = [];

  for (const sys of allSystems) {
    const row = systemMap.get(sys.name);
    if (!row) continue;

    // Hub gets curated planets
    if (sys.isHub) {
      for (const p of HUB_SYSTEM.planets) {
        planetBatch.push({
          systemId: row.id,
          slot: p.slot,
          name: p.name,
          planetType: p.planetType,
        });
      }
      for (const b of HUB_SYSTEM.belts) {
        beltBatch.push({
          systemId: row.id,
          name: b.name,
          richness: b.richness,
        });
      }
    } else {
      const planets = generatePlanets(sys.name, sys.starType as any);
      for (const p of planets) {
        planetBatch.push({
          systemId: row.id,
          slot: p.slot,
          name: p.name,
          planetType: p.planetType,
        });
      }
      const belts = generateBelts(sys.name, sys.resourceRating);
      for (const b of belts) {
        beltBatch.push({
          systemId: row.id,
          name: b.name,
          richness: b.richness,
        });
      }
    }

    // Flush batches periodically
    if (planetBatch.length >= BATCH_SIZE) {
      await db.insert(schema.planets).values(planetBatch);
      planetBatch = [];
    }
    if (beltBatch.length >= BATCH_SIZE) {
      await db.insert(schema.asteroidBelts).values(beltBatch);
      beltBatch = [];
    }
  }

  // Final flush
  if (planetBatch.length > 0) {
    await db.insert(schema.planets).values(planetBatch);
  }
  if (beltBatch.length > 0) {
    await db.insert(schema.asteroidBelts).values(beltBatch);
  }

  // 7. Seed item types
  console.log("Seeding item types...");
  await db
    .insert(schema.itemTypes)
    .values(ITEM_TYPES)
    .onConflictDoNothing();

  // 8. Summary
  const [sysCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.systems);
  const [planetCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.planets);
  const [beltCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.asteroidBelts);
  const [itemCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.itemTypes);

  console.log("\n=== Galaxy Generation Complete ===");
  console.log(`Systems:        ${sysCount.count}`);
  console.log(`Planets:        ${planetCount.count}`);
  console.log(`Asteroid Belts: ${beltCount.count}`);
  console.log(`Item Types:     ${itemCount.count}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Galaxy generation failed:", err);
  process.exit(1);
});
