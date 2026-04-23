# Engineering Quality Rules

This project should stay easy to understand as it grows from an ACS-inspired 2D construction set into richer future presentation modes, rules, assets, and content systems.

## Complexity Gate

Cyclomatic complexity greater than `8` triggers a refactor.

Use:

```powershell
npm run quality:complexity
```

The checker enforces a max complexity of `8` for all new or changed functions. Existing violations are recorded in `tools/complexity-baseline.json` as legacy debt. A function already in the baseline must not become more complex. When a legacy function is refactored below the threshold, regenerate the baseline in the same cleanup commit:

```powershell
node .\tools\complexity-check.mjs --write-baseline
```

The baseline is a ratchet, not a permission slip. It lets us keep moving while preventing the code from getting harder to hold in our heads.

## SOLID Gate

No new SOLID violations should be introduced.

When adding or changing code, use this checklist:

- Single Responsibility: a module or function should have one clear reason to change.
- Open/Closed: new content kinds, trigger actions, renderers, and editor panels should prefer registries, handlers, or small strategy objects over growing central switch statements.
- Liskov Substitution: future implementations of renderers, storage, AI, or action handlers must preserve their interface contracts.
- Interface Segregation: pass the smallest useful interface or read model instead of an entire package when practical.
- Dependency Inversion: domain, runtime-core, validation, and editor-core should not depend on browser, canvas, API server, or persistence details.

## Milestone Testing Gate

Every milestone completion now requires the full available testing suite before commit:

```powershell
npm test
```

This currently runs:

- `npm run test:unit`: Node `node:test` coverage of compiled package boundaries for runtime-core, editor-core, validation, persistence, and default starter content.
- `tests/unit/default-content.test.mjs`: default starter-library regression coverage that compares imported classic ACS starter elements against `legacy ACS/legacy_ACS_startpacks.txt`, excluding Land of Aventuria-specific examples.
- `npm run test:ui:editor`: headless Chromium smoke coverage for the real browser editor, including progressive disclosure in Map Workspace and pixel editor preview rendering.
- `npm run test:ui:runtime`: headless Chromium end-to-end coverage for the real playable runtime, including canvas startup, visual preferences, keyboard movement, interaction, dialogue, trigger/flag logging, save, reset, and load.
- `npm run test:ui`: the combined browser UI suite.
- `npm run playtest:smoke`: runtime acceptance coverage for validation, start state, Oracle interaction, cue events, shrine reward effects, inventory, tile change, and exit travel.
- `npm run test:e2e`: the combined browser UI suite plus the command-level runtime smoke playtest.

Feature work should also update or add at least one focused test at the lowest relevant layer. Bug fixes should include a regression test when feasible. If a milestone cannot run one layer of the suite, document why before completion and do not treat the milestone as fully accepted.

## Build And Typecheck Gate

Standard build commands must not depend on one fragile local TypeScript path. Use:

```powershell
npm run build
npm run typecheck
```

Both commands run `tools/build-workspace.mjs`, which first regenerates local `node_modules/@acs/*` workspace package stubs and then resolves a working TypeScript compiler from:

- `ACS_TSC`, when explicitly provided.
- `node_modules/typescript/lib/tsc.js`, when the local install is healthy.
- `C:/Codex/tools/tsc-runner/node_modules/typescript/lib/tsc.js`, as the known-good fallback in this workspace.

This prevents the project from silently depending on a corrupt repo-local TypeScript install or missing Windows workspace symlinks.

## Refactor Trigger

Refactor before or alongside a feature when any of these are true:

- A touched function has complexity greater than `8`.
- A switch statement gains another branch for an extensible concept such as library focus, trigger action, condition type, renderer mode, or entity behavior.
- A file starts mixing UI rendering, domain mutation, validation, persistence, and network concerns.
- A function cannot be summarized accurately in one sentence.

## Preferred Shapes

Use these shapes to keep the code grokkable:

- Handler maps for trigger actions, conditions, event descriptions, and library focus presentation.
- Small services for API project/release/asset operations.
- Panel modules for editor workspaces.
- Validator functions that each check one kind of rule and return `ValidationIssue[]`.
- Renderer strategies for classic ACS, debug grid, and future visual modes.

## Current Cleanup Direction

Runtime-core has begun moving away from catch-all `index.ts` implementation files. `packages/runtime-core/src/index.ts` should remain a public export surface, while behavior is organized into focused modules/classes such as `game-session.ts`, `trigger-system.ts`, `enemy-turn-system.ts`, `state-factory.ts`, and `movement.ts`.

Use that same pattern for future cleanup passes:

- Keep public package exports stable through `index.ts`.
- Move cohesive behavior into named modules or classes with one clear reason to change.
- Prefer orchestration classes for stateful workflows and pure helper modules for stateless math or transformations.
- When moving legacy code, keep the complexity gate green instead of creating new baseline debt under a new function name.
