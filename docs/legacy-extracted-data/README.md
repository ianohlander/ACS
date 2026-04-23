# ACS Legacy Disk Data Repository

This folder is an LLM-readable extraction repository generated from the Apple II DSK images in:

`H:/My Drive/Repos/ACS/legacy ACS/Legacy Disks`

It is organized around the new ACS `AdventurePackage` model: regions, maps, tile definitions, entity definitions/instances, items, spells, dialogue, triggers, starter packs, media/sound cues, and reusable library objects.

## Important Status

- `Land of Aventuria`: visible title and tutorial/game strings are confirmed and summarized, but the full map grid, thing records, creature records, graphics, and triggers are not yet structurally decoded.
- `Rivers of Light`: the current `ACS- Rivers of Light.dsk` is byte-identical to `Adventure Construction Set - Program Disk -Front.DSK`. No Rivers of Light adventure data was found in that image.
- Original ACS starter-pack data: categories, spell effects, creature classes, and documented examples are included from manual-backed research plus disk-string confirmations. Exact per-pack Master Thing/Master Creature lists are still a reverse-engineering target.

## Files

- `source-inventory.json`: disk hashes, status, and evidence.
- `schema-alignment.json`: mapping from original ACS concepts to the new ACS engine model.
- `starter-packs/classic-acs-starter-packs.json`: original ACS starter pack knowledge in structured form.
- `adventures/land-of-aventuria/summary.json`: confirmed contents and reconstruction guidance.
- `adventures/land-of-aventuria/messages.json`: confirmed Land messages/dialogue candidates.
- `adventures/land-of-aventuria/raw-offset-strings.json`: all offset strings from the Land disk report.
- `adventures/rivers-of-light/summary.json`: current Rivers status and blocker evidence.
- `adventures/rivers-of-light/raw-offset-strings.json`: visible strings from the current Rivers-labeled image.
- `fragments/unassigned-game-fragments.json`: confirmed game fragments not yet assigned to Land/Rivers.
- `raw/all-offset-strings.json`: all generated offset string reports, including likely false positives.

## Confidence Labels

- `disk-string-confirmed`: directly visible in the DSK string extraction.
- `manual-confirmed`: from the ACS manual/reference notes already collected.
- `manual-example`: mentioned as an example, not necessarily proven in a starter-pack master list.
- `inferred`: a design reconstruction based on confirmed strings and ACS behavior.

## Next Reverse-Engineering Targets

1. Acquire or recreate a Rivers of Light DSK image that differs from Program Disk Front.
2. Identify ACS adventure record boundaries for maps, things, creatures, graphics, and triggers.
3. Decode map tile grids and graphic pages into `MapDefinition`, `TileDefinition`, and pixel sprite records.
4. Decode Master Thing and Master Creature lists for the three original starter packs.
5. Convert confirmed Land of Aventuria content into a draft `AdventurePackage` JSON once enough map/object structure is decoded.
