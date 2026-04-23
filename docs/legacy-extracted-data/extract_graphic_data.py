import json
import math
from collections import Counter, deque
from pathlib import Path

from PIL import Image


ROOT = Path(r"C:\Codex\acs-dsk-analysis")
OUT_ROOT = ROOT / "extracted-data"
LEGACY_ROOT = Path(r"H:\My Drive\Repos\ACS\legacy ACS")
LAND_DISK = ROOT / "disks" / "ACS-Land of Adventuria.dsk"
LAND_IMPORT = OUT_ROOT / "adventures" / "land-of-aventuria" / "import-prep"
RIVERS_IMPORT = OUT_ROOT / "adventures" / "rivers-of-light" / "import-prep"


def hex_color(rgba):
    r, g, b, a = rgba
    return f"#{r:02x}{g:02x}{b:02x}{a:02x}"


def rel_path(path):
    return str(path).replace("\\", "/")


def quantized_rows(image, palette_limit=12):
    rgba = image.convert("RGBA")
    counts = Counter(rgba.getdata())
    palette = [color for color, _ in counts.most_common(palette_limit)]
    index = {color: i for i, color in enumerate(palette)}
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    rows = []
    for y in range(rgba.height):
        row = []
        for x in range(rgba.width):
            color = rgba.getpixel((x, y))
            if color not in index:
                nearest = min(
                    range(len(palette)),
                    key=lambda i: sum((color[c] - palette[i][c]) ** 2 for c in range(4)),
                )
            else:
                nearest = index[color]
            row.append(chars[nearest])
        rows.append("".join(row))
    return {
        "width": rgba.width,
        "height": rgba.height,
        "palette": [{"index": i, "char": chars[i], "rgba": hex_color(c)} for i, c in enumerate(palette)],
        "rows": rows,
    }


def connected_icon_components(path):
    image = Image.open(path).convert("RGBA")
    pixels = image.load()
    w, h = image.size
    edge_pixels = []
    for x in range(w):
        edge_pixels.append(pixels[x, 0])
        edge_pixels.append(pixels[x, h - 1])
    for y in range(h):
        edge_pixels.append(pixels[0, y])
        edge_pixels.append(pixels[w - 1, y])
    background = Counter(edge_pixels).most_common(1)[0][0]

    def non_bg(x, y):
        r, g, b, a = pixels[x, y]
        br, bg, bb, ba = background
        return a > 0 and (abs(r - br) + abs(g - bg) + abs(b - bb) + abs(a - ba)) > 35

    column_counts = [sum(1 for y in range(h) if non_bg(x, y)) for x in range(w)]
    clusters = []
    in_span = False
    for x, count in enumerate(column_counts):
        if count > 2 and not in_span:
            start = x
            in_span = True
        if (count <= 2 or x == w - 1) and in_span:
            end = x - 1 if count <= 2 else x
            ys = [y for cx in range(start, end + 1) for y in range(h) if non_bg(cx, y)]
            if ys:
                non_background = sum(column_counts[start : end + 1])
                clusters.append((start, min(ys), end, max(ys), non_background))
            in_span = False

    clusters = [c for c in clusters if (c[2] - c[0] + 1) >= 8 and (c[3] - c[1] + 1) >= 8]
    records = []
    labels = [
        ("sprite_player_blue", "Blue player/adventurer", "entity"),
        ("sprite_wizard_gray", "Gray wizard/humanoid", "entity"),
        ("sprite_wand", "Magic wand", "item"),
        ("sprite_door_house", "Door or house", "tile"),
        ("sprite_ghost", "Ghost", "entity"),
        ("sprite_ring", "Ring", "item"),
        ("sprite_tree", "Tree", "tile"),
        ("sprite_chest", "Treasure chest", "item"),
        ("sprite_creature_gold", "Gold creature", "entity"),
    ]
    for i, cluster in enumerate(clusters[: len(labels)]):
        x1, y1, x2, y2, count = cluster
        crop = image.crop((x1, y1, x2 + 1, y2 + 1))
        sprite_id, name, usage = labels[i]
        records.append(
            {
                "id": sprite_id,
                "name": name,
                "usage": usage,
                "sourceImage": rel_path(path),
                "sourceBounds": {"x": x1, "y": y1, "width": x2 - x1 + 1, "height": y2 - y1 + 1},
                "nonBackgroundPixels": count,
                "pixelMatrix": quantized_rows(crop),
                "confidence": "image-derived-connected-component",
            }
        )
    return {
        "sourceImage": rel_path(path),
        "sourceSize": {"width": w, "height": h},
        "background": hex_color(background),
        "sprites": records,
        "unlabeledComponentCount": max(0, len(clusters) - len(records)),
    }


def screenshot_grid(path, grid_w=40, grid_h=25):
    image = Image.open(path).convert("RGBA")
    w, h = image.size
    counts = Counter(image.getdata())
    palette = [color for color, _ in counts.most_common(8)]
    chars = " .:#@ABCDEFG"
    rows = []
    for gy in range(grid_h):
        row = []
        y1 = int(gy * h / grid_h)
        y2 = int((gy + 1) * h / grid_h)
        for gx in range(grid_w):
            x1 = int(gx * w / grid_w)
            x2 = int((gx + 1) * w / grid_w)
            block = image.crop((x1, y1, x2, y2))
            color = Counter(block.getdata()).most_common(1)[0][0]
            idx = min(range(len(palette)), key=lambda i: sum((color[c] - palette[i][c]) ** 2 for c in range(4)))
            row.append(chars[idx])
        rows.append("".join(row))
    return {
        "sourceImage": rel_path(path),
        "sourceSize": {"width": w, "height": h},
        "sampleGrid": {"width": grid_w, "height": grid_h, "rows": rows},
        "palette": [{"index": i, "char": chars[i], "rgba": hex_color(c), "count": counts[c]} for i, c in enumerate(palette)],
        "confidence": "screenshot-derived-layout-reference",
    }


