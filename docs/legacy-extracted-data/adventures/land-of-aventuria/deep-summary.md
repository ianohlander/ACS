# Land of Aventuria Deep Extraction

## Major Correction

The earlier extraction was too shallow. Land of Aventuria stores a large body of adventure text in a control-code uppercase encoding, not only in ordinary high-bit Apple text. Decoding that table reveals the mini-adventure structure you remembered.

## Confirmed Mini-Adventures

- Map of Aventuria
- How To Play
- Save the Galaxy!
- Alice in Wonderland
- Sam Club, Private I
- Across the Delaware!
- Deep Dank Dungeon
- In the Nazi Castle
- Your New Idea / unused custom slot
- Secret Adventure / hidden tutorial region

## Confirmed Systems And Content

- Terrain/map tiles: Water, Open Space, Plains, Medium Mountains, High Mountains, Medium Forest, Chaparral, Dense Forest, Sheer Mountains, Bridge, River, Foothills, Regal Gateway, Boat, Castle, Cavern Door.
- Major mechanics taught: help squares, hospitals, portals, one-way travel, custom spaces, custom obstacles, hidden doors, spell casting, combat, missile weapons, stores/exchanges, evidence-gated dialogue, creature movement blocking, multi-location adventures.
- Major scenarios: WWII escape, detective mystery, spy rescue/microfilm mission, American Revolution crossing, sci-fi starship/planet/asteroid quest, fantasy dungeon/Wistrik/time machine, non-combat Alice adaptation.

## Important Files

- `deep-summary.json`: structured overview.
- `mini-adventures.json`: one record per mini-adventure.
- `control-text-screens.json`: decoded 512-byte message windows.
- `terrain-and-map-tiles.json`: terrain/table names.
- `creature-and-actor-candidates.json`: decoded creature/actor candidates.
- `screenshot-observed-rooms.json`: names observed in local legacy screenshots.

## Still Not Fully Parsed

The text and name tables are now much better, but the map grids, object coordinates, creature stats, trigger records, and graphic bitmaps still need structural decoding.
