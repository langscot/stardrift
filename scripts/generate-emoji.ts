/**
 * Generate Discord emoji images for each item type using OpenAI DALL-E 3.
 * Usage: npx tsx scripts/generate-emoji.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ITEMS = [
  { key: "iron_ore", prompt: "a chunk of rough dark iron ore with metallic grey streaks" },
  { key: "copper_ore", prompt: "a chunk of rough copper ore with orange-brown and green patina" },
  { key: "silicon_ore", prompt: "a chunk of silicon crystal ore, dark grey with shiny facets" },
  { key: "titanium_ore", prompt: "a chunk of titanium ore, blue-tinted dark metallic rock with sharp angular edges, the item MUST be surrounded by a solid thick white 3-pixel outline border on all sides" },
  { key: "platinum_ore", prompt: "a chunk of platinum ore, dark silver rock with bright gleaming facets, must have a clear thick white pixel outline border" },
  { key: "crystal_ore", prompt: "a glowing purple crystal cluster with sharp points, magical and vibrant, the item MUST be surrounded by a solid thick white 3-pixel outline border on all sides" },
  { key: "dark_matter", prompt: "a floating orb of dark matter energy, black and purple swirling cosmic particles" },
  { key: "helium_gas", prompt: "a floating glowing orb of helium gas, wispy pale yellow cloud of luminous vapor" },
  { key: "hydrogen_gas", prompt: "a floating glowing orb of hydrogen gas, wispy light blue cloud of luminous vapor, the item MUST be surrounded by a solid thick white 3-pixel outline border on all sides" },
  { key: "ice_crystal", prompt: "a jagged ice crystal shard, pale blue and frosted white" },
];

const STYLE =
  "Pixel art game icon, single item filling most of the frame on a transparent background, " +
  "thick 2-3 pixel white outline border around the entire item like a classic pixel art sprite outline, no frame, no padding, vibrant colors, the item should be large and fill at least 80% of the image.";

const OUT_DIR = path.join(import.meta.dirname, "..", "assets", "emoji");

async function generate(item: (typeof ITEMS)[number]) {
  const outPath = path.join(OUT_DIR, `${item.key}.png`);
  if (fs.existsSync(outPath)) {
    console.log(`⏭  ${item.key} — already exists, skipping`);
    return;
  }

  console.log(`🎨 Generating ${item.key}...`);
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: `${STYLE} ${item.prompt}`,
    n: 1,
    size: "1024x1024",
    background: "transparent",
    output_format: "png",
  });

  const b64 = response.data[0].b64_json;
  if (!b64) throw new Error(`No image data for ${item.key}`);

  fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
  console.log(`✅ ${item.key} saved`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const item of ITEMS) {
    await generate(item);
  }

  console.log(`\n🎉 Done! Emoji saved to ${OUT_DIR}`);
  console.log("Upload them to your Discord server, then add the emoji IDs to your item_types table.");
}

main().catch(console.error);