def entropy(data):
    counts = Counter(data)
    total = len(data)
    return -sum((n / total) * math.log2(n / total) for n in counts.values())


def bit_preview(data, width=28, height=16):
    bits = []
    for byte in data:
        for bit in range(7):
            bits.append("#" if byte & (1 << bit) else ".")
    rows = []
    for y in range(height):
        start = y * width
        rows.append("".join(bits[start : start + width]).ljust(width, "."))
    return rows


def raw_graphic_candidates(path):
    raw = path.read_bytes()
    records = []
    for offset in range(0, len(raw) - 256, 256):
        block = raw[offset : offset + 256]
        printable = sum(32 <= b <= 126 or 160 <= b <= 254 for b in block) / len(block)
        zeroish = block.count(0) / len(block)
        ent = entropy(block)
        if 2.5 <= ent <= 6.6 and printable < 0.62 and zeroish < 0.35:
            records.append(
                {
                    "offset": offset,
                    "offsetHex": f"0x{offset:05x}",
                    "length": 256,
                    "entropy": round(ent, 3),
                    "printableRatio": round(printable, 3),
                    "zeroRatio": round(zeroish, 3),
                    "first64BytesHex": block[:64].hex(" "),
                    "sevenBitPreview28x16": bit_preview(block),
                    "interpretation": "candidate packed image/sprite/map bytes; not yet proven original ACS graphic table",
                }
            )
    records.sort(key=lambda r: (abs(r["entropy"] - 4.2), r["printableRatio"]))
    return {
        "sourceDisk": rel_path(path),
        "method": "256-byte scan for non-text, non-empty medium-entropy blocks with 7-bit Apple II preview rows",
        "candidateCount": len(records),
        "topCandidates": records[:80],
    }


def main():
    LAND_IMPORT.mkdir(parents=True, exist_ok=True)
    RIVERS_IMPORT.mkdir(parents=True, exist_ok=True)
    icon_data = connected_icon_components(LEGACY_ROOT / "Game Play images" / "icons.GIF")

    map_sources = [
        ("map_of_aventuria", LEGACY_ROOT / "Game Play images" / "stuart-smiths-adventure-construction-set_17.png"),
        ("country_lane", LEGACY_ROOT / "Game Play images" / "stuart-smiths-adventure-construction-set_20.png"),
        ("farm", LEGACY_ROOT / "Game Play images" / "stuart-smiths-adventure-construction-set_21.png"),
        ("hess_barracks", LEGACY_ROOT / "Game Play images" / "stuart-smiths-adventure-construction-set_23.png"),
        ("garden_of_peril", LEGACY_ROOT / "Game Play images" / "adventure-construction-set-1.jpg"),
        ("fertile_crescent", LEGACY_ROOT / "Game Play images" / "trollkilled.GIF"),
        ("terrain_editor", LEGACY_ROOT / "Game Editor images" / "adventure_construction_set_10.png"),
    ]
    screenshot_maps = [{"id": name, **screenshot_grid(path)} for name, path in map_sources if path.exists()]

    raw_candidates = raw_graphic_candidates(LAND_DISK)

    graphics_data = {
        "schema": "legacy-acs-graphics-import-prep/v1",
        "purpose": "Machine-readable graphic data for importing legacy ACS map, entity, object, and terrain visuals into the new ACS starter packs.",
        "iconSpriteMatrices": icon_data,
        "screenshotMapAndRoomGrids": screenshot_maps,
        "rawDiskGraphicCandidates": raw_candidates,
        "notes": [
            "iconSpriteMatrices are actual pixel matrices extracted from the legacy icon strip image.",
            "screenshotMapAndRoomGrids are coarse layout references from 320x200 screenshots, useful for recreating maps and placing entities/objects.",
            "rawDiskGraphicCandidates are binary candidates from the Land disk; exact ACS bitmap table decoding is still unresolved, so keep confidence low until verified.",
        ],
    }

    out = LAND_IMPORT / "graphic-data.import-prep.json"
    out.write_text(json.dumps(graphics_data, indent=2), encoding="utf-8")

    rivers_graphics = {
        "schema": "legacy-acs-rivers-graphics-import-prep/v1",
        "status": "blocked-on-correct-rivers-dsk",
        "screenshotReferences": [
            screenshot_grid(LEGACY_ROOT / "Game Play images" / "rol.GIF"),
            screenshot_grid(LEGACY_ROOT / "Game Play images" / "loststatue.GIF"),
        ],
        "note": "Current Rivers DSK hashes as the ACS Program Disk Front, so Rivers-native maps/sprites cannot be extracted from disk yet. These screenshot grids are temporary reconstruction references.",
    }
    (RIVERS_IMPORT / "graphic-data.import-prep.json").write_text(json.dumps(rivers_graphics, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "landGraphicData": str(out),
                "iconSprites": len(icon_data["sprites"]),
                "screenshotGrids": len(screenshot_maps),
                "rawCandidates": raw_candidates["candidateCount"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
