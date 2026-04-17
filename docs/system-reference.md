# ACS System Reference

This document explains how the current ACS application is assembled, how each package participates in the application, and what happens during concrete end-to-end actions. It is meant to be the technical companion to the user guide: the user guide explains how to use the application, while this reference explains what the application does internally.

## Purpose

Use this document when you want to answer questions like:

- Which package owns browser input, simulation, rendering, editing, validation, persistence, or publishing?
- What happens from the moment a player presses a movement key until the canvas redraws?
- What happens when the player presses `Q` to inspect?
- What happens when a designer paints a tile in the editor?
- What happens when a designer places a new entity instance from a reusable definition?
- How do raw content, normalized content, drafts, releases, and runtime saves differ?
- Where should future features be added without tangling engine logic, editor logic, and rendering logic together?

## High-Level Architecture

```mermaid
flowchart LR
    User[Author or Player]
    Web[apps/web\nBrowser UI]
    API[apps/api\nLocal backend]
    Schema[packages/content-schema\nRead + normalize content]
    Domain[packages/domain\nShared types]
    Runtime[packages/runtime-core\nSimulation + commands]
    Renderer[packages/runtime-2d\nCanvas rendering]
    Editor[packages/editor-core\nPure editing operations]
    Validation[packages/validation\nPublish readiness]
    Persistence[packages/persistence\nIndexedDB saves + drafts]
    ProjectApi[packages/project-api\nClient/server DTOs]
    Store[(apps/api/data/store.json)]
    IndexedDb[(Browser IndexedDB)]

    User --> Web
    Web --> Schema
    Web --> Runtime
    Web --> Renderer
    Web --> Editor
    Web --> Validation
    Web --> Persistence
    Web --> ProjectApi
    ProjectApi --> API
    API --> Validation
    API --> Store
    Persistence --> IndexedDb
    Schema --> Domain
    Runtime --> Domain
    Renderer --> Domain
    Editor --> Domain
    Validation --> Domain
```

The architecture deliberately separates content, simulation, rendering, editing, persistence, and API concerns. That keeps the current 2D browser implementation flexible enough to support later phases such as richer graphics, additional renderers, real-time simulation, or more advanced AI without rewriting the content model from scratch.

## Package Responsibilities

| Area | Package or app | Responsibility |
| --- | --- | --- |
| Shared vocabulary | `packages/domain` | Defines IDs, adventure packages, maps, entities, triggers, dialogue, actions, and conditions. |
| Content ingestion | `packages/content-schema` | Reads raw authored content and normalizes it into an `AdventurePackage`. |
| Runtime simulation | `packages/runtime-core` | Owns player commands, state mutation, triggers, dialogue, enemy turns, snapshots, and engine events. |
| Runtime rendering | `packages/runtime-2d` | Draws runtime state to a canvas. It receives state; it does not decide game rules. |
| Editing rules | `packages/editor-core` | Provides pure functions such as `setTileAt`, `addEntityInstance`, `moveEntityInstance`, and metadata updates. |
| Validation | `packages/validation` | Checks whether a package is publishable and reports warnings/errors. |
| Local persistence | `packages/persistence` | Stores runtime saves and editor drafts in IndexedDB. |
| API contract | `packages/project-api` | Defines project/release DTOs and browser API client methods. |
| Browser app | `apps/web` | Wires DOM events to runtime/editor operations and updates UI panels. |
| Local backend | `apps/api` | Stores projects/releases, validates packages, and exposes local API endpoints. |

## Data Model Layers

```mermaid
flowchart TD
    Raw[Raw authored content\napps/web/src/sampleAdventure.ts]
    Read[readAdventurePackage\ncontent-schema]
    Package[AdventurePackage\ncanonical game content]
    Draft[Editor draft\nmutable content copy]
    Project[Project draft\nmutable API record]
    Release[Release\nimmutable content snapshot]
    Session[GameSession\nruntime state machine]
    Snapshot[RuntimeSnapshot\nsave-game state]
    Validation[ValidationReport\nerrors + warnings]

    Raw --> Read --> Package
    Package --> Draft
    Draft --> Project
    Project --> Release
    Package --> Session
    Session --> Snapshot
    Package --> Validation
    Draft --> Validation
    Project --> Validation
```

Important distinctions:

- Raw content is author-friendly data. In the sample, it lives in `apps/web/src/sampleAdventure.ts`.
- `readAdventurePackage(...)` turns raw content into a normalized `AdventurePackage`.
- A draft is mutable content used by the editor.
- A project draft is a mutable backend-side draft stored by `apps/api`.
- A release is an immutable content snapshot created from a valid project draft.
- A runtime save is not content. It is a `RuntimeSnapshot` that captures the state of a running session.

## Runtime Input-To-Rendering Overview

The runtime browser page is centered around one loop: input becomes a `PlayerCommand`, the command is dispatched into `runtime-core`, `runtime-core` returns new state plus events, and the browser redraws the canvas and side panels.

