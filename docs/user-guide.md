# User's Guide

## Overview

This project currently provides:

- `apps/web/index.html`: the playable game runtime
- `apps/web/editor.html`: the construction-set editor
- `apps/api/dist/index.js`: the local project and release backend

The browser pages store local saves and local drafts in the browser's IndexedDB database named `acs-local`.

Milestone 7 also introduces a local backend layer:

- project drafts can be saved to the API
- published releases are stored as immutable snapshots by the API
- the runtime can load a published release by id

## Starting The Application

1. Build the TypeScript workspace if needed.
2. Start the web server from the repo root:

```powershell
node .\apps\web\server.mjs
```

3. Start the API server from the repo root:

```powershell
node .\apps\api\dist\index.js
```

4. Open the runtime in a browser:

```text
http://localhost:4173/
```

If port `4173` is already in use in this environment, use the alternate port configured for your session, such as:

```text
http://localhost:4317/
```

5. Open the editor in a browser:

```text
http://localhost:4173/apps/web/editor.html
```

or, if you are on the alternate port:

```text
http://localhost:4317/apps/web/editor.html
```

## Playing The Game

The runtime loads one of three sources:

- the built-in sample adventure
- a local draft playtest
- a published release loaded with `?release=<release id>`

### Objective

The current sample objective shown in the UI is:

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
- a `Session Source` panel showing whether you are playing the sample, a draft, or a published release
- turn count
- flag summary
- inventory summary
- an event log
- a dialogue overlay when a trigger starts dialogue

## Saving And Loading Game Progress

The runtime page has three buttons:

- `Save`
- `Load`
- `Reset`

### Save Slots

The runtime uses separate local save slots for different sources:

- built-in sample adventure: `adv_milestone3:latest`
- draft playtest: `<adventure id>:draft-playtest`
- published release: `<adventure id>:release:<release id>`

This keeps sample, draft, and published-release progress separate.

### Save

`Save` stores the current runtime snapshot locally in IndexedDB.

### Load

`Load` restores the most recent locally saved snapshot for the active save slot.

### Reset

`Reset` restarts the current adventure from its start state.

Important:

- `Reset` does not delete your saved snapshot
- it only resets the active session in memory

## Using The Editor

The editor is available at `apps/web/editor.html`.

It currently supports:

- editing adventure metadata
- painting map tiles
- moving existing entities
- validating the draft
- saving the draft locally
- creating a backend project from the current draft
- saving the current draft to that project
- publishing immutable releases from the current project draft
- opening the latest published release in the runtime
- launching a local draft playtest

### Main Areas Of The Editor

The editor page is divided into two main areas:

- the editing panel on the left, containing the map grid and toolbar
- the sidebar on the right, containing metadata, project/release controls, validation messages, and entity summaries

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

## Project And Release Controls

Milestone 7 adds a `Project & Release` panel.

### API Status

The top status line in that panel shows whether the editor can reach the local API server.

If the API is not running, project creation and publishing controls remain unavailable.

### Create Project

`Create Project` sends the current draft to the local API and creates a mutable project record.

The editor remembers the current project id in local browser storage, so reopening the editor can reconnect to that same backend project later.

### Save Project

`Save Project` updates the current project draft on the API using the editor's current in-memory draft.

This is separate from `Save Draft`:

- `Save Draft` stores to browser IndexedDB
- `Save Project` stores to the local backend

### Publish Release

`Publish Release` snapshots the current project draft into an immutable release record.

The API validates the draft before publishing. If the draft has blocking errors, the publish request is rejected.

Published releases are immutable. To make a change after publishing, update the project draft and publish a new release.

### Open Latest Release

`Open Latest Release` opens the runtime page with a `release` query string.

Example shape:

```text
/apps/web/index.html?release=rel_0001
```

The runtime then loads that published release from the API instead of using the built-in sample or a local draft.

## Editing Metadata

The `Metadata` panel includes:

- `Title`
- `Description`

Typing in either field immediately updates the in-memory draft.

The draft is not permanently stored until you click `Save Draft`, `Save Project`, `Publish Release`, or `Playtest Draft`.

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

This is repositioning only. The current editor does not yet create new entities or delete existing ones.

## Validation

The `Validation` panel runs shared package validation against the current draft.

If the draft is valid, the panel shows:

- `No validation issues.`

If there are problems, each issue is listed with severity and message.

This validation runs while editing, so it updates as you change metadata, tiles, or entities.

## Local Drafts

`Save Draft` stores the current draft in IndexedDB using a draft key derived from the adventure id:

- `draft:adv_milestone3`

When the editor opens, it first checks for that saved draft.

If one exists:

- it loads the saved draft into the editor
- it reports the draft timestamp in the status line

If no draft exists:

- it starts from the built-in sample adventure
- or, if a remembered project exists and no local draft exists, it can load the project's backend draft

## Published Releases

Published releases live in the local backend, not the browser database.

The current API is intentionally simple and local:

- it uses a local development session called `Local Designer`
- it stores projects and releases in `apps/api/data/store.json`
- it does not yet support real user accounts or multi-user collaboration

## Current Limitations

Milestone 7 is still intentionally small. Important limitations include:

- no real authentication yet, only a local development session
- no cloud-hosted backend yet
- no asset file uploads yet, only asset metadata records on the API side
- no creation or deletion of maps from the editor
- no creation or deletion of entity definitions or entity instances yet
- no trigger editor yet
- no dialogue editor yet
- the runtime renderer is still a simple canvas renderer using colored tiles and abstract entity markers

## Troubleshooting

### The editor says the local API is unavailable

This usually means the API server is not running. Start:

```powershell
node .\apps\api\dist\index.js
```

### The runtime says a published release could not be loaded

Possible causes:

- the API server is not running
- the release id in the query string does not exist
- the local API data file was cleared or reset

### The editor does not show my previous draft

Possible causes:

- browser storage was cleared
- you opened the app in a different browser/profile
- the local draft was reset

### Playtest opens but shows the sample adventure

This happens when the runtime cannot find the draft key passed by the editor. In that case, the runtime falls back to the built-in sample adventure and reports that in the status text.

## Milestone 7 Summary

At this stage, the application is best understood as:

- a playable browser runtime for an ACS-inspired adventure
- a browser-based local draft editor
- a local persistence layer for both gameplay progress and editor drafts
- a local backend for mutable projects and immutable published releases
- a playtest and publish loop that can launch either a draft or a release in the same runtime
