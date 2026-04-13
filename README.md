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
  persistence/
  runtime-core/
  runtime-2d/
```

## Running The Milestone 4 Demo

1. Build the repo with a working TypeScript compiler.
2. Start the local server: `node .\\apps\\web\\server.mjs`
3. Open `http://localhost:4317/` if that port is in use in this environment, otherwise `http://localhost:4173/`
4. Use the Save and Load buttons in the sidebar to persist the current runtime snapshot locally.

## Core Rules

- Runtime core must remain renderer-agnostic.
- Published releases must be immutable.
- Draft content and published releases are separate concepts.
- Content packages and saves are versioned from the start.
- Assets are referenced by IDs, not hardcoded file paths in gameplay logic.
- Structured triggers/actions are preferred over arbitrary user code.