```mermaid
flowchart LR
    Input[Browser input\nkeyboard or button]
    Command[PlayerCommand\nmove / inspect / interact / etc]
    Dispatch[session.dispatch(command)]
    Engine[runtime-core\nmutates GameSessionState]
    Events[EngineResult\nstate + events]
    Panels[apps/web\nDOM panels + event log]
    Canvas[runtime-2d\ncanvas render]

    Input --> Command --> Dispatch --> Engine --> Events
    Events --> Panels
    Events --> Canvas
```

Primary runtime files:

- `apps/web/src/index.ts` owns the browser event listeners, save/load buttons, event log, side panels, and call to `renderer.render(...)`.
- `packages/runtime-core/src/index.ts` owns `PlayerCommand`, `GameSession`, `dispatch`, movement, inspection, triggers, dialogue, enemy turns, and snapshots.
- `packages/runtime-2d/src/index.ts` owns visual rendering of maps, entities, tile overrides, and the player marker.

## Use Case 1: Player Initiates A Move Command

This is the full path when the player presses an arrow key or `W`, `A`, `S`, or `D` in the browser.

```mermaid
sequenceDiagram
    autonumber
    participant User as Player
    participant Browser as apps/web index.ts
    participant Session as runtime-core GameSession
    participant Move as handleMove
    participant Triggers as trigger system
    participant Enemy as enemy phase
    participant Renderer as runtime-2d
    participant DOM as Browser panels

    User->>Browser: Press Arrow/WASD key
    Browser->>Browser: keydown handler maps key to direction
    Browser->>Session: dispatch({ type: "move", direction })
    Session->>Move: handleMove(direction, events)
    Move->>Move: compute next x/y from directionToDelta
    alt next position outside map
        Move-->>Session: movementBlocked(bounds)
    else next position occupied by entity
        Move-->>Session: movementBlocked(occupied)
    else valid destination
        Move->>Move: update state.player.x/y
        Move-->>Session: playerMoved event
        alt destination has map exit
            Move->>Move: set currentMapId and destination x/y
            Move-->>Session: teleported event
            Move->>Triggers: runMapLoadTriggers()
            Move->>Triggers: runTileTriggers()
        else no exit
            Move->>Triggers: runTileTriggers()
        end
    end
    Session->>Session: increment turn and emit turnEnded
    Session->>Enemy: resolveEnemyPhase()
    Enemy-->>Session: enemy events, if any
    Session-->>Browser: EngineResult(state, events)
    Browser->>DOM: appendEvents + render panels
    Browser->>Renderer: renderer.render(state)
```

Detailed move flow:

1. `window.addEventListener("keydown", ...)` in `apps/web/src/index.ts` receives the key.
2. The browser ignores repeated keydown events with `if (event.repeat) return;`.
3. Arrow keys and `WASD` call `runCommand(() => session.dispatch({ type: "move", direction }))`.
4. `runCommand(...)` executes the dispatch callback, appends returned events to the event history, then calls `renderEverything(result.state)`.
5. `runtime-core.dispatch(...)` sees command type `move`, calls `handleMove(...)`, and uses the returned boolean to decide whether the command consumed a turn.
6. `handleMove(...)` calculates the destination with `directionToDelta(...)`.
7. If the destination is outside the current map, the engine emits `movementBlocked` with reason `bounds` and does not move the player.
8. If the destination contains an active entity, the engine emits `movementBlocked` with reason `occupied` and does not move the player.
9. If the destination is valid, the engine updates `state.player.x` and `state.player.y`, then emits `playerMoved`.
10. If the destination is an exit tile, the engine updates `state.currentMapId` and player coordinates, emits `teleported`, runs map-load triggers, and runs tile triggers at the arrival tile.
11. If the destination is not an exit, the engine only runs tile triggers for the new tile.
12. If movement succeeded, `dispatch(...)` increments `state.turn`, emits `turnEnded`, and runs the enemy phase.
13. The browser receives `EngineResult`, converts events to readable log lines with `describeEvent(...)`, and updates DOM panels in `renderEverything(...)`.
14. `CanvasGameRenderer.render(state)` redraws the map, tile overrides, entities, and player marker.

Current behavior note: blocked movement does not consume a turn and does not grant enemies a free action. Enemy behavior profiles may define `turnInterval`; the sample Shrine Wolf uses `turnInterval: 3`, so it only acts on every third successful player turn.

## Use Case 2: Player Initiates An Inspect Command

This is the full path when the player presses `Q` in the browser.

