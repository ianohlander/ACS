# ACS System Reference

This document explains how the current ACS application is put together, how the major packages relate to one another, and what happens during common end-to-end behaviors.

## Purpose

Use this document when you want to answer questions like:

- Where is content authored?
- How is content normalized and validated?
- How does the runtime load a draft or release?
- What is the difference between a draft, a project, a release, and a save?
- What sequence of modules runs when the player presses a key or the editor publishes a release?

## High-Level Architecture

```mermaid
flowchart LR
    A[Author / Player] --> B[apps/web]
    B --> C[packages/editor-core]
    B --> D[packages/runtime-core]
    B --> E[packages/runtime-2d]
    B --> F[packages/persistence]
    B --> G[packages/project-api]
    B --> H[packages/validation]
    G --> I[apps/api]
    I --> H
    I --> J[apps/api/data/store.json]
    D --> K[packages/content-schema]
    H --> K
    K --> L[packages/domain]
    C --> L
    D --> L
    E --> L
```

## Package Responsibilities

### `packages/domain`

Defines the shared vocabulary of the application:

- IDs such as `MapId`, `EntityId`, `DialogueId`
- core content types such as `AdventurePackage`, `MapDefinition`, `EntityDefinition`, `TriggerDefinition`
- rule/action/condition unions shared across the editor, validation, and runtime

This package is the lowest-level shared contract.

### `packages/content-schema`

Owns adventure-package ingestion:

- reads raw authored content
- normalizes shorthand raw content into full `AdventurePackage` structures
- provides base schema validation
- provides migration/parse entry points

This is where raw content becomes structured game content.

### `packages/validation`

Owns deeper publish-readiness checks:

- map geometry checks
- start-state checks
- exit target checks
- entity placement bounds checks
- dialogue node checks
- trigger condition/action reference checks
- validation summaries and blocking state

This package is now the shared truth for whether a draft is publishable.

### `packages/editor-core`

Owns pure editing operations:

- clone the adventure package
- change metadata
- paint tiles
- move entity instances
- list map entities and palette values

This keeps editing logic separate from browser DOM code.

### `packages/runtime-core`

Owns game simulation:

- create sessions from an `AdventurePackage`
- dispatch player commands
- execute triggers and dialogue
- move the player between maps
- update runtime state and emit events
- serialize runtime snapshots
- process phase-1 enemy AI

This package is renderer-agnostic.

### `packages/runtime-2d`

Owns presentation of runtime state on a canvas:

- draw maps
- draw entities
- draw the player marker
- reflect tile overrides and current session state visually

### `packages/persistence`

Owns local browser persistence:

- local runtime saves
- local draft saves
- IndexedDB access
- save/draft record wrappers around canonical content or runtime snapshots

### `packages/project-api`

Owns shared client/server contract for backend operations:

- project DTOs
- release DTOs
- validation request contract
- browser API client methods

### `apps/web`

Owns browser behavior and UI:

- runtime host page
- editor page
- keyboard handling
- DOM updates
- status panels
- project/release controls
- calling the API client
- calling local persistence

### `apps/api`

Owns local backend behavior:

- session endpoint
- project CRUD-like draft endpoints
- release publish endpoints
- validation endpoint
- asset metadata endpoint
- file-backed local storage

## Data Model Layers

```mermaid
flowchart TD
    A[Raw authored content] --> B[content-schema readAdventurePackage]
    B --> C[AdventurePackage]
    C --> D[validation report]
    C --> E[runtime session]
    C --> F[editor draft]
    F --> G[project draft on API]
    G --> H[release snapshot]
    E --> I[RuntimeSnapshot save]
```

### Raw authored content

For the sample adventure, authored content lives in:

- [sampleAdventure.ts](H:\My%20Drive\Repos\ACS\apps\web\src\sampleAdventure.ts)

This is now raw content data rather than content mixed with helper constructors.

### Normalized content

`readAdventurePackage(...)` in `packages/content-schema` converts raw content into a full `AdventurePackage`.

### Drafts

A draft is mutable. It can exist in two places:

- local IndexedDB draft in the browser
- mutable project draft in the API store

### Releases

A release is immutable. It is a frozen snapshot of the project draft at publish time.

### Saves

A runtime save is not a content package. It is a serialized `RuntimeSnapshot` taken from a running session.

## Runtime Flow

### Runtime boot

