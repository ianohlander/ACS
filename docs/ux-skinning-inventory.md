# UX Skinning Inventory

## Table of Contents

1. Purpose
2. Scope
3. Skinning Principles
4. Shared Primitives
5. Edit Mode Inventory
6. Play Mode Inventory
7. Dynamic And Generated Elements
8. Current Connection Points
9. Future Skin Skeleton Requirements
10. Maintenance Rule

## Purpose

This document is the durable source of truth for the UI elements that exist in the live application and will need skinning support later. It is based on the current implementation in:

- `apps/web/editor.html`
- `apps/web/index.html`
- `apps/web/styles.css`
- `apps/web/src/editor.ts`
- `apps/web/src/index.ts`

The goal is to make later UX skins predictable. A skin should be able to replace presentation without changing authoring or runtime behavior.

## Scope

This inventory covers:

- Edit Mode screens and controls
- Play Mode screens and controls
- shared CSS primitives and semantic surfaces
- dynamic UI elements created by TypeScript
- future connection points needed for skin packages

It does not catalog every content record in the game data. It catalogs the UI surfaces that present or manipulate that data.

## Skinning Principles

1. Editor behavior must stay separate from editor presentation.
2. Runtime rules must stay separate from gameplay presentation.
3. Skins should target semantic UI surfaces, not business logic.
4. Future milestones that add or change UI must update this inventory.
5. A future skin package should be able to swap tokens, borders, icons, panels, and screen shells without rewriting workflow logic.

## Shared Primitives

### Global shell and layout

- `body`
- `.shell`
- `.editor-shell`
- `.topbar`
- `.layout`
- `.editor-layout`
- `.editor-layout-organized`

### Typography and labels

- `.eyebrow`
- `.nav-kicker`
- `.section-kicker`
- `.subhead`
- `.section-note`
- `.save-status`
- `.brush-label`
- `.brush-value`

### Panels and cards

- `.panel`
- `.playfield-card`
- `.editor-section-card`
- `.dependency-panel`
- `.diagnostic-card`
- `.reskin-card`
- `.rule-builder`
- `.rule-builder-card`
- `.pixel-preview-card`
- `.library-flow-column`

### Interactive controls

- `.action-button`
- `.action-button.ghost`
- `.action-button:disabled`
- `.dialogue-button`
- `.mini-remove-button`
- `.check-field`
- `.stack-field`
- `.definition-grid`
- `.button-row`

### Lists and summaries

- `.validation-list`
- `.event-log`
- `.compact-list`
- `.rule-builder-list`
- `.state-grid`
- `.dependency-grid`
- AI Game Creation proposal summary rows in `#ai-game-proposal-list`

### Workspace and map editing

- `.editor-toolbar`
- `.workspace-toolbar`
- `.editor-grid`
- `.editor-cell`
- `.editor-cell.selected-cell`
- `.entity-chip`
- `.trigger-chip`
- `.editor-hint`
- `.brush-preview`
- `.brush-swatch`
- `.brush-copy`

### Pixel editor surfaces

- `.pixel-editor-grid`
- `.pixel-editor-cell`
- `.pixel-editor-layout`
- `.pixel-preview-panel`
- `.pixel-preview`
- `.pixel-preview-small`
- `.pixel-preview-large`
- `.pixel-preview-grouping`
- `.paint-color-control`
- `.paint-color-preview`

### Flow and hierarchy surfaces

- `.editor-nav`
- `.editor-nav a`
- `.editor-nav a.active`
- `.relationship-stack`
- `.relationship-branch`
- `.relationship-node`
- `.relationship-node.root`
- `.relationship-node.active`
- `.trigger-flow`
- `.trigger-flow span`
- `.library-flow`
- `.library-detail-column`

### Runtime presentation surfaces

- `#game-canvas`
- `.dialogue`
- `.dialogue-speaker`
- `.dialogue-text`
- `.runtime-toolbar`
- `.visual-mode-control`
- `.statusline`
- `.sidebar`

### Base tokens currently in CSS

Current CSS custom properties are minimal and should later expand into a fuller semantic token set:

- `--bg`
- `--panel`
- `--border`
- `--text`
- `--muted`
- `--accent`

## Edit Mode Inventory

### Top-level navigation and shell

Screen areas:

- Adventure
- World Atlas
- Map Workspace
- Libraries
- Logic
- Test & Publish
- Validation

Primary shell elements:

- milestone eyebrow
- product title
- `Back To Play` link button
- `Save Draft` button
- `Reset Draft` button
- `Playtest Draft` button
- left-side step navigation links