```mermaid
sequenceDiagram
    autonumber
    participant User as Player
    participant Browser as apps/web index.ts
    participant Session as runtime-core GameSession
    participant Inspect as handleInspect
    participant Enemy as enemy phase
    participant Renderer as runtime-2d
    participant DOM as Browser panels

    User->>Browser: Press Q
    Browser->>Browser: keydown handler recognizes q/Q
    Browser->>Session: dispatch({ type: "inspect" })
    Session->>Inspect: handleInspect(undefined, events)
    Inspect->>Inspect: findEntityInDirection(undefined)
    alt adjacent active entity exists
        Inspect-->>Session: inspectResult("You inspect entity ...")
    else no adjacent entity
        Inspect-->>Session: inspectResult("You inspect (x,y) on map ...")
    end
    Session->>Session: increment turn and emit turnEnded
    Session->>Enemy: resolveEnemyPhase()
    Enemy-->>Session: enemy events, if any
    Session-->>Browser: EngineResult(state, events)
    Browser->>DOM: append inspect/enemy events
    Browser->>DOM: render map name, position, turn, flags, inventory, dialogue, event log
    Browser->>Renderer: renderer.render(state)
```

Detailed inspect flow:

1. `apps/web/src/index.ts` listens for `q` and `Q` in the same keydown handler as movement.
2. The browser calls `runCommand(() => session.dispatch({ type: "inspect" }))`.
3. `runtime-core.dispatch(...)` sees command type `inspect`, calls `handleInspect(...)`, and treats a completed inspection as a turn-consuming action.
4. `handleInspect(...)` calls `findEntityInDirection(direction)` with no direction because the browser currently sends no direction.
5. With no direction, `findEntityInDirection(...)` searches for the first active entity on the current map with Manhattan distance exactly `1` from the player.
6. If an adjacent entity exists, the engine emits `inspectResult` with a message like `You inspect entity 'entity_oracle'.`.
7. If no adjacent entity exists, the engine emits `inspectResult` describing the player's current coordinate and map id.
8. Inspect does not directly mutate player position, inventory, flags, tile overrides, dialogue, or map id.
9. After inspection, `dispatch(...)` increments `state.turn`, emits `turnEnded`, and runs the enemy phase.
10. The browser logs the inspect result and any enemy events, then calls `renderEverything(...)`.
11. The renderer redraws from state. Often the visible canvas will not change unless an enemy was eligible to act on its configured turn interval.

Current behavior note: inspect is intentionally treated as a turn-consuming action, but enemies still respect their `turnInterval`. If later design calls for a free-look inspect action, the behavior can be changed in `dispatch(...)` by returning `false` from `handleInspect(...)`.

## Runtime Rendering Details

```mermaid
flowchart TD
    State[GameSessionState]
    Package[AdventurePackage]
    Map[Current MapDefinition]
    Overrides[Tile overrides]
    Entities[Runtime entities]
    Canvas[HTML canvas]
    Panels[DOM side panels]

    State --> Map
    Package --> Map
    State --> Overrides
    State --> Entities
    Map --> Canvas
    Overrides --> Canvas
    Entities --> Canvas
    State --> Canvas
    State --> Panels
```

`renderEverything(state)` is the browser-side bridge between simulation and presentation. It calls `renderer.render(state)` for the canvas, then updates map name, player position, turn count, flags, inventory, dialogue overlay, and event log. This keeps the engine independent from HTML and canvas concerns.

## Editor Input-To-Draft Overview

The editor has a similar separation: browser UI collects intent, `editor-core` creates an updated package copy, validation reruns, and the browser updates the editor grid.

```mermaid
flowchart LR
    UI[Editor UI\nselects map/mode/brush]
    Pointer[Pointer event\non grid cell]
    Web[apps/web editor.ts]
    Core[editor-core\nsetTileAt / moveEntityInstance]
    Draft[AdventurePackage draft]
    Validation[validation\nvalidateAdventure]
    Grid[Editor grid cell]
    Project[Project controls]

    UI --> Pointer --> Web --> Core --> Draft
    Draft --> Validation
    Draft --> Grid
    Validation --> Project
```

Primary editor files:

- `apps/web/src/editor.ts` owns browser controls, pointer events, selected brush state, validation display, project buttons, and grid rendering.
- `packages/editor-core/src/index.ts` owns pure editing operations such as cloning the package, changing a tile, listing entity definitions, and adding/moving entity instances.
- `packages/validation/src/index.ts` owns local and server-side validation rules.
- `packages/persistence/src/index.ts` stores local drafts for save and playtest.

## Use Case 3: Designer Changes A Tile With The Editor Brush

This is the full path when a designer selects a tile type and paints a grid cell.

