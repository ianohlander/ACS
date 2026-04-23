# Legacy ACS Import-Prep Artifacts

These files are shaped for the three downstream goals:

1. Import decoded legacy entities, objects, terrain, dialogue, portal concepts, trigger templates, graphics references, and sound placeholders into new ACS starter packs.
2. Recreate Land of Aventuria in the new ACS content format.
3. Recreate Rivers of Light once a correct adventure disk image is available.

## Land of Aventuria

Import-prep folder:

`adventures/land-of-aventuria/import-prep/`

Important files:

- `land-of-aventuria.draft-adventure-package.json`: a new-ACS-shaped scaffold. It is not final/playable because exact maps, coordinates, exits, and triggers are not fully decoded.
- `starter-pack.import-prep.json`: starter-pack record indexing decoded Land tiles/entities/items/spells.
- `tile-definitions.import-prep.json`: 26 terrain/portal/special-space tile definitions.
- `item-definitions.import-prep.json`: 31 item/object definitions inferred from decoded text.
- `entity-definitions.import-prep.json`: 53 entity/actor definitions from decoded text/name tables.
- `dialogue-records.json`: 46 decoded message-screen records.
- `trigger-templates.import-prep.json`: 12 trigger/mechanic templates.
- `portal-candidates.import-prep.json`: 10 decoded portal/travel candidates.
- `graphics-and-assets.import-prep.json`: screenshot/reference assets and sprite cutout candidates.
- `sound-and-music.import-prep.json`: known audio-system placeholders; no concrete Land audio has been decoded.

## Rivers of Light

Import-prep folder:

`adventures/rivers-of-light/import-prep/`

Current status: blocked until the actual Rivers of Light game disk is available. The screenshot `rol.GIF` confirms the title and intro premise, but the current DSK in the folder is still the Program Disk Front image.

## Confidence

These artifacts separate:

- disk-decoded text/tables
- screenshot-confirmed references
- inferred objects from decoded prose
- placeholders needed by the new ACS schema

Use the confidence/source fields before treating any object as exact original data.
