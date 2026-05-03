# Architecture Blueprint

## Goals

- Keep content data-driven and versioned.
- Separate simulation from rendering and editor UI.
- Separate editor behavior/state from editor presentation skins so future UX themes can reuse the same authoring operations.
- Preserve upgrade paths to HD 2D, real-time systems, and 3D.
- Share schema and validation logic across editor, runtime, and backend.
- Run targeted architecture-health audits as the application grows so sink-file sprawl, complexity hot spots, SOLID drift, and package-boundary leakage are corrected early.

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
- `packages/ai-core`: provider-agnostic AI game creation, proposal review, application planning, and portable handoff/import contracts

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
11. Milestone 32 AI game creation request planning maps create, finish, and expand prompts into structured provider-agnostic generation requests before any provider is called.
12. The first OpenAI Responses provider plan turns those reviewed request plans into server-side structured-output payloads. API keys stay out of browser state, and provider output must still become an `AiAdventureProposal` before human review and editor-core application.
13. The local API owns live OpenAI Responses submission. The browser sends prompt intent, prompt text, optional model, and optional structured adventure context through `@acs/project-api`; the API reads server-side credentials, submits the planned payload, parses output/refusals, validates proposal alignment, and returns a review handoff without applying changes.
14. The editor's Test & Publish AI Game Creation panel is the first visible consumer of that API bridge. It captures intent/model/prompt, includes the current draft as context for finish/expand requests, and renders proposal summary, issues, and next step as preview-only review material.
15. Publishable releases retain the validation report that cleared them, so the latest release health is visible in the editor.

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

## Targeted Item Usage Direction

- Future targeted item usage should stay data-driven inside `ItemDefinition` records rather than becoming hardcoded per-item runtime logic.
- The best fit is to extend shared actor-action contracts, not to create a permanently player-only targeting path. Player, deterministic NPC, future AI NPC, and later multiplayer actors should all be able to use the same validated targeted item/action services.
- Target selection should remain serialized data such as target entity ids, target tile coordinates, or map/exit references so runtime-core, backend-authoritative multiplayer, and later AI review/import flows can all reason about the same commands.
- Item effects should be authored as structured effect data with validation, target restrictions, and optional feedback cues. Trigger-based fallback behavior can remain for older/simple content, but authored item effects should become the first-class reusable path.
- Runtime application should flow through shared actor-owned state, actor-aware trigger context, and normal engine events. Targeted item use should not bypass validation, permissions, trigger evaluation, or event emission.
- Editor support should live in the Libraries/Items workflow with progressive disclosure: basic item metadata first, then target/effect authoring only when the item is usable or consumable.

## Variable Sprite Scale Direction

- Future higher-resolution presentation modes should be allowed to render variable-sized sprites without changing classic 8-bit gameplay behavior.
- The safest architecture is to decouple visual scale, collision masks, render layers, and higher-resolution sprite manifests from the gameplay grid so classic tile-locked rules remain valid while richer renderers gain more expressive visuals.
- Variable sprite scale should remain optional presentation data on entity, tile, and visual-manifest records; classic mode should ignore it safely.
- Renderer-specific collision modes, missile-distance calculations, and z-layer draw order should live behind shared runtime and renderer seams, not inside browser-only code or classic-mode assumptions.
- Editor support for higher-resolution sprite scale, render layering, and collision-mask authoring should appear only in the renderer families that need it, not in classic-only flows.


## Classic ACS Visual Mode Strategy

The collected reference images in `legacy images/` show that the old ACS identity comes mainly from the gameplay panel and construction vocabulary, not from the surrounding DOS/Apple-era UI chrome. The project should therefore pursue a `classic-acs` presentation mode as a renderer/theme layer over the existing content and runtime state.

- `runtime-core` remains the source of truth for commands, rules, state, events, triggers, and AI.
- `runtime-2d` can grow multiple presentation modes, or a future `runtime-classic` package can be introduced beside it.
- The classic mode should render a fixed-aspect play panel with a tile/icon viewport, right-side status rail, and bottom message band.
- If a map is larger than the visible play window, scrolling or camera-follow behavior should live in the presentation layer rather than moving map coordinates or traversal rules into renderer state. Shared runtime state should continue to use world/map coordinates, while classic, HD 2D, and later 3D presentation families can each choose their own viewport behavior.
- Classic sprites, pixel-editor drawings, stocked genre libraries, splash screens, and music cues should be resolved through manifests and asset IDs, not hardcoded in maps or runtime rules.
- The same content package should be renderable by classic low-resolution sprites, stocked genre packs, later HD 2D art, or a future 3D renderer, with intro presentation such as splash screens and starting music selected as data.
- Editor growth should follow the original construction-set vocabulary: terrain pictures, thing pictures, creature pictures, map/floor tools, entity definitions, actor profiles, possessions, triggers, and text/dialogue records.
- The editor should follow the same separation rule as runtime presentation: authoring logic lives in `editor-core`, while browser/editor UX skins should be replaceable shells over the same draft package, validation reports, project/release flows, and pure mutation helpers.
- The live UI surface area that future skins must cover is tracked in `docs/ux-skinning-inventory.md` and `docs/ux-skinning-inventory.json` so skins can attach to semantic surfaces instead of business logic.