```mermaid
sequenceDiagram
    autonumber
    participant Designer as Designer
    participant Editor as apps/web editor.ts
    participant Core as editor-core
    participant Validation as packages/validation
    participant Grid as Editor grid DOM
    participant Project as Project panel

    Designer->>Editor: Select Tiles mode
    Designer->>Editor: Select tile id in tile dropdown
    Editor->>Editor: selectedTileId = tileSelect.value
    Editor->>Editor: renderBrushPreview + renderEditorHint
    Designer->>Editor: Pointer down on grid cell
    Editor->>Editor: beginTileBrush(x, y)
    Editor->>Editor: isTileBrushActive = true
    Editor->>Editor: paintTileAt(x, y)
    Editor->>Editor: skip if same cell already painted this drag
    Editor->>Editor: read current tile with getTileIdAt(x, y)
    alt current tile already matches brush
        Editor-->>Designer: no draft change needed
    else tile differs
        Editor->>Core: setTileAt(draft, currentMapId, x, y, tileId)
        Core->>Core: cloneAdventurePackage(pkg)
        Core->>Core: find map and active layer
        Core->>Core: index = y * map.width + x
        Core->>Core: layer.tileIds[index] = tileId
        Core-->>Editor: updated AdventurePackage
        Editor->>Grid: refreshGridCell(x, y)
        Editor->>Validation: validateAdventure(draft)
        Validation-->>Editor: ValidationReport
        Editor->>Project: renderProjectPanel()
    end
    Designer->>Editor: Drag into another cell
    Editor->>Editor: pointerenter calls paintTileAt(nextX, nextY)
    Designer->>Editor: Pointer up
    Editor->>Editor: endTileBrush()
```

Detailed tile-edit flow:

1. The designer chooses `Tiles` mode in the editor mode dropdown.
2. `syncModeVisibility()` shows the tile picker and brush preview.
3. The designer chooses a tile in `tileSelect`.
4. `selectedTileId` is updated and the editor calls `renderBrushPreview()` and `renderEditorHint()`.
5. `renderGrid()` builds one button per map cell.
6. In tile mode, each cell receives a `pointerdown` handler and a `pointerenter` handler.
7. `pointerdown` calls `beginTileBrush(x, y)` for the clicked cell.
8. `beginTileBrush(...)` sets `isTileBrushActive = true`, resets `lastPaintedCellKey`, and calls `paintTileAt(x, y)`.
9. `paintTileAt(...)` exits early if the editor is not in tile mode.
10. `paintTileAt(...)` also exits early if this is the same cell already painted during the current drag.
11. The editor chooses the tile id from `selectedTileId`, falling back to the select value or `grass`.
12. The editor reads the current tile with `getTileIdAt(x, y)`.
13. If the current tile already matches the brush, no draft change is made.
14. If the tile differs, the editor calls `setTileAt(draft, currentMapId, x, y, tileId)` from `editor-core`.
15. `setTileAt(...)` clones the whole `AdventurePackage`, finds the map, selects the active layer, calculates `index = y * map.width + x`, writes `layer.tileIds[index] = tileId`, and returns the new package.
16. The browser replaces its `draft` variable with the updated package.
17. `refreshGridCell(x, y)` updates only the changed grid cell instead of rebuilding the whole grid.
18. `markValidationDirty()` clears the latest server validation report and calls `renderValidation()`.
19. `renderValidation()` runs `validateAdventure(draft)` locally and updates the validation list.
20. `renderProjectPanel()` enables or disables project/release buttons based on validation state.
21. While the pointer remains down, moving into another cell triggers `pointerenter`, which calls `paintTileAt(...)` again. This is what makes the tile picker behave like a brush instead of a one-shot selection.
22. `window.pointerup` calls `endTileBrush()`, which turns off painting and clears the last-painted-cell key.

Current behavior note: painting a tile changes the editor draft only. It does not automatically change the currently running game. To play the edited content, use `Playtest Draft`; the editor saves the draft to IndexedDB and opens the runtime page with a `?draft=...` query parameter.


## Use Case 4: Designer Places A New Entity Instance

This is the full path when a designer uses entity mode to add a new enemy or NPC to the current map.

```mermaid
sequenceDiagram
    autonumber
    participant Designer as Designer
    participant Editor as apps/web editor.ts
    participant Core as editor-core
    participant Validation as packages/validation
    participant Grid as Editor grid DOM

    Designer->>Editor: Select Entities mode
    Editor->>Editor: show Move Entity, Add Definition, Place New
    Designer->>Editor: choose definition in Add Definition
    Editor->>Editor: selectedEntityDefinitionId = definition id
    Editor->>Editor: isPlacingNewEntity = true
    Designer->>Editor: click destination cell
    Editor->>Core: canPlaceEntityDefinition(draft, definitionId)
    alt singleton already exists
        Core-->>Editor: false
        Editor->>Editor: show Already placed hint
    else placement allowed
        Editor->>Core: addEntityInstance(draft, definitionId, mapId, x, y)
        Core->>Core: cloneAdventurePackage(pkg)
        Core->>Core: create unique entity instance id
        Core->>Core: push EntityInstance into entityInstances
        Core-->>Editor: updated AdventurePackage
        Editor->>Validation: validateAdventure(draft)
        Validation-->>Editor: ValidationReport
        Editor->>Grid: renderEditor()
    end
```

Detailed entity-placement flow:

