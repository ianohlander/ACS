# Land of Aventuria Extraction Summary

## Status

Land of Aventuria is present in `ACS-Land of Adventuria.dsk` and visible strings are confirmed. The disk is not fully parsed yet: maps, tile grids, thing tables, creature tables, graphics pages, and trigger tables remain encoded in custom ACS storage.

## Confirmed Contents

- Title: `LAND OF AVENTURIA`
- Hidden/tutorial region: a "Secret Adventure" region deliberately left off the manual map.
- Tutorial themes: incomplete or misleading maps, hostile and friendly creatures, the three base sets, reusable monsters, creature stat variation, creature programming, hospital squares, and weapon readiness.
- Confirmed objects/concepts from disk strings: hospital square, dwarf, axe, hostile creatures, friendly creatures, ready weapon.

## Reconstruction Seed For New ACS

Build this first as a tutorial anthology rather than waiting for full binary decoding:

- Region: `Land of Aventuria`
- Region: `Hidden Tutorial Region`
- Map: `Hidden Tutorial Map`
- Tile: `hospital_square`
- Entity definitions: `dwarf`, `friendly_creature`, `hostile_creature`
- Item definitions: `axe`, `starter_weapon`
- Dialogue: `secret_adventure_intro`
- Triggers:
  - on map load or enter signpost: show the secret adventure intro
  - on enter hospital square: show hospital hint and heal/increase a stat once stat actions exist

See `summary.json` and `messages.json` for structured data.
