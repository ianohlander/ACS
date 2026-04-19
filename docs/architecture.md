# Architecture Blueprint

## Goals

- Keep content data-driven and versioned.
- Separate simulation from rendering and editor UI.
- Preserve upgrade paths to HD 2D, real-time systems, and 3D.
- Share schema and validation logic across editor, runtime, and backend.

## Package Boundaries

- `apps/web`: browser UI, editor shell, and phase-1 runtime host
- `apps/api`: local backend modules for projects, releases, session metadata, and asset records
- `packages/domain`: stable domain vocabulary and identifiers
- `packages/content-schema`: versioned adventure package schema, parsing, validation, and migration entry points
- `packages/runtime-core`: renderer-agnostic session engine, command processing, runtime snapshots, and phase-1 enemy AI
- `packages/runtime-2d`: phase-1 canvas renderer that projects runtime state into 2D visuals
- `packages/persistence`: local save records, IndexedDB access, and future draft-storage primitives
- `packages/editor-core`: pure content-editing helpers shared by the browser editor and future editor surfaces, including tile painting and entity instance placement
- `packages/project-api`: shared project/release DTOs plus the browser API client used by the editor and runtime
- `packages/validation`: shared validation reports and deeper publish-readiness checks used by the editor and backend

## Content Flow

1. The editor produces a draft `AdventurePackage`, with a persistent tile-brush workflow for fast map painting and entity-definition placement controls for adding reusable NPC/enemy instances.
2. Shared validation checks schema, map geometry, reference integrity, and publish-readiness.
3. Local draft persistence stores the in-progress package in IndexedDB.
4. The Milestone 7 API can create a project record whose mutable draft mirrors the current adventure package.
5. The editor can run the same validation report through the local API before publish for server-side confirmation.
6. Publishing snapshots that mutable project draft into an immutable release record only when blocking errors are absent.
7. The browser runtime can load either the built-in sample, a local draft playtest, or a published release.
8. The phase-1 web host uses `runtime-2d` to render the current session state on a canvas.
9. The web host persists `RuntimeSnapshot` data through the `persistence` package, with separate slots for sample, draft playtest, and published releases.
10. Enemy behavior profiles in content are interpreted by `runtime-core` and emitted as AI events. Entity placement policy (`singleton` or `multiple`) is authoring metadata enforced by the editor and validation layer before runtime loading.
11. Publishable releases retain the validation report that cleared them, so the latest release health is visible in the editor.

## Versioning

- Adventure content carries a `schemaVersion`.
- Save data carries its own `saveSchemaVersion`.
- Project drafts are mutable records.
- Releases are immutable snapshots.
- Migrations should transform older payloads into the current schema at load time.

## Naming Conventions

- IDs are opaque strings with explicit aliases in TypeScript.
- Definitions are reusable templates such as `EntityDefinition` or `ItemDefinition`.
- Instances are placed content such as `EntityInstance`.
- Runtime state must not be stored in content definitions.


## Classic ACS Visual Mode Strategy

The collected reference images in `legacy images/` show that the old ACS identity comes mainly from the gameplay panel and construction vocabulary, not from the surrounding DOS/Apple-era UI chrome. The project should therefore pursue a `classic-acs` presentation mode as a renderer/theme layer over the existing content and runtime state.

- `runtime-core` remains the source of truth for commands, rules, state, events, triggers, and AI.
- `runtime-2d` can grow multiple presentation modes, or a future `runtime-classic` package can be introduced beside it.
- The classic mode should render a fixed-aspect play panel with a tile/icon viewport, right-side status rail, and bottom message band.
- Classic sprites, pixel-editor drawings, splash screens, and music cues should be resolved through manifests and asset IDs, not hardcoded in maps or runtime rules.
- The same content package should be renderable by classic low-resolution sprites, later HD 2D art, or a future 3D renderer, with intro presentation such as splash screens and starting music selected as data.
- Editor growth should follow the original construction-set vocabulary: terrain pictures, thing pictures, creature pictures, map/floor tools, entity definitions, actor profiles, possessions, triggers, and text/dialogue records.