1. The designer chooses `Entities` mode.
2. `syncModeVisibility()` hides tile-only controls and shows `Move Entity`, `Add Definition`, and `Place New`.
3. `renderPalette()` lists existing instances on the current map and reusable definitions from `entityDefinitions`.
4. Definitions whose placement rule is exhausted are disabled in the `Add Definition` dropdown.
5. Choosing a definition sets `selectedEntityDefinitionId`, clears `selectedEntityId`, and sets `entityEditIntent` to `place`.
6. Clicking a grid cell calls `applyEntityEdit(x, y)`.
7. If placing, the browser checks `canPlaceEntityDefinition(draft, definitionId)`.
8. `singleton` definitions return false once any instance of that definition exists anywhere in the adventure.
9. `multiple` definitions return true and can be placed repeatedly.
10. `addEntityInstance(...)` clones the package, creates a unique id such as `entity_wolf_1`, pushes a new `EntityInstance`, and returns the updated draft.
11. The editor reruns local validation and rerenders the grid and entity summary.
12. Playtesting uses the same draft package, so the runtime sees the newly placed entity without a separate conversion step.

Current behavior note: Milestone 9 adds entity instance creation and movement. It still does not add deletion of instances or creation of brand-new entity definitions from the browser UI.
## Editor-To-Playtest Flow

```mermaid
sequenceDiagram
    autonumber
    participant Designer as Designer
    participant Editor as apps/web editor.ts
    participant Persist as packages/persistence
    participant RuntimePage as apps/web index.ts
    participant Engine as runtime-core
    participant Renderer as runtime-2d

    Designer->>Editor: Click Playtest Draft
    Editor->>Persist: putDraft(DRAFT_KEY, draft)
    Persist-->>Editor: draft record
    Editor->>RuntimePage: window.open('/apps/web/index.html?draft=...')
    RuntimePage->>Persist: getDraft(draftKey)
    Persist-->>RuntimePage: AdventurePackage draft
    RuntimePage->>Engine: loadAdventure(activeAdventure)
    Engine-->>RuntimePage: GameSession
    RuntimePage->>Renderer: render(session.getState())
```

## Validation And Publishing Flow

```mermaid
sequenceDiagram
    autonumber
    participant Designer as Designer
    participant Editor as apps/web editor.ts
    participant LocalVal as packages/validation
    participant Client as project-api client
    participant API as apps/api
    participant ServerVal as packages/validation
    participant Store as store.json

    Designer->>Editor: Edit draft
    Editor->>LocalVal: validateAdventure(draft)
    LocalVal-->>Editor: local ValidationReport
    Designer->>Editor: Click Validate Draft
    Editor->>Client: validateAdventure({ draft })
    Client->>API: POST /api/validation/adventure
    API->>ServerVal: validateAdventure(draft)
    ServerVal-->>API: server ValidationReport
    API-->>Client: report JSON
    Client-->>Editor: server ValidationReport
    Designer->>Editor: Click Save Project / Publish Release
    Editor->>Client: saveProjectDraft or publishRelease
    Client->>API: request with project id and draft/release intent
    API->>ServerVal: validateAdventure(project draft)
    alt blocking validation errors
        API-->>Client: reject publish/save as needed
    else publishable
        API->>Store: persist project draft or immutable release
        API-->>Client: ProjectRecord or ReleaseRecord
    end
```

Validation currently checks categories such as:

- missing or unknown start map
- start position outside map bounds
- map region references that do not exist
- tile layer size mismatches
- wrong tile count for a layer
- exit source or destination out of bounds
- entity placements outside map bounds
- overlapping entities on one tile as a warning
- empty dialogue definitions
- duplicate dialogue node ids
- dialogue choices pointing to missing nodes
- trigger map locations that are missing or invalid
- conditions referencing missing items or quests
- actions referencing missing maps, items, tiles, or dialogues

## Save And Load Flow

```mermaid
sequenceDiagram
    autonumber
    participant Player as Player
    participant RuntimePage as apps/web index.ts
    participant Session as runtime-core GameSession
    participant Persist as packages/persistence

    Player->>RuntimePage: Click Save
    RuntimePage->>Session: serializeSnapshot()
    Session-->>RuntimePage: RuntimeSnapshot
    RuntimePage->>Persist: saveSession({ id, label, adventure info, snapshot })
    Persist-->>RuntimePage: RuntimeSaveRecord
    RuntimePage->>RuntimePage: update save status and event log

    Player->>RuntimePage: Click Load
    RuntimePage->>Persist: loadSession(saveSlotId)
    Persist-->>RuntimePage: RuntimeSaveRecord
    RuntimePage->>Session: engine.loadAdventure(activeAdventure, record.snapshot)
    RuntimePage->>RuntimePage: renderEverything(restored state)
```

A save wraps the runtime's existing `RuntimeSnapshot`. That means persistence stores the same state model the engine already knows how to serialize and hydrate. The project does not maintain a second, competing save-game model.