### Adventure Setup

Elements:

- panel card
- title text input
- description textarea
- draft status text

### World Atlas

Elements:

- panel card
- hierarchy visualization stack
- selected map dropdown
- current map name input
- map scale dropdown
- parent region dropdown
- map structure status text
- new map name input
- new map scale dropdown
- new map parent region dropdown
- width number input
- height number input
- fill tile input
- `Create Blank Map` button

Skinning notes:

- hierarchy nodes and branch lines should become semantic atlas components later
- `Fill Tile` is still a plain text input in the live UI and is already earmarked for milestone cleanup

### Map Workspace

Elements:

- map dropdown
- layer mode dropdown
- tile brush dropdown
- move-instance dropdown
- place-definition dropdown
- instance name input
- behavior override dropdown
- `Place New` button
- exit target map dropdown
- exit target x/y number inputs
- `Delete Selected Exit` button
- active tool preview card
- map cell grid
- per-cell overlays for entity chips, trigger chips, and exit markers
- editor hint text

Mode-sensitive surfaces:

- Terrain Tiles mode
- Entity Instances mode
- Trigger Markers mode
- Exits & Portals mode

### Selected Map Relations / Inspector

Elements:

- dependency summary cards
- entity summary list
- exit summary list
- map graph summary list
- selected cell inspector summary list

### Libraries

#### Shared library flow shell

Elements:

- library type dropdown
- category summary list
- category editor
- object summary list
- detail editor region

#### Category editor

Elements:

- category name input
- parent category dropdown
- category description input
- `Create Category` button
- category editor status text

#### Asset authoring / presentation editor

Elements:

- splash screen asset dropdown
- starting music cue dropdown
- intro text textarea
- pixel sprite dropdown
- paint color dropdown
- visible paint-color preview
- large paint-view pixel grid
- in-game preview canvas
- magnified preview canvas
- grouping preview canvas
- `Create Pixel Sprite` button
- asset editor status text

#### Entity definition editor

Elements:

- definition dropdown
- name input
- kind dropdown
- placement dropdown
- sprite asset id input
- faction input
- life / power / speed number inputs
- skills multi-select
- starting possessions multi-select
- behavior dropdown
- turn interval input
- detection input
- leash input
- wander radius input
- editor status text

#### Quest definition editor

Elements:

- quest dropdown
- name input
- summary textarea
- objective dropdown
- objective kind dropdown
- objective title input
- objective description textarea
- target map dropdown
- target item dropdown
- `Add Objective` button
- reward dropdown
- reward kind dropdown
- reward label input
- reward item dropdown
- `Add Reward` button
- source references input
- new quest name input
- `Create Quest Definition` button
- editor status text

#### Tile definition editor

Elements:

- tile definition dropdown
- name input
- passability dropdown
- description textarea
- interaction hint input
- tags input
- classic sprite id input
- new tile name input
- `Create Tile Definition` button
- editor status text

#### Dialogue definition editor

Elements:

- dialogue dropdown
- speaker input
- text textarea
- continue label input
- editor status text

### Logic & Quests

Elements:

- current map context dropdown
- trigger dropdown
- `Create Trigger` button
- `Duplicate` button
- `Delete` button
- trigger flow pill row
- trigger type dropdown
- trigger map dropdown
- trigger x/y number inputs
- run-once checkbox
- no-code builder shell
- condition type dropdown
- condition fieldsets
- `Add If` button
- condition list
- action type dropdown
- action fieldsets
- `Add Then` button
- action ordered list
- advanced conditions JSON textarea
- advanced actions JSON textarea
- trigger editor status text
- referenced objects list

### Test & Publish

#### Project status shell

Elements:

- API status text
- project status text
- server validation status text
- release summary list

#### Release notes card

Elements:

- release label input
- release notes textarea

#### Release action row

Elements:

- `Validate Draft`
- `Create Project`
- `Save Project`
- `Publish Release`
- `Open Latest Release`
- `Preview Release Handoff`
- `Export Release Handoff`
- `Preview Artifact Integrity`
- `Export Integrity Report`
- `Preview Review Package`
- `Export Review Package`
- `Preview Forkable Artifact`
- `Export Forkable Package`
- `Preview Standalone Package`
- `Export Standalone ZIP`

#### AI Game Creation card

Elements:

- AI intent selector
- AI model input
- AI prompt textarea
- AI prompt submit button
- AI proposal status text
- AI proposal summary list

#### Release information cards

Elements:

