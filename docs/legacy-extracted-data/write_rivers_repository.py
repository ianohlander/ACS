import json
import math
from collections import Counter
from pathlib import Path

from PIL import Image


ROOT = Path(r"C:\Codex\acs-dsk-analysis")
DISK = ROOT / "disks" / "ACS- Rivers of Light.dsk"
OUT_ROOT = ROOT / "extracted-data" / "adventures" / "rivers-of-light"
IMPORT = OUT_ROOT / "import-prep"
EXACT = IMPORT / "exact-binary"
LEGACY = Path(r"H:\My Drive\Repos\ACS\legacy ACS")


def slug(value):
    return (
        value.lower()
        .replace("'", "")
        .replace('"', "")
        .replace("&", " and ")
        .replace("/", " ")
        .replace("-", " ")
    )


def idify(value):
    out = []
    prev = False
    for ch in slug(value):
        if ch.isalnum():
            out.append(ch)
            prev = False
        elif not prev:
            out.append("_")
            prev = True
    return "".join(out).strip("_") or "unknown"


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
            out.append(" ")
    return "".join(out)


def dec_high(data):
    return "".join(chr(b & 0x7F) if 32 <= (b & 0x7F) <= 126 else " " for b in data)


def clean(text):
    return " ".join(text.replace("\x00", " ").split())


def entropy(data):
    counts = Counter(data)
    total = len(data)
    return -sum((n / total) * math.log2(n / total) for n in counts.values()) if total else 0


def hexoff(offset):
    return f"0x{offset:05x}"


def raw_string_runs(data, mode, min_len=8):
    fn = dec_control if mode == "controlUpper" else dec_high
    runs = []
    start = None
    chars = []
    for i, b in enumerate(data):
        text = fn(bytes([b]))
        ch = text[0]
        useful = ch != " " or b in (0x20, 0xA0)
        if useful and (ch.isalnum() or ch in " .,!?;:'\"()-/"):
            if start is None:
                start = i
            chars.append(ch)
        else:
            if start is not None:
                value = clean("".join(chars))
                if len(value) >= min_len and any(c.isalpha() for c in value):
                    runs.append({"offset": hexoff(start), "encoding": mode, "text": value})
            start = None
            chars = []
    if start is not None:
        value = clean("".join(chars))
        if len(value) >= min_len and any(c.isalpha() for c in value):
            runs.append({"offset": hexoff(start), "encoding": mode, "text": value})
    return runs


def sector_text_records(data):
    rows = []
    for off in range(0, len(data), 0x100):
        block = data[off : off + 0x100]
        score = sum(1 for x in block if (1 <= (x & 0x7F) <= 26) or (x & 0x7F) == 32)
        text = clean(dec_control(block))
        if score >= 130 and len(text) >= 24:
            rows.append(
                {
                    "id": f"rivers_text_sector_{off:05x}",
                    "offset": hexoff(off),
                    "encoding": "controlUpper",
                    "controlTextScore": round(score / len(block), 3),
                    "text": text,
                }
            )
    return rows


def byte_grid(data, offset, width, height, label):
    raw = data[offset : offset + width * height]
    values = sorted(set(raw))
    chars = " .,:;ox%#@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    mapping = {value: chars[i % len(chars)] for i, value in enumerate(values)}
    return {
        "id": label,
        "offset": hexoff(offset),
        "width": width,
        "height": height,
        "length": width * height,
        "uniqueByteCount": len(values),
        "entropy": round(entropy(raw), 3),
        "legend": [{"hex": f"0x{v:02x}", "decimal": v, "char": mapping[v]} for v in values],
        "rowsChars": ["".join(mapping[x] for x in raw[y * width : (y + 1) * width]) for y in range(height)],
        "rowsHex": [[f"0x{x:02x}" for x in raw[y * width : (y + 1) * width]] for y in range(height)],
        "confidence": "exact-bytes-candidate-grid",
    }


def fixed_bytes(data, offset, length):
    raw = data[offset : offset + length]
    return {
        "offset": hexoff(offset),
        "length": length,
        "rawHex": raw.hex(" "),
        "controlPreview": clean(dec_control(raw)),
        "byteCounts": [{"hex": f"0x{k:02x}", "count": v} for k, v in Counter(raw).most_common(32)],
    }


