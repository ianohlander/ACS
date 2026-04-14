# User's Guide

## Overview

This project currently provides two browser pages:

- `apps/web/index.html`: the playable game runtime
- `apps/web/editor.html`: the Milestone 6 construction-set editor

Both pages run locally in your browser over HTTP and store their data in the browser's IndexedDB database named `acs-local`.

The application is currently local-first:

- game progress is saved in the browser
- editor drafts are saved in the browser
- playtesting a draft opens that draft in the same runtime used by the sample game

## Starting The Application

1. Build the TypeScript workspace if needed.
2. Start the local web server from the repo root:

```powershell
node .\apps\web\server.mjs
```

3. Open the runtime in a browser:

```text
http://localhost:4173/
```

If port `4173` is already in use in this environment, use the alternate port configured for your session, such as:

```text
http://localhost:4317/
```

4. Open the editor in a browser:

```text
http://localhost:4173/apps/web/editor.html
```

or, if you are on the alternate port:

```text
http://localhost:4317/apps/web/editor.html
```

## Playing The Game

The playable runtime loads the built-in sample adventure by default. That adventure is currently `Oracle of the Solar Seal`.

### Objective

The current objective shown in the UI is:

- speak to the Oracle
- enter the shrine
- claim the Solar Seal
- return to the Oracle

### Controls

Use these keys while the game page is focused:

- `W`, `A`, `S`, `D`
- or the arrow keys

These move the player one grid step at a time.

Additional controls:

- `E`: interact with an adjacent entity
- `Q`: inspect the current tile or an adjacent entity
- `Enter` or `Space`: advance dialogue when dialogue is open

### What You See On Screen

The runtime page includes:

- a canvas playfield showing the current map
- a map name display
- current player coordinates
- turn count
- flag summary
- inventory summary
- an event log
- a dialogue overlay when a trigger starts dialogue

### Basic Play Flow

As you move:

- the player moves one tile at a time
- exits can transfer you from one map to another
- triggers may fire when you enter certain tiles or interact with entities
- enemy AI may respond during the enemy phase
- the event log records important actions such as movement, trigger execution, dialogue, item rewards, and enemy behavior

## Saving And Loading Game Progress

The runtime page has three buttons:

- `Save`
- `Load`
- `Reset`

### Save

`Save` stores the current runtime snapshot locally in IndexedDB.

For the built-in sample adventure, the runtime uses a save slot based on the adventure id:

- `adv_milestone3:latest`

For editor playtests, the runtime uses a separate draft playtest save slot:

- `<adventure id>:draft-playtest`

This keeps playtest progress separate from normal sample-adventure progress.

### Load

`Load` restores the most recent locally saved snapshot for the active save slot.

If no save exists for that slot, the runtime reports that no local save is available.

### Reset

`Reset` restarts the current adventure from its start state.

Important:

- `Reset` does not delete your saved snapshot
- it only resets the active session in memory

### Save Status And Persistence Notes

The runtime shows save/load status text in the sidebar.

All persistence so far is browser-local:

- saves are not shared across browsers
- saves are not synced to a server
- clearing browser storage can remove them

## Using The Editor

The editor is available at `apps/web/editor.html`.

It is currently an MVP construction-set page focused on:

- editing adventure metadata
- painting map tiles
- moving existing entities
- validating the draft
- saving the draft locally
- launching a playtest from the draft

### Main Areas Of The Editor

The editor page is divided into two main areas:

- the editing panel on the left, containing the map grid and toolbar
- the sidebar on the right, containing metadata, validation messages, and entity summaries

### Top Buttons

At the top of the editor page you will see:

- `Back To Play`
- `Save Draft`
- `Reset Draft`
- `Playtest Draft`

Their purposes are:

- `Back To Play`: opens the normal playable runtime page
- `Save Draft`: stores the current draft locally in IndexedDB
- `Reset Draft`: restores the built-in sample adventure and deletes the saved local draft
- `Playtest Draft`: saves the current draft locally and opens a new tab running that draft in the game runtime

## Editing Metadata

The `Metadata` panel includes:

- `Title`
- `Description`

Typing in either field immediately updates the in-memory draft.

The draft is not permanently stored until you click `Save Draft` or `Playtest Draft`.

