# Architecture Blueprint

## Goals

- Keep content data-driven and versioned.
- Separate simulation from rendering and editor UI.
- Preserve upgrade paths to HD 2D, real-time systems, and 3D.
- Share schema and validation logic across editor, runtime, and backend.

## Package Boundaries

- `apps/web`: browser UI, editor shell, and future runtime host pages
- `apps/api`: backend modules for projects, releases, saves, and assets
- `packages/domain`: stable domain vocabulary and identifiers
- `packages/content-schema`: versioned adventure package schema, parsing, validation, and migration entry points

## Content Flow

1. The editor produces a draft `AdventurePackage`.
2. Shared validation checks schema and cross-reference integrity.
3. The backend snapshots an immutable release.
4. The browser runtime loads the published release and creates a game session.

## Versioning

- Adventure content carries a `schemaVersion`.
- Save data will carry its own save schema version.
- Migrations should transform older payloads into the current schema at load time.

## Naming Conventions

- IDs are opaque strings with explicit aliases in TypeScript.
- Definitions are reusable templates such as `EntityDefinition` or `ItemDefinition`.
- Instances are placed content such as `EntityInstance`.
- Runtime state must not be stored in content definitions.