- Release Handoff Manifest status + list
- Artifact Integrity Report status + list
- Release Review Package status + list
- Forkable Artifact Preview status + list
- Standalone Package Preview status + list
- Release Readiness status + list
- Artifact Comparison status + list

#### Rename / reskin utility card

Elements:

- find display text input
- replace with input
- scope multi-select
- `Preview Rename`
- `Apply To Draft`
- rename summary text
- rename preview list

#### Diagnostics area

Elements:

- Authoring Diagnostics card
- diagnostics summary text
- diagnostics list
- Playtest Scenarios card
- scenario list

### Validation panel

Elements:

- validation summary text
- validation list

## Play Mode Inventory

### Top bar

Elements:

- milestone/version eyebrow
- runtime title
- `Open Editor` link button
- visual mode dropdown
- classic size dropdown
- map name text
- player position text

### Playfield card

Elements:

- main game canvas
- dialogue overlay shell
- dialogue speaker text
- dialogue body text
- continue button

### Sidebar panels

#### Adventure Intro

- intro summary text

#### Objective

- objective text

#### Session Source

- source status text

#### Controls

- instructional bullet list

#### Save Session

- `Save`
- `Load`
- `Reset`
- save status text

#### State

- turn count
- party summary
- profile summary
- flag summary
- inventory summary

#### Event Log

- ordered event log list

## Dynamic And Generated Elements

These are rendered or repopulated in code and need semantic hook stability later.

### Editor-generated

- select options for maps, tiles, entities, categories, quests, triggers, dialogue, assets, sounds, media, flags, items, skills, and palettes
- map grid buttons
- selected-cell overlays and contents
- pixel editor cells
- validation and diagnostics list items
- release summary list items
- handoff / integrity / review / forkable / standalone / readiness / comparison list items
- rename preview list items
- condition builder list items
- action builder list items
- trigger referenced-object list items

### Runtime-generated

- event log list items
- dialogue visibility state
- runtime status values

## Current Connection Points

These are the best current attachment points for future skins.

### Structural hooks

- HTML files:
  - `apps/web/editor.html`
  - `apps/web/index.html`
- shared stylesheet:
  - `apps/web/styles.css`
- UI wiring:
  - `apps/web/src/editor.ts`
  - `apps/web/src/index.ts`

### Semantic component classes already worth preserving

- `panel`
- `action-button`
- `stack-field`
- `definition-grid`
- `editor-section-card`
- `editor-nav`
- `editor-grid`
- `editor-cell`
- `validation-list`
- `reskin-card`
- `diagnostic-card`
- `dialogue`
- `playfield-card`

### Functional IDs that presentation should not own

Current UI behavior depends heavily on element ids. Future skins should preserve stable semantic ids or move logic to explicit presenter adapters before changing them.

Examples:

- `title-input`
- `map-select`
- `edit-mode`
- `editor-grid`
- `definition-editor-select`
- `quest-definition-select`
- `trigger-editor-select`
- `release-label-input`
- `export-standalone-button`
- `game-canvas`
- `dialogue-overlay`
- `save-button`
- `event-log`

## Future Skin Skeleton Requirements

To make skinning easy later, the app should grow from its current CSS-and-id approach into a clearer skin skeleton.

### Required future layers

1. Semantic theme tokens
   - background roles
   - panel roles
   - border roles
   - text roles
   - muted text
   - primary accent
   - warning / success / blocked states
   - focus / hover / selected states

2. UI primitive components
   - button family
   - panel family
   - field shell
   - list shell
   - status chip
   - tab/nav item
   - workspace cell
   - modal/overlay shell if added later

3. Screen-level skin slots
   - editor topbar
   - editor nav rail
   - section card shell
   - runtime topbar
   - runtime sidebar
   - runtime dialogue band

4. Decorative attachment points
   - icon slots
   - border skins
   - background skins
   - divider skins
   - workflow illustration slots

5. Presenter adapters
   - editor presenter should map state to semantic render targets
   - runtime presenter should map state to semantic render targets
   - skins should not manipulate engine/editor-core rules directly

### Recommended future artifacts

- `docs/ux-skinning-inventory.json`
- a semantic token manifest for editor skins
- a semantic token manifest for runtime skins
- a skin-package manifest describing required assets
- optional component-to-asset mapping tables

## Maintenance Rule

This inventory must be updated whenever a milestone:

- adds a new screen
- adds a new panel or card
- adds a new button, field, dropdown, checkbox, list, overlay, or icon surface
- changes a workflow shell
- changes the visible structure of Play Mode or Edit Mode
- adds a new runtime or editor skinning hook

Future milestone closeout should treat this file as required project memory for the eventual skinning phase.