The status line below the metadata fields tells you whether:

- a local draft was loaded
- no draft exists yet
- the current draft was saved
- the draft was reset

## Working With Maps

The toolbar above the grid includes:

- `Map`
- `Mode`
- `Tile`
- `Entity`

### Map Selector

The `Map` dropdown switches between maps in the current adventure package.

The current sample includes:

- `Sun Meadow`
- `Inner Shrine`

Changing the selected map redraws the editor grid and updates the entity summary for that map.

## Tile Editing

Set `Mode` to `Tiles` to paint tiles.

Then:

1. choose a tile from the `Tile` dropdown
2. click any cell in the grid

The clicked cell is rewritten to the selected tile id.

The tile palette is built from:

- tile ids already present on the current map
- plus a fallback palette of known tiles such as `grass`, `path`, `shrub`, `stone`, `floor`, `altar`, `altar-lit`, `door`, and `water`

The editor currently edits the first tile layer of the selected map.

## Entity Editing

Set `Mode` to `Entities` to reposition an entity.

Then:

1. choose an entity from the `Entity` dropdown
2. click a destination cell in the grid

The selected entity instance is moved to:

- the currently selected map
- the clicked `x, y` position

This is repositioning only. The current Milestone 6 editor does not yet create new entities or delete existing ones.

### Entity Summary

The `Entities On Map` panel lists each entity on the selected map in the form:

- entity id
- display name
- current coordinates

Use this list to confirm where entities are placed after moving them.

## Validation

The `Validation` panel runs shared package validation against the current draft.

If the draft is valid, the panel shows:

- `No validation issues.`

If there are problems, each issue is listed with severity and message.

This validation runs while editing, so it updates as you change metadata, tiles, or entities.

## Saving Drafts

`Save Draft` stores the current draft in IndexedDB using a draft key derived from the adventure id:

- `draft:adv_milestone3`

When the editor opens, it first checks for that saved draft.

If one exists:

- it loads the saved draft into the editor
- it reports the draft timestamp in the status line

If no draft exists:

- it starts from the built-in sample adventure

## Resetting Drafts

`Reset Draft` does two things:

1. replaces the current in-memory draft with a fresh clone of the built-in sample adventure
2. deletes the saved draft record from IndexedDB

After reset, the editor is effectively back at the original sample content.

## Playtesting A Draft

`Playtest Draft` is the bridge between the editor and the runtime.

When you click it:

1. the editor saves the current draft locally
2. the editor opens a new browser tab
3. that tab loads the normal game runtime with a `draft` query parameter
4. the runtime looks up the saved draft in IndexedDB
5. if found, the runtime plays the draft instead of the built-in sample adventure

This means the playtest page is not a separate engine. It is the same runtime page, pointed at your saved draft content.

### Draft Playtest Saves

While playtesting a draft:

- the runtime uses a draft-specific save slot
- the playtest can be saved and loaded independently of the built-in sample runtime

This helps avoid mixing normal demo saves with draft playtest saves.

## Current Limitations

The Milestone 6 application is intentionally small and local-first. A few important limitations are:

- no server-backed user accounts
- no cloud save sync
- no publishing flow yet
- no creation or deletion of maps from the editor
- no creation or deletion of entity definitions or entity instances
- no trigger editor yet
- no dialogue editor yet
- no asset pipeline yet
- the runtime renderer is still a simple canvas renderer using colored tiles and abstract entity markers

## Troubleshooting

### The runtime says no local save exists

This usually means:

- you have not saved yet for the current adventure or draft playtest slot
- or you are in a different browser/profile than the one that created the save

### The editor does not show my previous draft

Possible causes:

- browser storage was cleared
- you opened the app in a different browser/profile
- the local draft was reset

### Playtest opens but shows the sample adventure

This happens when the runtime cannot find the draft key passed by the editor. In that case, the runtime falls back to the built-in sample adventure and reports that in the status text.

## Milestone 6 Summary

At this stage, the application is best understood as:

- a playable browser runtime for a sample ACS-inspired adventure
- a local draft editor for that adventure
- a local persistence layer for both gameplay progress and editor drafts
- a playtest loop that lets the editor launch the runtime against the saved draft