```mermaid
sequenceDiagram
    participant Browser as apps/web runtime host
    participant Schema as content-schema
    participant Engine as runtime-core
    participant Renderer as runtime-2d
    participant Persist as persistence
    participant API as project-api / apps-api

    Browser->>Browser: choose source (sample, draft, or release)
    alt sample
      Browser->>Schema: readAdventurePackage(sampleAdventureData)
    else draft
      Browser->>Persist: load draft by key
      Persist-->>Browser: stored AdventurePackage
    else release
      Browser->>API: getRelease(releaseId)
      API-->>Browser: ReleaseRecord.package
    end
    Browser->>Engine: loadAdventure(adventurePackage, optionalSnapshot)
    Engine-->>Browser: GameSession
    Browser->>Renderer: new CanvasGameRenderer(canvas, adventurePackage)
    Browser->>Renderer: render(session state)
```

### Command dispatch flow

A player action goes through a strict path:

1. browser input handler creates a `PlayerCommand`
2. command is dispatched to `runtime-core`
3. runtime updates session state and emits events
4. browser host updates UI panels
5. renderer redraws the canvas

```mermaid
sequenceDiagram
    participant User
    participant Web as apps/web index.ts
    participant Session as runtime-core GameSession
    participant Renderer as runtime-2d

    User->>Web: press key
    Web->>Session: dispatch(command)
    Session-->>Web: EngineResult(state, events)
    Web->>Web: update event log and panels
    Web->>Renderer: render(state)
```

### End-to-end example: stepping through the door to the shrine

```mermaid
sequenceDiagram
    participant User
    participant Web as apps/web index.ts
    participant Engine as runtime-core
    participant Content as AdventurePackage.maps
    participant Renderer as runtime-2d

    User->>Web: move onto door tile
    Web->>Engine: dispatch({ type: "move", direction: ... })
    Engine->>Content: inspect current map exits
    Content-->>Engine: exit at current coordinates
    Engine->>Engine: switch currentMapId and player coordinates
    Engine-->>Web: state + teleported event
    Web->>Renderer: render(new state)
```

## Editor Flow

### Editor boot

```mermaid
sequenceDiagram
    participant Editor as apps/web editor.ts
    participant Persist as persistence
    participant API as project-api / apps-api
    participant Schema as content-schema

    Editor->>Schema: readAdventurePackage(sampleAdventureData)
    Editor->>Persist: getDraft(draftKey)
    alt local draft exists
      Persist-->>Editor: stored draft
    else no local draft
      Editor->>Editor: use built-in sample adventure
    end
    Editor->>API: getSession()
    API-->>Editor: local designer session
    Editor->>Editor: render metadata, brush, grid, validation, project panel
```

### Tile brush behavior

The tile brush is a persistent editor state, not a one-shot action.

```mermaid
flowchart TD
    A[Select Tiles mode] --> B[Choose tile id]
    B --> C[Active Brush updated]
    C --> D[Pointer down on cell]
    D --> E[setTileAt in editor-core]
    E --> F[draft AdventurePackage updated]
    F --> G[local validation reruns]
    G --> H[cell re-renders]
    H --> I[drag continues painting more cells]
```

### End-to-end example: Validate Draft

```mermaid
sequenceDiagram
    participant User
    participant Editor as apps/web editor.ts
    participant LocalVal as packages/validation
    participant APIClient as packages/project-api
    participant API as apps/api
    participant SharedVal as packages/validation

    User->>Editor: click Validate Draft
    Editor->>Editor: ensure local draft is current
    Editor->>LocalVal: validateAdventure(draft)
    LocalVal-->>Editor: local validation report
    Editor->>APIClient: validateAdventure({ draft })
    APIClient->>API: POST /api/validation/adventure
    API->>SharedVal: validateAdventure(draft)
    SharedVal-->>API: validation report
    API-->>APIClient: validation report JSON
    APIClient-->>Editor: validation report
    Editor->>Editor: update server validation status
```

## Project And Release Flow

### Draft -> project -> release

```mermaid
flowchart LR
    A[Local draft in IndexedDB] --> B[Create Project]
    B --> C[Mutable project draft in API store]
    C --> D[Save Project]
    D --> C
    C --> E[Publish Release]
    E --> F[Immutable release snapshot]
    F --> G[Open Latest Release in runtime]
```

### End-to-end example: Publish Release

