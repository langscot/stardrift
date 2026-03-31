"""
Post-process generated emoji images:
1. Replace near-black background with transparency
2. Crop to content bounding box
3. Pad to square and resize to 128x128

Usage: .venv/bin/python scripts/process-emoji.py [file.png ...]
       If no files given, processes all PNGs in assets/emoji/
"""
import sys
from pathlib import Path
from PIL import Image

ASSETS_DIR = Path(__file__).parent.parent / "assets" / "emoji"
OUTPUT_SIZE = 128
# Threshold: any pixel with R, G, B all below this is treated as background
BG_THRESHOLD = 30
# Padding as fraction of final size (so the item doesn't touch the edges)
PADDING_FRACTION = 0.08


def process(filepath: Path) -> None:
    img = Image.open(filepath).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    # Replace near-black pixels with transparent
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r < BG_THRESHOLD and g < BG_THRESHOLD and b < BG_THRESHOLD:
                pixels[x, y] = (0, 0, 0, 0)

    # Crop to content bounding box
    bbox = img.getbbox()
    if not bbox:
        print(f"  ⚠ {filepath.name}: image is entirely background, skipping")
        return
    img = img.crop(bbox)

    # Pad to square
    w, h = img.size
    side = max(w, h)
    padding = int(side * PADDING_FRACTION)
    canvas_size = side + padding * 2
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset_x = (canvas_size - w) // 2
    offset_y = (canvas_size - h) // 2
    canvas.paste(img, (offset_x, offset_y))

    # Resize to output size
    canvas = canvas.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS)

    canvas.save(filepath)
    print(f"  ✅ {filepath.name} processed")


def main() -> None:
    if len(sys.argv) > 1:
        files = [Path(f) for f in sys.argv[1:]]
    else:
        files = sorted(ASSETS_DIR.glob("*.png"))

    if not files:
        print("No PNG files found")
        return

    print(f"Processing {len(files)} emoji...")
    for f in files:
        process(f)
    print("Done!")


if __name__ == "__main__":
    main()