def nonzero_runs(data, sectors):
    out = []
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
        out.append({"sectorOffset": hexoff(sector_offset), "runs": runs, "confidence": "candidate"})
    return out


def screenshot_grid(path, cell=8, play_rows=19):
    image = Image.open(path).convert("RGBA")
    cols = image.width // cell
    rows = min(play_rows, image.height // cell)
    chars = " .,:;ox%#@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    palette = {}
    row_text = []
    cells = []
    for y in range(rows):
        text_row = []
        cell_row = []
        for x in range(cols):
            crop = image.crop((x * cell, y * cell, (x + 1) * cell, (y + 1) * cell))
            counts = Counter(crop.getdata())
            dominant = counts.most_common(1)[0][0]
            non_black = sum(n for c, n in counts.items() if c[:3] != (0, 0, 0))
            if dominant not in palette:
                palette[dominant] = len(palette)
            idx = palette[dominant]
            text_row.append(chars[min(idx, len(chars) - 1)] if non_black >= 4 else " ")
            cell_row.append(
                {
                    "x": x,
                    "y": y,
                    "dominantRgba": "#{:02x}{:02x}{:02x}{:02x}".format(*dominant),
                    "dominantPaletteIndex": idx,
                    "nonBlackPixels": non_black,
                    "occupied": non_black >= 4,
                }
            )
        row_text.append("".join(text_row))
        cells.append(cell_row)
    return {
        "sourceImage": str(path).replace("\\", "/"),
        "cellWidth": cell,
        "cellHeight": cell,
        "gridWidth": cols,
        "gridHeight": rows,
        "rowsChars": row_text,
        "cells": cells,
        "confidence": "exact-screenshot-pixel-grid-not-disk-grid",
    }


def icon_matrices():
    path = LEGACY / "Game Play images" / "icons.GIF"
    if not path.exists():
        return {"sourceImage": str(path).replace("\\", "/"), "sprites": []}
    image = Image.open(path).convert("RGBA")
    spans = [(5, 5, 65, 58), (77, 5, 63, 59), (148, 5, 70, 59), (226, 5, 63, 59), (298, 5, 61, 59), (369, 5, 66, 59), (447, 5, 66, 59), (525, 5, 65, 59), (603, 5, 54, 59)]
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
    sprites = []
    for (x, y, w, h), (sid, name, usage) in zip(spans, labels):
        crop = image.crop((x, y, x + w, y + h))
        colors = [c for c, _ in Counter(crop.getdata()).most_common(12)]
        cmap = {c: "0123456789AB"[i] for i, c in enumerate(colors)}
        rows = []
        for yy in range(crop.height):
            row = []
            for xx in range(crop.width):
                c = crop.getpixel((xx, yy))
                if c not in cmap:
                    c = min(colors, key=lambda p: sum((p[i] - c[i]) ** 2 for i in range(4)))
                row.append(cmap[c])
            rows.append("".join(row))
        sprites.append(
            {
                "id": sid,
                "name": name,
                "usage": usage,
                "sourceBounds": {"x": x, "y": y, "width": w, "height": h},
                "pixelMatrix": {
                    "width": crop.width,
                    "height": crop.height,
                    "palette": [{"char": cmap[c], "rgba": "#{:02x}{:02x}{:02x}{:02x}".format(*c)} for c in colors],
                    "rows": rows,
                },
                "confidence": "image-derived-reference",
            }
        )
    return {"sourceImage": str(path).replace("\\", "/"), "sprites": sprites}


REGIONS = [
    ("the_fertile_crescent", "The Fertile Crescent", "Sumer/Babylon world opening and mythic river setting."),
    ("ancient_valley", "Ancient Valley", "Ancient valley wilderness and early quest terrain."),
    ("sippar_city", "Sippar City", "City region connected to Babylonian/Sumerian myth."),
    ("tomb_of_king_sethos", "Tomb of King Sethos", "Egyptian tomb/afterworld region tied to Osiris."),
    ("utnapishtims_realm", "Utnapishtim's Realm", "Distant immortality realm across deadly waters."),
    ("kingdom_of_gilgamesh", "Kingdom of Gilgamesh", "Gilgamesh/Enkidu/Erech quest region."),
    ("greater_assur", "Greater Assur", "Assyrian/Babylonian region."),
    ("bigeh_island", "Bigeh Island", "Egyptian island/gate region."),
    ("elephantine_island", "Elephantine Island", "Egyptian island region near the Nile."),
    ("edfu_temple_of_horus", "Edfu Temple of Horus", "Temple/gate region associated with Horus."),
]

TILES = [
    "Deep Water",
    "Open",
    "Plains",
    "Hills",
    "Mountains",
    "West-East River",
    "North-South River",
    "Northwest River",
    "Northeast River",
    "Southeast River",
    "Southwest River",
    "Desert",
    "Rivers Merging",
    "Pyramid",
    "Village",
    "Door of Sand",
    "Cave",
]

ITEMS = [
    ("pomegranate", "Pomegranate", "consumable", "Seeds quicken the blood; likely a vitality/power item."),
    ("gray_grow_young_plant", "Gray-Grow-Young Plant", "quest", "Plant said to cure wounds and make a person younger again."),
    ("throwing_axe_driver", "Throwing Axe Driver", "weapon", "Well-crafted throwing axe empowered by Sir Adroit and Cunning."),
    ("animal_bone", "Animal Bone", "quest", "Medicine woman asks for an animal bone."),
    ("great_mother_image", "Image of Great Mother", "quest", "Created by the medicine woman in exchange for a bone."),
    ("holy_emblems_three_shapes", "Holy Emblems of the Three Great Shapes", "key", "Profane keys of passage through a trio of gates."),
    ("sealed_thing_in_darkness", "Sealed Thing in Darkness with Fire About It", "quest", "Osiris-linked rejuvenating essence at the end of the quest."),
    ("ka", "Ka", "spirit", "Egyptian spiritual self referenced in afterworld travel."),
    ("sekhu", "Sekhu", "spirit", "Remains/body-spirit term in the Sethos tomb prayer."),
    ("boat_propulsion", "Boat Propulsion", "quest", "Urshanabi says to take all you can to propel the boat across deadly water."),
]

ENTITIES = [
    ("siduri", "Siduri", "npc", "Welcomes the player and speaks about immortality."),
    ("urshanabi", "Urshanabi the Ferryman", "npc", "Guides the player toward Utnapishtim across deadly waters."),
    ("utnapishtim", "Utnapishtim", "npc", "Flood survivor with eternal life as a gift of the gods."),
    ("gilgamesh", "Gilgamesh", "hero", "Mythic hero seeking eternal life for Enkidu."),
    ("enkidu", "Enkidu", "npc", "Gilgamesh's dead friend."),
    ("medicine_woman", "Medicine Woman", "npc", "Trades animal bone for Great Mother image."),
    ("osiris", "Osiris", "god", "Final Egyptian god encounter and afterlife focus."),
    ("horus", "Horus", "god", "Temple/gate deity reference."),
    ("ra", "Ra", "god", "Invoked to carry the Ka past visions of heaven and hell."),
    ("king_sethos", "King Sethos", "npc", "Tomb/Osiris prayer figure."),
    ("magic_crocodile", "Magic Crocodile", "creature", "Decoded creature name near Rivers terrain table."),
]


def main():
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    IMPORT.mkdir(parents=True, exist_ok=True)
    EXACT.mkdir(parents=True, exist_ok=True)
    data = DISK.read_bytes()

    raw_runs = raw_string_runs(data, "controlUpper")[:1800] + raw_string_runs(data, "high7")[:500]
    text_sectors = sector_text_records(data)
    messages = [
        {
            "id": f"rivers_message_{i + 1:03d}",
            "sourceOffsets": [row["offset"]],
            "encoding": "controlUpper",
            "text": row["text"],
            "suggestedDialogueId": f"dlg_rivers_{i + 1:03d}_{idify(row['text'][:32])}",
            "regionIds": [rid for rid, name, _ in REGIONS if name.upper().split()[0] in row["text"].upper()] or ["unassigned"],
            "confidence": "disk-decoded",
        }
        for i, row in enumerate(text_sectors)
    ]

    region_defs = [
        {"id": rid, "name": name, "kind": "mythicRegion", "genre": "mythicHistorical", "description": desc, "confidence": "disk-decoded-title-table"}
        for rid, name, desc in REGIONS
    ]
    tile_defs = [
        {
            "id": idify(name),
            "name": name,
            "description": f"Rivers of Light decoded/import-prep terrain: {name}.",
            "passability": "conditional" if any(k in name.lower() for k in ["water", "river", "mountain", "door", "cave"]) else "passable",
            "tags": ["terrain", "rivers-of-light"],
            "source": "control-code terrain table near 0x16600",
            "confidence": "disk-decoded",
        }
        for name in TILES
    ]
    item_defs = [
        {"id": iid, "name": name, "useKind": kind, "description": desc, "tags": ["rivers-of-light"], "confidence": "disk-decoded-or-inferred-from-message"}
        for iid, name, kind, desc in ITEMS
    ]
    entity_defs = [
        {"id": eid, "name": name, "kind": kind, "description": desc, "tags": ["rivers-of-light"], "confidence": "disk-decoded-or-inferred-from-message"}
        for eid, name, kind, desc in ENTITIES
    ]
    spells = [
        {
            "id": "rejuvenation",
            "name": "Rejuvenation",
            "description": "Healing/youth effect associated with the Gray-Grow-Young Plant and Osiris essence.",
            "confidence": "inferred-from-disk-decoded-text",
        },
        {
            "id": "afterworld_passage",
            "name": "Afterworld Passage",
            "description": "Spiritual gate-passage effect for Ka/Osiris regions.",
            "confidence": "inferred-from-disk-decoded-text",
        },
    ]
    triggers = [
        {
            "id": "pomegranate_quicken_blood",
            "triggerType": "onUseItem",
            "conditions": ["hasItem:pomegranate"],
            "actions": ["showDialogue", "futureChangeLifeOrPower"],
            "description": "Eating pomegranate seeds creates a virile quickening-blood effect.",
            "confidence": "disk-decoded-text",
        },
        {
            "id": "animal_bone_to_great_mother_image",
            "triggerType": "onUseItem",
            "conditions": ["hasItem:animal_bone"],
            "actions": ["removeItem", "giveItem:great_mother_image", "showDialogue"],
            "description": "Drop animal bone on medicine woman's table to receive an image of Great Mother.",
            "confidence": "disk-decoded-text",
        },
        {
            "id": "gray_grow_young_plant_rejuvenates",
            "triggerType": "onUseItem",
            "conditions": ["hasItem:gray_grow_young_plant"],
            "actions": ["showDialogue", "futureChangeLifeOrAge", "setFlag"],
            "description": "Eating the plant invigorates the player but does not grant eternal life.",
            "confidence": "disk-decoded-text",
        },
        {
            "id": "osiris_final_approach",
            "triggerType": "onEnterTile",
            "conditions": ["passedGates"],
            "actions": ["showDialogue", "setQuestStage"],
            "description": "Approach Osiris after passing the gate sequence.",
            "confidence": "inferred-from-disk-decoded-text",
        },
    ]
    portals = [
        {
            "id": "three_gates_to_eternal_life",
            "description": "A trio of gate passages using holy emblems of the three great shapes.",
            "regions": ["bigeh_island", "edfu_temple_of_horus", "tomb_of_king_sethos"],
            "confidence": "disk-decoded-text",
        },
        {
            "id": "boat_to_utnapishtim",
            "description": "Boat/ferryman passage across deadly waters to Utnapishtim.",
            "regions": ["the_fertile_crescent", "utnapishtims_realm"],
            "confidence": "disk-decoded-text",
        },
    ]

    starter_pack = {
        "id": "classic_acs_rivers_of_light_reference",
        "name": "Classic ACS Rivers of Light Reference",
        "genre": "mythicHistorical",
        "description": "Decoded Rivers of Light reference library for recreating the shipped ACS adventure.",
        "tileIds": [t["id"] for t in tile_defs],
        "entityDefinitionIds": [e["id"] for e in entity_defs],
        "itemDefinitionIds": [i["id"] for i in item_defs],
        "spellDefinitionIds": [s["id"] for s in spells],
        "source": "Rivers of Light Apple II DSK control-code decode",
        "confidence": "import-prep",
    }

    draft_package = {
        "schemaVersion": "1.0.0",
        "metadata": {
            "id": "legacy_rivers_of_light_reconstruction",
            "slug": "legacy-rivers-of-light-reconstruction",
            "title": "Rivers of Light Reconstruction",
            "description": "Draft reconstruction scaffold generated from decoded Apple II Adventure Construction Set Rivers of Light data.",
            "tags": ["classic-acs", "legacy", "rivers-of-light", "reconstruction"],
        },
        "starterLibraryPacks": [starter_pack],
        "regions": [{"id": f"region_{r['id']}", "name": r["name"], "description": r["description"], "loreNotes": "Exact map coordinates pending binary table validation."} for r in region_defs],
        "maps": [
            {
                "id": f"map_{r['id']}_placeholder",
                "name": f"{r['name']} Placeholder Map",
                "kind": "region",
                "regionId": f"region_{r['id']}",
                "width": 10,
                "height": 10,
                "tileLayers": [{"id": f"layer_{r['id']}_terrain", "name": "Decoded placeholder terrain", "width": 10, "height": 10, "tileIds": ["open"] * 100}],
                "exits": [],
            }
            for r in region_defs
        ],
        "tileDefinitions": tile_defs,
        "itemDefinitions": item_defs,
        "entityDefinitions": entity_defs,
        "spellDefinitions": spells,
        "dialogue": [
            {"id": m["suggestedDialogueId"], "nodes": [{"id": "start", "speaker": "Rivers of Light", "text": m["text"]}], "source": {"sourceOffsets": m["sourceOffsets"], "regionIds": m["regionIds"], "confidence": m["confidence"]}}
            for m in messages
        ],
        "customLibraryObjects": [{"id": f"custom_trigger_{t['id']}", "name": t["id"], "kind": "legacyTriggerTemplate", "description": t["description"], "fields": t} for t in triggers]
        + [{"id": f"custom_portal_{p['id']}", "name": p["id"], "kind": "legacyPortalCandidate", "description": p["description"], "fields": p} for p in portals],
        "triggers": [],
        "entityInstances": [],
        "startState": {"mapId": "map_the_fertile_crescent_placeholder", "x": 5, "y": 5, "party": ["player_adventurer"]},
        "extractionWarnings": ["Map grids, coordinates, stat blocks, and exact triggers are not yet field-proven."],
    }

    graphics = {
        "schema": "legacy-acs-rivers-graphics-import-prep/v1",
        "iconSpriteMatrices": icon_matrices(),
        "screenshotReferences": [
            screenshot_grid(LEGACY / "Game Play images" / "rol.GIF"),
            screenshot_grid(LEGACY / "Game Play images" / "loststatue.GIF"),
            screenshot_grid(LEGACY / "Game Play images" / "trollkilled.GIF"),
        ],
        "rawDiskGraphicCandidates": {
            "sourceDisk": str(DISK).replace("\\", "/"),
            "topCandidates": [
                {"offset": hexoff(off), "length": 0x400, "rawHex": data[off : off + 0x400].hex(" "), "entropy": round(entropy(data[off : off + 0x400]), 3)}
                for off in [0x14900, 0x15C00, 0x16000, 0x17000, 0x1A000, 0x1B800]
            ],
        },
    }

    summary = {
        "title": "Rivers of Light",
        "extractionStatus": {
            "adventureDataFound": True,
            "sourceDisk": str(DISK).replace("\\", "/"),
            "evidence": [
                "Control-code text references Babylon, Sumer, Egypt, Osiris, Utnapishtim, Gilgamesh, and pomegranate.",
                "Title/region table near 0x15d00 contains Rivers of Light region names.",
                "Terrain table near 0x16600 contains river/desert/pyramid/village terrain names.",
            ],
        },
        "regions": region_defs,
        "terrain": tile_defs,
        "items": item_defs,
        "entities": entity_defs,
        "remainingUnknowns": ["Exact tile grids", "Exact object coordinates", "Exact creature stats", "Exact trigger records", "Exact portal coordinate pairs", "Packed Apple II graphics table semantics"],
    }

    deep_summary = {
        "title": "Rivers of Light",
        "confirmedRegions": region_defs,
        "confirmedTextSignals": [
            "ARE WE EACH DESTINED TO LIVE FOR ONE BRIEF LIFETIME?",
            "BABYLON AND SUMER",
            "UTNAPISHTIM",
            "GILGAMESH",
            "THE GOD OSIRIS LIES AHEAD",
            "THE MANY SEEDS OF THE POMEGRANATE",
        ],
        "mechanicsAndThemes": ["quest for immortality", "mythic travel", "gated afterworld passage", "healing/rejuvenation", "item exchange", "dangerous river/water travel"],
        "sourceOffsetsOfInterest": ["0x00600", "0x00900", "0x00a00", "0x02200", "0x02b00", "0x02d00", "0x10300", "0x11a00", "0x15d00", "0x16600"],
    }

    exact_files = {
        "map-grid-candidates.exact.json": {
            "schema": "legacy-acs-rivers-exact-map-grid-candidates/v1",
            "candidateGrids": [
                byte_grid(data, 0x14900, 40, 20, "candidate_map_or_graphics_14900_40x20"),
                byte_grid(data, 0x15E70, 40, 20, "candidate_title_adjacent_grid_15e70_40x20"),
                byte_grid(data, 0x17000, 40, 20, "candidate_region_payload_17000_40x20"),
                byte_grid(data, 0x1A0D8, 40, 20, "candidate_region_payload_1a0d8_40x20"),
            ],
            "screenshotDerivedExactCellGrids": graphics["screenshotReferences"],
            "note": "Candidate grids are exact bytes but width/field semantics are unproven.",
        },
        "room-dimension-candidates.exact.json": {
            "schema": "legacy-acs-rivers-room-dimension-candidates/v1",
            "headerBytes": fixed_bytes(data, 0x1C000, 16),
            "sixteenRoomLikeRecords": {"offset": hexoff(0x1C009), "recordSize": 5, "count": 16, "records": [fixed_bytes(data, 0x1C009 + i * 5, 5) for i in range(16)]},
        },
        "object-coordinate-candidates.exact.json": {"schema": "legacy-acs-rivers-object-coordinate-candidates/v1", "candidateRunsBySector": nonzero_runs(data, [0x13100, 0x16D00, 0x16E00, 0x17A00, 0x18500, 0x19100, 0x19D00, 0x1AA00, 0x1B500, 0x1C000])},
        "creature-stat-block-candidates.exact.json": {"schema": "legacy-acs-rivers-creature-stat-candidates/v1", "categoryRegion": fixed_bytes(data, 0x12C00, 0x100), "creatureNameRegion": fixed_bytes(data, 0x16780, 0x100), "adjacentStatBytes": fixed_bytes(data, 0x12C80, 0x180)},
        "trigger-record-candidates.exact.json": {"schema": "legacy-acs-rivers-trigger-candidates/v1", "textTriggerBlocks": [fixed_bytes(data, 0x00600, 0x600), fixed_bytes(data, 0x02B00, 0x400)], "sparseTriggerLikeRuns": nonzero_runs(data, [0x16D00, 0x16E00, 0x18500, 0x19100, 0x19D00, 0x1B500])},
        "portal-coordinate-candidates.exact.json": {"schema": "legacy-acs-rivers-portal-candidates/v1", "candidatePairs": nonzero_runs(data, [0x13100, 0x17A00, 0x1AA00]), "knownPortalConcepts": portals},
        "raw-graphics-tables.exact.json": {"schema": "legacy-acs-rivers-raw-graphics-tables/v1", "rawTables": [fixed_bytes(data, off, 0x400) for off in [0x14900, 0x15C00, 0x16000, 0x17000, 0x1A000, 0x1B800]]},
    }

    top_files = {
        "summary.json": summary,
        "deep-summary.json": deep_summary,
        "mini-adventures.json": region_defs,
        "terrain-and-map-tiles.json": tile_defs,
        "creature-and-actor-candidates.json": entity_defs,
        "control-text-screens.json": text_sectors,
        "deep-keyword-hits.json": [
            {"keyword": kw, "offset": hexoff(clean(dec_control(data)).upper().find(kw)), "note": "Offset is approximate in cleaned stream"}
            for kw in ["BABYLON", "SUMER", "EGYPT", "OSIRIS", "UTNAPISHTIM", "GILGAMESH", "POMEGRANATE", "ETERNAL"]
        ],
        "deep-candidate-runs.json": raw_runs,
        "raw-offset-strings.json": raw_runs,
        "messages.json": messages,
    }
    import_files = {
        "rivers-import-scaffold.json": {
            "schema": "legacy-acs-rivers-import-scaffold/v2",
            "status": "game-data-confirmed",
            "sourceDisk": str(DISK).replace("\\", "/"),
            "decodedContent": {
                "messages": len(messages),
                "regions": len(region_defs),
                "tiles": len(tile_defs),
                "items": len(item_defs),
                "entities": len(entity_defs),
                "spells": len(spells),
                "triggerTemplates": len(triggers),
                "portalCandidates": len(portals),
            },
            "primaryFiles": [
                "rivers-of-light.draft-adventure-package.json",
                "dialogue-records.json",
                "mini-adventure-definitions.json",
                "tile-definitions.import-prep.json",
                "item-definitions.import-prep.json",
                "entity-definitions.import-prep.json",
                "graphic-data.import-prep.json",
                "exact-binary/README.exact-binary.json",
            ],
        },
        "raw-text-sectors.json": text_sectors,
        "dialogue-records.json": messages,
        "high-bit-message-records.json": raw_string_runs(data, "high7")[:200],
        "mini-adventure-definitions.json": region_defs,
        "tile-definitions.import-prep.json": tile_defs,
        "item-definitions.import-prep.json": item_defs,
        "entity-definitions.import-prep.json": entity_defs,
        "spell-definitions.import-prep.json": spells,
        "trigger-templates.import-prep.json": triggers,
        "portal-candidates.import-prep.json": portals,
        "starter-pack.import-prep.json": starter_pack,
        "rivers-of-light.draft-adventure-package.json": draft_package,
        "graphics-and-assets.import-prep.json": {
            "imageAssets": [
                {"id": "asset_legacy_rol_gif", "name": "Rivers of Light title/dialogue screenshot", "kind": "screenshot", "path": str(LEGACY / "Game Play images" / "rol.GIF").replace("\\", "/"), "confidence": "legacy-screenshot-reference"},
                {"id": "asset_legacy_loststatue_gif", "name": "Maddicitra/River Valley reference", "kind": "screenshot", "path": str(LEGACY / "Game Play images" / "loststatue.GIF").replace("\\", "/"), "confidence": "legacy-screenshot-reference"},
                {"id": "asset_legacy_trollkilled_gif", "name": "Fertile Crescent reference", "kind": "screenshot", "path": str(LEGACY / "Game Play images" / "trollkilled.GIF").replace("\\", "/"), "confidence": "legacy-screenshot-reference"},
            ]
        },
        "graphic-data.import-prep.json": graphics,
        "sound-and-music.import-prep.json": {"soundPlaceholders": [{"id": "snd_rivers_gate", "name": "Gate/afterworld cue", "confidence": "placeholder"}, {"id": "snd_rivers_rejuvenation", "name": "Rejuvenation cue", "confidence": "placeholder"}]},
    }

    for filename, value in top_files.items():
        (OUT_ROOT / filename).write_text(json.dumps(value, indent=2), encoding="utf-8")
    (OUT_ROOT / "summary.md").write_text(
        "# Rivers of Light\n\n"
        "Rivers of Light adventure data is present in the current disk image. Decoded regions include The Fertile Crescent, Ancient Valley, Sippar City, Tomb of King Sethos, Utnapishtim's Realm, Kingdom of Gilgamesh, Greater Assur, Bigeh Island, Elephantine Island, and Edfu Temple of Horus.\n",
        encoding="utf-8",
    )
    (OUT_ROOT / "deep-summary.md").write_text(
        "# Rivers of Light Deep Summary\n\n"
        "The disk contains a mythic quest for eternal life drawing on Babylonian/Sumerian and Egyptian afterlife material. Strong decoded signals include Siduri, Urshanabi, Utnapishtim, Gilgamesh, Enkidu, Osiris, Horus, Ra, pomegranate, the Gray-Grow-Young Plant, and the Three Great Shapes gate sequence.\n",
        encoding="utf-8",
    )
    for filename, value in import_files.items():
        (IMPORT / filename).write_text(json.dumps(value, indent=2), encoding="utf-8")
    for filename, value in exact_files.items():
        (EXACT / filename).write_text(json.dumps(value, indent=2), encoding="utf-8")
    (EXACT / "README.exact-binary.json").write_text(json.dumps({"schema": "legacy-acs-rivers-exact-binary-index/v1", "files": list(exact_files), "status": "exact raw bytes with candidate parses"}, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "messages": len(messages),
                "regions": len(region_defs),
                "tiles": len(tile_defs),
                "items": len(item_defs),
                "entities": len(entity_defs),
                "out": str(OUT_ROOT),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
