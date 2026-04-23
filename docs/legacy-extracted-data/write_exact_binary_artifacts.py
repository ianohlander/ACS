import json
from collections import Counter
from pathlib import Path

from PIL import Image


ROOT = Path(r"C:\Codex\acs-dsk-analysis")
DISK = ROOT / "disks" / "ACS-Land of Adventuria.dsk"
LEGACY_ROOT = Path(r"H:\My Drive\Repos\ACS\legacy ACS")
OUT = ROOT / "extracted-data" / "adventures" / "land-of-aventuria" / "import-prep" / "exact-binary"
OUT.mkdir(parents=True, exist_ok=True)


def hexoff(offset):
    return f"0x{offset:05x}"


def dec_control(data):
    out = []
    for b in data:
        c = b & 0x7F
        if c in (0, 32):
            out.append(" ")
        elif 1 <= c <= 26:
            out.append(chr(64 + c))
        elif 27 <= c <= 31:
            out.append(" ")
        elif 33 <= c <= 126:
            out.append(chr(c))
        else:
            out.append(".")
    return "".join(out)


def fixed_bytes(data, offset, length):
    raw = data[offset : offset + length]
    return {
        "offset": hexoff(offset),
        "length": length,
        "rawHex": raw.hex(" "),
        "controlPreview": " ".join(dec_control(raw).split()),
        "byteCounts": [{"hex": f"0x{k:02x}", "count": v} for k, v in Counter(raw).most_common()],
    }


def byte_grid(data, offset, width, height, label=None):
    raw = data[offset : offset + width * height]
    values = sorted(set(raw))
    chars = " .,:;ox%#@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    # Assign visible chars by byte order; include the exact hex rows too.
    v_to_ch = {v: chars[i % len(chars)] for i, v in enumerate(values)}
    return {
        "id": label or f"grid_{offset:05x}_{width}x{height}",
        "offset": hexoff(offset),
        "width": width,
        "height": height,
        "length": width * height,
        "uniqueByteCount": len(values),
        "legend": [{"hex": f"0x{v:02x}", "decimal": v, "char": v_to_ch[v]} for v in values],
        "rowsHex": [
            [f"0x{x:02x}" for x in raw[y * width : (y + 1) * width]]
            for y in range(height)
        ],
        "rowsChars": [
            "".join(v_to_ch[x] for x in raw[y * width : (y + 1) * width])
            for y in range(height)
        ],
        "confidence": "exact-bytes-candidate-grid",
        "note": "Exact bytes rendered as a candidate grid. Width/height are hypotheses until validated against ACS loader code or emulator state.",
    }


def records(data, offset, record_size, count, label):
    out = []
    for i in range(count):
        start = offset + i * record_size
        raw = data[start : start + record_size]
        out.append(
            {
                "index": i,
                "offset": hexoff(start),
                "recordSize": record_size,
                "rawHex": raw.hex(" "),
                "bytesDecimal": list(raw),
                "controlPreview": " ".join(dec_control(raw).split()),
            }
        )
    return {
        "id": label,
        "offset": hexoff(offset),
        "recordSize": record_size,
        "count": count,
        "records": out,
        "confidence": "exact-bytes-field-semantics-unknown",
    }


def nonzero_run_records(data, sectors):
    rows = []
    for sector_offset in sectors:
        block = data[sector_offset : sector_offset + 0x100]
        runs = []
        start = None
        for i, b in enumerate(block):
            if b != 0 and start is None:
                start = i
            if (b == 0 or i == len(block) - 1) and start is not None:
                end = i if b != 0 and i == len(block) - 1 else i - 1
                raw = block[start : end + 1]
                runs.append(
                    {
                        "relativeStart": start,
                        "relativeEnd": end,
                        "absoluteOffset": hexoff(sector_offset + start),
                        "length": len(raw),
                        "rawHex": raw.hex(" "),
                        "bytesDecimal": list(raw),
                    }
                )
                start = None
        rows.append(
            {
                "sectorOffset": hexoff(sector_offset),
                "runs": runs,
                "interpretation": "Sparse nonzero records. Candidate coordinate/object/trigger lists because values cluster in room coordinate ranges and appear in repeated sparse sectors.",
                "confidence": "candidate",
            }
        )
    return rows