## End-To-End Runtime Example: Move Onto A Trigger Tile

```mermaid
flowchart TD
    Key[Player presses movement key]
    Dispatch[dispatch move]
    Move[handleMove updates player]
    Tile[runTileTriggers]
    Condition{conditionsMatch?}
    Action[applyTriggerActions]
    Events[triggerFired + action events]
    Enemy[resolveEnemyPhase]
    Render[renderEverything + canvas redraw]

    Key --> Dispatch --> Move --> Tile --> Condition
    Condition -- no --> Enemy
    Condition -- yes --> Action --> Events --> Enemy
    Enemy --> Render
```

Example: when the player reaches the shrine altar in the sample adventure, the engine can run an `onEnterTile` trigger, grant an item, set flags, or change a tile. Those changes are represented as state changes and events, then the renderer redraws using the new state.

## End-To-End Editor Example: Change A Tile, Validate, Then Play

```mermaid
flowchart TD
    Brush[Select tile or entity brush]
    Paint[Paint tile or place entity]
    Core[editor-core setTileAt/addEntityInstance]
    Draft[Updated AdventurePackage draft]
    Validate[validateAdventure]
    Save[putDraft to IndexedDB]
    Play[Open runtime with draft query]
    Runtime[engine.loadAdventure draft]
    Render[Canvas renders edited map]

    Brush --> Paint --> Core --> Draft --> Validate
    Draft --> Save --> Play --> Runtime --> Render
```

This flow is important because the editor and runtime share the same content representation. The editor does not produce a special editor-only format. It updates an `AdventurePackage`, validates that package, stores it as a draft, and the runtime can load that same package for playtesting.


## Milestone 10 Runtime Visual Modes

Milestone 10 implements the first classic ACS presentation mode without changing `runtime-core`. The runtime still loads an `AdventurePackage`, dispatches commands through `GameSession`, and emits `GameSessionState`. The browser can now ask `runtime-2d` to render that same state in either `classic-acs` mode or `debug-grid` mode.

```mermaid
flowchart LR
    Input[Browser input]
    Engine[runtime-core dispatch]
    State[GameSessionState]
    Renderer[runtime-2d CanvasGameRenderer]
    Classic[classic-acs panel]
    Debug[debug-grid canvas]

    Input --> Engine --> State --> Renderer
    Renderer --> Classic
    Renderer --> Debug
```

The classic renderer currently draws a procedural vintage panel:

- fixed 640 by 400 canvas surface
- map viewport centered inside a black playfield
- right-side `POWER` and `LIFE` rails
- bottom message band with actor, map, turn, and movement prompt text
- tile/icon drawing with pixelated blocks and a restrained palette

This is intentionally not a second engine. Switching visual mode does not reset the session, change saves, change triggers, or change enemy AI. It only changes how the current state is drawn.
## Current Design Constraints And Extension Points

The current design intentionally avoids locking the project into the current 2D implementation.

- A higher-resolution renderer can be introduced beside `runtime-2d` as long as it consumes `AdventurePackage` and `GameSessionState`.
- A 3D renderer could also consume the same state, though content would need richer spatial and asset metadata.
- Real-time play would likely require changing how `dispatch(...)`, turn advancement, enemy `turnInterval`, and enemy phases are scheduled, but the command/state/event boundary is a good place to evolve that behavior.
- Richer enemy AI should live in `runtime-core` or a future AI package, not in `apps/web` or `runtime-2d`.
- More advanced editor creation tools should extend `editor-core` with pure operations first, then wire those operations into `apps/web/src/editor.ts`.
- Asset manifests should continue to describe assets by id and metadata, so renderers can choose how to resolve those ids without hardcoded visual assumptions.


## Milestone 13 Dialogue And Trigger Editing

Milestone 13 extends the construction set from map/entity placement into authored text and structured rules. It still follows the same boundary as earlier editor work: browser controls gather intent, `editor-core` clones and updates the `AdventurePackage`, validation reruns, and playtest loads the same draft package.

```mermaid
sequenceDiagram
    participant User as Designer
    participant Editor as apps/web editor.ts
    participant Core as editor-core
    participant Draft as AdventurePackage draft
    participant Validation as validation
    participant Runtime as runtime-core playtest

    User->>Editor: Edit dialogue speaker/text/continue label
    Editor->>Core: updateDialogueNode(draft, dialogueId, nodeId, updates)
    Core->>Draft: clone package and update DialogueNode
    Editor->>Validation: validateAdventure(updated draft)
    User->>Editor: Edit trigger type/location/conditions/actions
    Editor->>Editor: parse conditions/actions JSON arrays
    alt JSON invalid
        Editor-->>User: show status and keep previous trigger data
    else JSON valid
        Editor->>Core: updateTriggerDefinition(draft, triggerId, updates)
        Core->>Draft: clone package and update TriggerDefinition
        Editor->>Validation: validateAdventure(updated draft)
    end
    User->>Editor: Playtest Draft
    Editor->>Runtime: save draft and open runtime with ?draft=...
    Runtime->>Draft: load updated dialogue and triggers
```