```mermaid
sequenceDiagram
    participant User
    participant Editor as apps/web editor.ts
    participant Persist as persistence
    participant APIClient as project-api
    participant API as apps/api
    participant Val as validation
    participant Store as store.json

    User->>Editor: click Publish Release
    Editor->>Editor: check local validation report
    Editor->>Persist: save local draft
    Editor->>APIClient: saveProjectDraft(projectId, draft)
    APIClient->>API: PUT /api/projects/:id/draft
    API->>Val: validateAdventure(draft)
    Val-->>API: report
    API->>Store: update mutable project draft
    Editor->>APIClient: publishRelease(projectId)
    APIClient->>API: POST /api/projects/:id/releases
    API->>Val: validateAdventure(project.draft)
    Val-->>API: report
    alt report has blocking errors
      API-->>APIClient: 400 validation failure
      APIClient-->>Editor: publish error
    else report is publishable
      API->>Store: write immutable release snapshot
      API-->>APIClient: ReleaseRecord + validationReport
      APIClient-->>Editor: release published
    end
```

## Save And Load Flow

### Runtime save flow

```mermaid
sequenceDiagram
    participant User
    participant RuntimePage as apps/web index.ts
    participant Engine as runtime-core
    participant Persist as persistence

    User->>RuntimePage: click Save
    RuntimePage->>Engine: serializeSnapshot()
    Engine-->>RuntimePage: RuntimeSnapshot
    RuntimePage->>Persist: putSave(slotId, snapshot)
    Persist-->>RuntimePage: save record metadata
    RuntimePage->>RuntimePage: update save status label
```

### Runtime load flow

```mermaid
sequenceDiagram
    participant User
    participant RuntimePage as apps/web index.ts
    participant Persist as persistence
    participant Engine as runtime-core

    User->>RuntimePage: click Load
    RuntimePage->>Persist: getSave(slotId)
    Persist-->>RuntimePage: saved RuntimeSnapshot
    RuntimePage->>Engine: loadAdventure(package, snapshot)
    Engine-->>RuntimePage: restored GameSession
    RuntimePage->>RuntimePage: rerender page and canvas
```

## Validation Rules In Practice

The shared validation package currently checks categories like:

- missing or unknown start map
- start position outside the chosen map
- map region references that do not exist
- tile layer size mismatches
- wrong tile count for a layer
- exits whose source or destination are out of bounds
- entity placements outside map bounds
- overlapping entities on one map tile (warning)
- empty dialogue definitions
- duplicate dialogue node ids
- dialogue choices pointing to missing nodes
- trigger map locations that are missing or invalid
- conditions referencing missing items or quests
- actions referencing missing maps, items, or dialogues

## Major End-to-End Behaviors

### Behavior 1: Talk to the Oracle

1. Browser key handler maps `E` to `{ type: "interact" }`.
2. Runtime finds the adjacent Oracle entity.
3. Runtime executes matching `onInteractEntity` triggers.
4. Trigger actions start dialogue and set quest flags.
5. Browser updates dialogue overlay and event log.

### Behavior 2: Reach the shrine altar

1. Player walks onto the altar tile.
2. Runtime evaluates `onEnterTile` triggers.
3. Matching shrine trigger grants the Solar Seal.
4. Runtime changes the altar tile state.
5. Renderer shows the updated tile and UI reflects the new inventory/flags.

### Behavior 3: Publish a valid release

1. Editor validates the draft locally.
2. User optionally runs `Validate Draft` against the API.
3. User saves the project draft.
4. API validates again before publish.
5. API creates an immutable release and stores the validation report alongside it.
6. Editor can open the latest release in the runtime.

### Behavior 4: Load a published release and save progress

1. Runtime fetches the release package by release id.
2. Runtime boots a session from that package.
3. Save slot id is namespaced to the release.
4. Player saves progress.
5. Later loads return to that exact release-based session snapshot.

## Current Limits Of The Architecture

The structure is intentionally modular, but a few things are still early-stage:

- `runtime-2d` still hardcodes simple visual conventions
- the editor can paint and reposition but not yet create full new content types
- the local API is file-backed rather than database-backed
- release discovery and user accounts are still minimal
- documentation now explains the pieces clearly, but some guide graphics are illustrative rather than fully live captures

## Recommended Reading Order

If you are trying to learn the codebase quickly, this order works well:

1. `docs/user-guide.md`
2. `docs/architecture.md`
3. `docs/system-reference.md`
4. `packages/domain/src/index.ts`
5. `packages/content-schema/src/index.ts`
6. `packages/validation/src/index.ts`
7. `packages/runtime-core/src/index.ts`
8. `apps/web/src/editor.ts`
9. `apps/web/src/index.ts`
10. `apps/api/src/index.ts`