def screenshot_cell_grid(path, cell=8, play_rows=19):
    image = Image.open(path).convert("RGBA")
    w, h = image.size
    cols = w // cell
    rows = min(play_rows, h // cell)
    palette = []
    palette_index = {}
    cell_rows = []
    for y in range(rows):
        row = []
        for x in range(cols):
            crop = image.crop((x * cell, y * cell, (x + 1) * cell, (y + 1) * cell))
            colors = Counter(crop.getdata())
            dominant = colors.most_common(1)[0][0]
            non_black = sum(n for c, n in colors.items() if c[:3] != (0, 0, 0))
            key = dominant
            if key not in palette_index:
                palette_index[key] = len(palette)
                palette.append(key)
            row.append(
                {
                    "x": x,
                    "y": y,
                    "dominantRgba": "#{:02x}{:02x}{:02x}{:02x}".format(*dominant),
                    "dominantPaletteIndex": palette_index[key],
                    "nonBlackPixels": non_black,
                    "occupied": non_black >= 4,
                }
            )
        cell_rows.append(row)
    chars = " .,:;ox%#@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    text_rows = []
    for row in cell_rows:
        text_rows.append("".join(chars[min(c["dominantPaletteIndex"], len(chars) - 1)] if c["occupied"] else " " for c in row))
    return {
        "sourceImage": str(path).replace("\\", "/"),
        "cellWidth": cell,
        "cellHeight": cell,
        "gridWidth": cols,
        "gridHeight": rows,
        "rowsChars": text_rows,
        "cells": cell_rows,
        "confidence": "exact-screenshot-pixel-grid-not-disk-grid",
    }


def main():
    data = DISK.read_bytes()

    map_candidates = {
        "schema": "legacy-acs-exact-map-grid-candidates/v1",
        "note": "These are exact bytes at map/graphics-looking offsets. Some are probably graphics or packed map data; field semantics are not proven.",
        "candidateGrids": [
            byte_grid(data, 0x14900, 40, 20, "candidate_map_or_graphics_14900_40x20"),
            byte_grid(data, 0x14B00, 40, 20, "candidate_map_or_graphics_14b00_40x20"),
            byte_grid(data, 0x15E70, 40, 20, "candidate_title_adjacent_grid_15e70_40x20"),
            byte_grid(data, 0x16100, 40, 20, "candidate_graphics_or_tile_table_16100_40x20"),
            byte_grid(data, 0x17000, 40, 20, "candidate_region_payload_17000_40x20"),
            byte_grid(data, 0x1A0D8, 40, 20, "candidate_region_payload_1a0d8_40x20"),
        ],
        "screenshotDerivedExactCellGrids": [
            screenshot_cell_grid(LEGACY_ROOT / "Game Play images" / "stuart-smiths-adventure-construction-set_17.png"),
            screenshot_cell_grid(LEGACY_ROOT / "Game Play images" / "stuart-smiths-adventure-construction-set_20.png"),
            screenshot_cell_grid(LEGACY_ROOT / "Game Play images" / "stuart-smiths-adventure-construction-set_21.png"),
            screenshot_cell_grid(LEGACY_ROOT / "Game Play images" / "stuart-smiths-adventure-construction-set_23.png"),
        ],
    }

    room_dimension_candidates = {
        "schema": "legacy-acs-room-dimension-candidates/v1",
        "note": "Exact sparse records around 0x1c000. The 16 5-byte rows match the documented room-count boundary, but field meanings are unproven.",
        "headerBytes": fixed_bytes(data, 0x1C000, 16),
        "sixteenRoomLikeRecords": records(data, 0x1C009, 5, 16, "sixteen_5_byte_room_like_records_at_1c009"),
        "alternateEvenRoomFlags": records(data, 0x1C600, 2, 12, "twelve_even_room_or_region_flags_at_1c600"),
    }

    sparse_sectors = [
        0x13100,
        0x16D00,
        0x16E00,
        0x17A00,
        0x18500,
        0x19100,
        0x19D00,
        0x1AA00,
        0x1B500,
        0x1C000,
        0x1D400,
        0x1D500,
        0x1EC00,
        0x1F800,
        0x20400,
        0x21100,
        0x21C00,
    ]

    object_coordinate_candidates = {
        "schema": "legacy-acs-object-coordinate-candidates/v1",
        "note": "Exact sparse nonzero byte runs from sectors whose values cluster around small coordinate-like ranges. These need validation before import as object placements.",
        "candidateRunsBySector": nonzero_run_records(data, sparse_sectors),
    }

    creature_stat_candidates = {
        "schema": "legacy-acs-creature-stat-candidates/v1",
        "note": "Exact bytes surrounding creature names/category tables. Name rows are decoded where the encoding is clear; stat columns are not yet proven.",
        "categoryTableA": records(data, 0x15080, 15, 8, "creature_category_names_at_15080"),
        "categoryTableB": records(data, 0x12BD0, 15, 8, "creature_category_names_at_12bd0"),
        "statBytesAfterCategoryB": fixed_bytes(data, 0x12C78, 0x98),
        "creatureNameRegionA": fixed_bytes(data, 0x19A49, 0x90),
        "creatureNameRegionB": fixed_bytes(data, 0x20149, 0x90),
        "statBytesAfterCreatureNames": fixed_bytes(data, 0x19B40, 0xC0),
    }

    trigger_record_candidates = {
        "schema": "legacy-acs-trigger-record-candidates/v1",
        "note": "Exact bytes from regions that include message references, item/portal-like sparse records, and repeated structures. These are not safe to execute until fields are proven.",
        "messageTriggerLikeTextBlocks": [
            fixed_bytes(data, 0x12000, 0x200),
            fixed_bytes(data, 0x12100, 0x200),
        ],
        "sparseTriggerLikeRuns": nonzero_run_records(data, [0x16D00, 0x16E00, 0x18500, 0x19100, 0x19D00, 0x1B500, 0x1EC00, 0x1F800, 0x20400, 0x21C00]),
    }

    portal_coordinate_candidates = {
        "schema": "legacy-acs-portal-coordinate-candidates/v1",
        "note": "Exact candidate portal/exit bytes. Text confirms portals exist, but coordinate-pair semantics are not proven.",
        "candidatePairs": nonzero_run_records(data, [0x13100, 0x17A00, 0x1AA00, 0x21100]),
        "knownPortalTextOffsets": [
            {"offset": "0x12100", "meaning": "locked/blocked door message"},
            {"offset": "0x12000", "meaning": "secret door found in wall"},
        ],
    }

    raw_graphics_tables = {
        "schema": "legacy-acs-raw-graphics-tables/v1",
        "note": "Exact raw bytes from high-entropy graphics-looking regions plus screenshot matrices. The packed Apple II graphics format is not fully decoded.",
        "rawTables": [
            fixed_bytes(data, 0x14900, 0x400),
            fixed_bytes(data, 0x15C00, 0x400),
            fixed_bytes(data, 0x16000, 0x500),
            fixed_bytes(data, 0x17000, 0x1400),
            fixed_bytes(data, 0x1A000, 0x1600),
            fixed_bytes(data, 0x1B800, 0x800),
        ],
    }

    files = {
        "map-grid-candidates.exact.json": map_candidates,
        "room-dimension-candidates.exact.json": room_dimension_candidates,
        "object-coordinate-candidates.exact.json": object_coordinate_candidates,
        "creature-stat-block-candidates.exact.json": creature_stat_candidates,
        "trigger-record-candidates.exact.json": trigger_record_candidates,
        "portal-coordinate-candidates.exact.json": portal_coordinate_candidates,
        "raw-graphics-tables.exact.json": raw_graphics_tables,
    }
    for filename, value in files.items():
        (OUT / filename).write_text(json.dumps(value, indent=2), encoding="utf-8")

    index = {
        "schema": "legacy-acs-exact-binary-index/v1",
        "status": "exact raw byte extraction with candidate parses; not all field semantics proven",
        "files": list(files),
        "importantFinding": "Land of Aventuria and the stock Data Disk Front differ by only one 256-byte sector in the available images, so much of this appears to be stock ACS data/content rather than a clean standalone adventure file.",
        "sourceDisk": str(DISK).replace("\\", "/"),
    }
    (OUT / "README.exact-binary.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(json.dumps({"out": str(OUT), "files": list(files)}, indent=2))


if __name__ == "__main__":
    main()
