# ACS

`ACS` is a browser-first game platform inspired by `Adventure Construction Set`.

The initial focus is a retro, tile-based, single-player construction set with a playable browser runtime. The architecture is intentionally split so later phases can support richer graphics, audio, AI, and simulation models without rewriting the core content model.

## Milestone 0

- TypeScript monorepo with workspace boundaries
- shared package layout for domain and schema code
- architecture decision records
- versioning and naming conventions

## Milestone 1

- shared domain types
- versioned adventure package schema
- parser and validation entry points
- schema migration stubs

## Milestone 2

- renderer-agnostic `runtime-core` package
- game session interfaces and runtime snapshot shape
- basic command processing for movement, interaction, dialogue, and turn progression
- trigger execution for map load, tile entry, and adjacency interaction

## Milestone 3

- lightweight `runtime-2d` canvas renderer package
- browser host in `apps/web` with a playable sample adventure
- two connected maps, dialogue, trigger-driven item reward, and return objective
- tiny HTTP server for running the browser slice locally over `http://localhost:4173`

## Milestone 4

- shared `persistence` package for save records and IndexedDB access
- runtime snapshot saves stored locally in the browser
- save, load, and reset controls in the sample web host
- generic local draft primitives for future editor work

## Milestone 5

- authorable enemy behavior profiles in shared content data
- phase-1 enemy AI in `runtime-core` for pursue, guard, wander, and idle behaviors
- enemy intent and movement events surfaced to the browser event log
- sample meadow wolf to demonstrate AI reactions in the playable slice

## Milestone 6

- shared `editor-core` package for pure adventure editing helpers
- browser-based construction set page in `apps/web/editor.html`
- local draft editing for metadata, persistent-brush tile painting, and entity repositioning
- shared validation feedback while editing
- playtest flow that opens the current draft in the same browser runtime used by the demo

## Milestone 7

- shared `project-api` package for the project/release backend contract and browser client
- local backend in `apps/api` with file-backed project drafts, immutable releases, and session metadata
- editor controls for creating a project, saving project drafts, publishing releases, and opening the latest published build
- runtime support for loading a published release by query string while keeping saves isolated per release

## Milestone 8

- shared `validation` package for deeper structural, reference, and publish-readiness checks
- editor validation now shows error and warning summaries from the same shared report used by the backend
- local API exposes a `Validate Draft` workflow and uses the shared validation report before accepting publishes
- published releases retain their validation report so recent release health is visible in the editor


## Milestone 9

- entity definitions now declare placement policy: `singleton` or `multiple`
- shared schema normalization defaults omitted placement policies to `multiple`
- editor can add new entity instances from reusable entity definitions on any map
- singleton definitions, such as the Oracle, cannot be duplicated through the editor or validation
- multiple definitions, such as the Shrine Wolf, can be placed repeatedly for encounter design
- validation reports blocking errors when singleton definitions have more than one placed instance

## Milestone 10

- `runtime-2d` now supports two presentation modes: `classic-acs` and `debug-grid`
- the browser runtime defaults to a classic ACS-inspired gameplay panel with a map viewport, right-side status rail, and bottom message band
- the visual mode selector lets designers switch between the classic presentation and the old debug grid without changing engine state
- the classic renderer consumes the same `GameSessionState` as every other renderer, preserving the path to HD 2D or 3D later
- version tracking begins with a dedicated `docs/version-history.html` record and a `milestone-10` git tag

## Milestone 11

- added visual manifest domain types for classic sprite styles and sprite-pattern metadata
- added a first `classic-acs` sprite manifest to the sample adventure
- mapped the Hero, Oracle, and Shrine Wolf definitions to stable sprite IDs
- updated the classic renderer to resolve tile/entity visuals through manifests before falling back to built-in defaults
- added shared validation warnings for missing classic tile/entity sprite references
- kept `runtime-core` untouched so presentation remains separate from simulation

## Milestone 12

- added an entity definition editor panel to the browser construction set
- reusable entity definitions can now edit name, kind, singleton/multiple placement, sprite asset ID, faction, behavior mode, detection range, leash range, wander radius, and turn interval
- definition edits update all existing and future placed instances because instances reference reusable definitions by ID
- kept definition editing in `editor-core` as a pure package operation, then wired it into the browser editor
- left full item/tile/terrain definition creation for later milestone slices so the editor can grow without mixing definition types together prematurely

## Forward Milestone Path

The next milestone path intentionally brings the project closer to the feel of the original 1980s `Adventure Construction Set` while preserving the architectural rule that presentation is separate from game simulation.

### Milestone 13: Thing, Trigger, And Text Editors
- add construction-set style editors for interactive things, portals, conditional events, map exits, messages, and dialogue/text records
- provide a visual rule builder over structured triggers/actions rather than arbitrary user code
- support common ACS-like authoring patterns: enter tile, inspect adjacent object, use item, defeat enemy, set flag, give item, change tile, move map, remove entity, show text, and complete quest

### Milestone 14: Map Scale And Adventure Structure Tools

- support explicit map categories such as world, region, local, interior, and dungeon floor
- add editor tools for creating/deleting maps, connecting floors/regions, and assigning map-specific tile/sprite palettes
- prepare the content model for larger adventures that mix overworld travel, local encounters, interiors, and multi-floor dungeons

### Milestone 15: Character/Profile And Possession Systems

- add richer actor profile data inspired by the original ACS sheets: life force, power, speed, skills, readied weapon, armor, and possessions
- expose those fields in both runtime status panels and editor definition screens
- keep combat/profile rules in `runtime-core` or a future rules package, not in the renderer
## Workspace Layout

```text
apps/
  api/
  web/
docs/
  adr/
packages/
  content-schema/
  domain/
  editor-core/
  persistence/
  project-api/
  runtime-core/
  runtime-2d/
  validation/
```

## Running The Milestone 12 Demo

1. Build the repo with a working TypeScript compiler.
2. Start the web server: `node .\\apps\\web\\server.mjs`
3. Start the API server: `node .\\apps\\api\\dist\\index.js`
4. Open `http://localhost:4317/` if that port is in use in this environment, otherwise `http://localhost:4173/`
5. Open `http://localhost:4317/apps/web/editor.html` for the editor when using port `4317`.
6. Use the runtime Visual Mode selector to compare `Classic ACS` and `Debug Grid` rendering over the same engine state. Classic ACS now resolves tiles and entities through the adventure visual manifest. Classic ACS now resolves tiles and entities through the adventure visual manifest.
7. Use the editor to paint with the persistent tile brush, place reusable entity definitions while respecting singleton/multiple placement rules, review the shared validation summary, optionally run `Validate Draft` against the local API, then save a local draft, create a project, publish a release, and launch either a draft playtest or the latest published release.

## Core Rules

- Runtime core must remain renderer-agnostic.
- Published releases must be immutable.
- Draft content and published releases are separate concepts.
- Content packages and saves are versioned from the start.
- Assets are referenced by IDs, not hardcoded file paths in gameplay logic.
- Structured triggers/actions are preferred over arbitrary user code.