End-to-end trigger editing example:

1. The designer chooses `trigger_shrine_reward` in the `Rule Trigger` panel.
2. `renderTriggerEditor()` populates form fields from the selected `TriggerDefinition`.
3. The designer changes the `actions` JSON, for example changing a `showDialogue` action or adjusting a `changeTile` target tile id.
4. `applyTriggerEditorChanges()` parses both JSON textareas as arrays. This prevents malformed rule data from being saved silently.
5. If parsing succeeds, the editor calls `updateTriggerDefinition(...)` in `editor-core`.
6. `editor-core` clones the package and updates only the selected trigger record.
7. The editor reruns validation and updates the project controls.
8. When the designer clicks `Playtest Draft`, the runtime loads that same draft. No editor-only conversion step exists.
9. During gameplay, `runtime-core` evaluates the updated trigger through `runTriggers(...)`, `conditionsMatch(...)`, and `applyTriggerActions(...)`.

End-to-end dialogue editing example:

1. The designer chooses `dialogue_intro` in the `Dialogue Text` panel.
2. The editor shows the first dialogue node's speaker, text, and continue label.
3. Typing in the fields calls `applyDialogueEditorChanges()`.
4. The browser calls `updateDialogueNode(...)` in `editor-core`.
5. Any trigger action that references the same dialogue id, such as `{ "type": "showDialogue", "dialogueId": "dialogue_intro" }`, will show the revised text in the runtime.

Current limitation: Milestone 13 edits existing dialogue and trigger records. Brand-new trigger/dialogue creation, deletion, and a fully visual no-JSON rule builder remain future work.
## Milestone 12 Entity Definition Editing

Milestone 12 adds the first reusable definition editor to the browser construction set. The key model distinction is:

- `EntityDefinition`: reusable template data such as name, kind, placement policy, sprite asset id, faction, and behavior.
- `EntityInstance`: a placed copy on a map with an id, `definitionId`, `mapId`, x, and y.

```mermaid
sequenceDiagram
    autonumber
    participant User as Designer
    participant Editor as apps/web editor.ts
    participant Core as editor-core
    participant Draft as AdventurePackage draft
    participant Validation as validation
    participant Runtime as playtest runtime

    User->>Editor: Change definition field
    Editor->>Editor: read selected definition id
    Editor->>Core: updateEntityDefinition(draft, id, updates)
    Core->>Draft: clone package and mutate matching EntityDefinition
    Editor->>Validation: validateAdventure(updated draft)
    Validation-->>Editor: report warnings/errors
    User->>Editor: Playtest Draft
    Editor->>Runtime: save draft and open runtime with ?draft=...
    Runtime->>Draft: load same definitions and instances
```

End-to-end behavior:

1. The editor sidebar renders an `Entity Definition` panel from `draft.entityDefinitions`.
2. Selecting a definition stores `selectedDefinitionEditorId` separately from the selected placed entity instance.
3. Field changes call `applyDefinitionEditorChanges()` in `apps/web/src/editor.ts`.
4. That function builds a partial `EntityDefinition` update from the form fields.
5. `editor-core.updateEntityDefinition(...)` clones the package, finds the matching definition, and applies the update.
6. The editor reruns local validation, refreshes entity placement controls, updates the entity summary, and keeps the draft/project panels in sync.
7. Existing `EntityInstance` records do not need to change because they reference the definition by `definitionId`.
8. Playtesting the draft loads the updated definition data through the same `AdventurePackage` path as normal gameplay.

This keeps future definition editors aligned with the architecture: pure package operations live in `editor-core`, while browser controls only gather input and render feedback.
## Milestone 11 Sprite Manifests And Classic Asset Sets

Milestone 11 moves the classic visual mode from hardcoded tile/entity assumptions toward manifest-driven presentation data. The game simulation still does not know about sprites. `runtime-core` continues to emit state only; `runtime-2d` decides how to draw that state by consulting the adventure's `visualManifests`.

```mermaid
flowchart LR
    TileId[Tile id from map layer]
    EntityAsset[Entity assetId]
    Manifest[VisualManifestDefinition classic-acs]
    SpriteStyle[ClassicSpriteStyle pattern + palette]
    Renderer[runtime-2d classic renderer]
    Canvas[Canvas pixels]

    TileId --> Manifest
    EntityAsset --> Manifest
    Manifest --> SpriteStyle
    SpriteStyle --> Renderer
    Renderer --> Canvas
```

End-to-end classic tile rendering now works like this:

