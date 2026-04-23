import json
import math
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(r"C:\Codex\acs-dsk-analysis")
DISKS = ROOT / "disks"
OUT = ROOT / "extracted-data" / "adventures" / "land-of-aventuria" / "binary-decode"
OUT.mkdir(parents=True, exist_ok=True)

LAND = DISKS / "ACS-Land of Adventuria.dsk"
DATA_FRONT = DISKS / "Adventure Construction Set - Data Disk- Front.DSK"
DATA_BACK = DISKS / "Adventure Construction Set - Data Disk -Back.DSK"


def read(path):
    return path.read_bytes()


def entropy(data):
    counts = Counter(data)
    total = len(data)
    if not total:
        return 0
    return -sum((n / total) * math.log2(n / total) for n in counts.values())


def control_text_score(data):
    score = 0
    for b in data:
        c = b & 0x7F
        if c == 32 or 1 <= c <= 26:
            score += 1
        elif c in (0, 0x01, 0x08):
            score += 0.25
    return score / len(data)


def high_text_score(data):
    return sum(1 for b in data if 32 <= (b & 0x7F) <= 126) / len(data)


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


def printable_preview(data, limit=128):
    text = dec_control(data[:limit])
    return " ".join(text.split())


def sector_records(land, base=None):
    records = []
    for offset in range(0, len(land), 256):
        block = land[offset : offset + 256]
        counts = Counter(block)
        unique = len(counts)
        common = counts.most_common(12)
        changed = None
        if base and offset + 256 <= len(base):
            base_block = base[offset : offset + 256]
            changed = sum(1 for a, b in zip(block, base_block) if a != b)
        records.append(
            {
                "offset": offset,
                "offsetHex": f"0x{offset:05x}",
                "track": offset // (16 * 256),
                "sectorIndex": (offset // 256) % 16,
                "entropy": round(entropy(block), 3),
                "uniqueByteCount": unique,
                "zeroCount": counts[0],
                "spaceCount": counts[0x20],
                "oneCount": counts[1],
                "ffCount": counts[0xFF],
                "controlTextScore": round(control_text_score(block), 3),
                "highTextScore": round(high_text_score(block), 3),
                "changedVsDataFrontBytes": changed,
                "mostCommon": [{"byte": b, "hex": f"0x{b:02x}", "count": n} for b, n in common],
                "preview": printable_preview(block),
            }
        )
    return records


def find_small_alphabet_runs(data, min_len=80, max_unique=16):
    runs = []
    start = None
    window = []
    # Simpler: enumerate aligned blocks and then merge consecutive matching blocks.
    candidates = []
    for offset in range(0, len(data), 16):
        block = data[offset : offset + 16]
        if len(block) < 16:
            break
        counts = Counter(block)
        interesting = (
            len(counts) <= max_unique
            and counts[0] < 14
            and not all(32 <= (b & 0x7F) <= 126 for b in block)
        )
        if interesting:
            candidates.append((offset, offset + 16))
    merged = []
    for a, b in candidates:
        if not merged or a > merged[-1][1] + 16:
            merged.append([a, b])
        else:
            merged[-1][1] = b
    for a, b in merged:
        if b - a >= min_len:
            block = data[a:b]
            counts = Counter(block)
            runs.append(
                {
                    "offset": a,
                    "offsetHex": f"0x{a:05x}",
                    "length": b - a,
                    "entropy": round(entropy(block), 3),
                    "uniqueByteCount": len(counts),
                    "mostCommon": [{"byte": k, "hex": f"0x{k:02x}", "count": v} for k, v in counts.most_common(20)],
                    "previewBytesHex": block[:96].hex(" "),
                }
            )
    return runs


def as_grid(data, width, max_rows=60):
    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    values = sorted(set(data))
    value_to_char = {value: alphabet[i % len(alphabet)] for i, value in enumerate(values)}
    rows = []
    for y in range(min(max_rows, math.ceil(len(data) / width))):
        row = data[y * width : (y + 1) * width]
        rows.append("".join(value_to_char[b] for b in row))
    return {
        "width": width,
        "heightShown": len(rows),
        "valueLegend": [{"byte": v, "hex": f"0x{v:02x}", "char": value_to_char[v]} for v in values],
        "rows": rows,
    }


def plausible_grid_candidates(data):
    candidates = []
    for run in find_small_alphabet_runs(data):
        offset = run["offset"]
        length = run["length"]
        block = data[offset : offset + length]
        for width in (10, 12, 16, 20, 24, 28, 32, 40):
            if length >= width * 6:
                candidates.append(
                    {
                        **run,
                        "candidateWidth": width,
                        "grid": as_grid(block[: min(length, width * 40)], width),
                    }
                )
    return candidates


def fixed_record_scan(data, start=0, end=None, record_sizes=(8, 12, 16, 20, 24, 32)):
    if end is None:
        end = len(data)
    results = []
    for size in record_sizes:
        for offset in range(start, end - size * 4, size):
            records = [data[offset + i * size : offset + (i + 1) * size] for i in range(8)]
            if any(len(r) < size for r in records):
                continue
            # Coordinates/stat records often have low first bytes but nonzero names/ids nearby.
            low_ratio = sum(1 for r in records for b in r if b <= 0x40) / (size * len(records))
            zero_ratio = sum(1 for r in records for b in r if b == 0) / (size * len(records))
            varied_columns = sum(1 for col in range(size) if len({r[col] for r in records}) > 2)
            if 0.45 <= low_ratio <= 0.98 and zero_ratio < 0.65 and varied_columns >= max(3, size // 4):
                block = data[offset : offset + size * 8]
                results.append(
                    {
                        "offset": offset,
                        "offsetHex": f"0x{offset:05x}",
                        "recordSize": size,
                        "sampleRecordCount": 8,
                        "lowByteRatio": round(low_ratio, 3),
                        "zeroRatio": round(zero_ratio, 3),
                        "variedColumns": varied_columns,
                        "recordsHex": [r.hex(" ") for r in records],
                        "controlPreview": printable_preview(block, len(block)),
                    }
                )
    return results[:500]


def decode_title_table(data):
    start = 0x15D2E
    raw = data[start : start + 0xD2]
    text = dec_control(raw)
    names = [
        text[0:20],
        text[20:40],
        text[40:60],
        text[60:80],
        text[80:100],
        text[100:120],
        text[120:140],
        text[140:160],
        text[160:190],
        text[190:210],
    ]
    return [
        {
            "index": i,
            "offset": f"0x{(start + i * 20):05x}",
            "rawText": n,
            "name": " ".join(n.split()),
        }
        for i, n in enumerate(names)
    ]


def decode_name_table(data, start, count, width):
    rows = []
    for i in range(count):
        off = start + i * width
        raw = data[off : off + width]
        rows.append(
            {
                "index": i,
                "offset": f"0x{off:05x}",
                "width": width,
                "rawHex": raw.hex(" "),
                "name": " ".join(dec_control(raw).split()),
            }
        )
    return rows


def main():
    land = read(LAND)
    data_front = read(DATA_FRONT) if DATA_FRONT.exists() else None
    data_back = read(DATA_BACK) if DATA_BACK.exists() else None
    sectors = sector_records(land, data_front)

    changed = [r for r in sectors if r["changedVsDataFrontBytes"] is not None and r["changedVsDataFrontBytes"] > 0]
    low_alpha = plausible_grid_candidates(land)
    record_candidates = fixed_record_scan(land, start=0x6000)

    named_tables = {
        "miniAdventureTitleTable": decode_title_table(land),
        "terrainNames16x16": decode_name_table(land, 0x16666, 16, 15),
        "creatureCategoryNames8x16a": decode_name_table(land, 0x15080, 8, 15),
        "creatureCategoryNames8x16b": decode_name_table(land, 0x12BD0, 8, 15),
        "creatureNames11": decode_name_table(land, 0x19A4D, 11, 0),  # replaced below
    }
    # Creature names are delimiter-prefixed with small control bytes, not fixed width.
    creature_region = land[0x19A4D : 0x19AD0]
    parts = []
    current = []
    current_start = 0x19A4D
    for i, b in enumerate(creature_region):
        c = b & 0x7F
        if c < 0x09 or c > 0x1A and c != 0x20:
            if current:
                parts.append((current_start, bytes(current)))
            current = []
            current_start = 0x19A4D + i + 1
        else:
            if not current:
                current_start = 0x19A4D + i
            current.append(b)
    if current:
        parts.append((current_start, bytes(current)))
    named_tables["creatureNamesDelimited"] = [
        {
            "index": i,
            "offset": f"0x{off:05x}",
            "name": " ".join(dec_control(raw).split()),
            "rawHex": raw.hex(" "),
        }
        for i, (off, raw) in enumerate(parts)
        if " ".join(dec_control(raw).split())
    ]
    named_tables.pop("creatureNames11", None)

    outputs = {
        "sectorClassification": sectors,
        "changedSectorsVsDataFront": changed,
        "smallAlphabetGridCandidates": low_alpha[:200],
        "fixedRecordCandidates": record_candidates,
        "namedTables": named_tables,
    }

    for name, value in outputs.items():
        (OUT / f"{name}.json").write_text(json.dumps(value, indent=2), encoding="utf-8")

    summary = {
        "landBytes": len(land),
        "sectorCount": len(sectors),
        "changedSectorsVsDataFront": len(changed),
        "smallAlphabetGridCandidates": len(low_alpha),
        "fixedRecordCandidates": len(record_candidates),
        "output": str(OUT),
        "highValueCandidates": {
            "lowestEntropyChangedSectors": sorted(changed, key=lambda r: (r["uniqueByteCount"], r["entropy"]))[:20],
            "firstSmallAlphabetGridCandidates": low_alpha[:10],
            "firstFixedRecordCandidates": record_candidates[:10],
        },
    }
    (OUT / "binary-decode-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
