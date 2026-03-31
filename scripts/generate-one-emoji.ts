import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OUT_DIR = path.join(import.meta.dirname, "..", "assets", "emoji");
fs.mkdirSync(OUT_DIR, { recursive: true });

const STYLE =
  "Pixel art game icon, single item filling most of the frame on a transparent background, " +
  "thick 2-3 pixel white outline border around the entire item like a classic pixel art sprite outline, no frame, no padding, vibrant colors, the item should be large and fill at least 80% of the image.";

console.log("🎨 Generating iron_ore...");
const response = await openai.images.generate({
  model: "gpt-image-1",
  prompt: `${STYLE} a chunk of rough dark iron ore with metallic grey streaks`,
  n: 1,
  size: "1024x1024",
  background: "transparent",
  output_format: "png",
});

const b64 = response.data[0].b64_json;
if (!b64) throw new Error("No image data");
fs.writeFileSync(path.join(OUT_DIR, "iron_ore.png"), Buffer.from(b64, "base64"));
console.log("✅ iron_ore.png saved to assets/emoji/");