1. The browser loads `sampleAdventureData` and `content-schema` normalizes it into an `AdventurePackage`.
2. The package includes `visualManifests[0]`, a `classic-acs` manifest named `Classic Solar Seal Sprite Set`.
3. The renderer stores that manifest when `CanvasGameRenderer` is constructed.
4. During `renderClassic(...)`, each map coordinate still resolves to a logical tile id such as `grass`, `door`, or `altar-lit`.
5. Instead of switching directly on those tile ids as the source of truth, `drawClassicTile(...)` asks `resolveClassicTileSprite(tileId)` for a `ClassicSpriteStyle`.
6. The sprite style contains a pattern such as `dither`, `door`, `altar`, or `floor`, plus palette values such as fill, shadow, accent, and line colors.
7. `drawClassicSprite(...)` draws the selected style onto the canvas.
8. If a tile is missing from the manifest, `runtime-2d` falls back to built-in defaults so older content remains playable.

End-to-end classic entity rendering now works like this:

1. Entity definitions can carry an `assetId`, such as `sprite_hero`, `sprite_oracle`, or `sprite_wolf`.
2. The classic manifest maps those sprite IDs to `ClassicSpriteStyle` records.
3. `drawClassicEntity(...)` resolves the entity definition, checks `definition.assetId`, and looks up the corresponding manifest entry.
4. If no asset-specific sprite exists, the renderer falls back by entity definition id and then by entity kind.
5. The player uses the first party definition from `state.player.party`, so the hero sprite is still content-driven rather than hardcoded in the renderer.

Validation now checks the manifest layer too. `packages/validation` warns when an adventure has no `classic-acs` visual manifest, when a used tile id has no classic tile sprite, or when an entity `assetId` has no classic entity sprite. These are warnings instead of hard errors because the renderer still has safe fallbacks.
## Forward Milestone Path: Classic ACS Feel

The project should deliberately capture the feel of the original 1980s Adventure Construction Set while keeping the engine free of renderer assumptions. The legacy image set points to two major tracks: a classic gameplay panel and deeper construction-set authoring tools.

### Classic Runtime Presentation

The classic runtime mode should be a presentation layer, not a different game engine. It should consume `AdventurePackage`, `RuntimeSnapshot`, and `GameSessionState` just like the current renderer.

```mermaid
flowchart LR
    Content[AdventurePackage]
    Engine[runtime-core]
    State[GameSessionState]
    Debug[runtime-2d simple/debug view]
    Classic[classic-acs visual mode]
    Future[future HD 2D or 3D renderer]

    Content --> Engine --> State
    State --> Debug
    State --> Classic
    State --> Future
```

The target visual structure is:

- fixed-aspect vintage gameplay panel
- tile/icon map viewport on a dark field
- right-side status rail for life, power, and future actor resources
- bottom message band for location names, prompts, interaction text, and command hints
- pixelated sprite scaling and controlled palette
- asset IDs resolved through manifests so the same map can later render with HD or 3D assets

### Classic Editor Capability Track

The old editor suggests several authoring modes that should become future milestones:

- terrain/tile picture selection and eventually editing
- creature picture selection and eventually editing
- thing/item picture selection and eventually editing
- map creation, deletion, floor/category assignment, and exit/portal wiring
- reusable entity, item, terrain, and actor definitions
- actor profile fields such as life force, power, speed, skills, weapons, armor, and possessions
- structured thing/trigger authoring for portals, messages, conditions, tile changes, inventory rewards, map travel, entity removal, and quest progress
- text/dialogue/introduction editing

### Proposed Forward Milestones

1. Milestone 10: completed `classic-acs` visual mode with a gameplay viewport, right status rail, bottom message band, and renderer theme switching.
2. Milestone 11: completed sprite manifests, a first classic asset set, entity sprite IDs, manifest-driven classic renderer lookup, and validation warnings for missing sprite references.
3. Milestone 12: completed the first entity definition editor slice for reusable entity metadata, placement policy, sprite asset IDs, faction, and behavior tuning.
4. Milestone 13: next, add thing, trigger, portal, text, and dialogue editors using structured rules/actions.
5. Milestone 14: add map scale and adventure-structure tools for world, region, local, interior, and dungeon-floor maps.
6. Milestone 15: add richer character/profile and possession systems, with runtime status rendering and editor support.

This path is intentionally compatible with later higher-resolution graphics or 3D. The classic mode is a historically inspired renderer and asset pack, not a constraint on the engine.
## Recommended Reading Order

If you are trying to learn the codebase quickly, read in this order:

1. `docs/user-guide.md`
2. `docs/architecture.md`
3. `docs/system-reference.md`
4. `packages/domain/src/index.ts`
5. `packages/content-schema/src/index.ts`
6. `packages/runtime-core/src/index.ts`
7. `packages/runtime-2d/src/index.ts`
8. `packages/editor-core/src/index.ts`
9. `packages/validation/src/index.ts`
10. `apps/web/src/index.ts`
11. `apps/web/src/editor.ts`
12. `apps/api/src/index.ts`
