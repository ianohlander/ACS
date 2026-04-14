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
- `packages/editor-core`: pure content-editing helpers shared by the browser editor and future editor surfaces
- `packages/project-api`: shared project/release DTOs plus the browser API client used by the editor and runtime

## Content Flow

1. The editor produces a draft `AdventurePackage`.
2. Shared validation checks schema and cross-reference integrity.
3. Local draft persistence stores the in-progress package in IndexedDB.
4. The Milestone 7 API can create a project record whose mutable draft mirrors the current adventure package.
5. Publishing snapshots that mutable project draft into an immutable release record.
6. The browser runtime can load either the built-in sample, a local draft playtest, or a published release.
7. The phase-1 web host uses `runtime-2d` to render the current session state on a canvas.
8. The web host persists `RuntimeSnapshot` data through the `persistence` package, with separate slots for sample, draft playtest, and published releases.
9. Enemy behavior profiles in content are interpreted by `runtime-core` and emitted as AI events.

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
