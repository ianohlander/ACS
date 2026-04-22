# ACS Testing Strategy

This document defines the dedicated testing milestone introduced before the application grows further. The goal is to make regressions visible at the smallest useful level, while still testing complete game/editor behavior.

## Milestone 29A: Test Harness Foundation

Milestone 29 is now split so the first slice is a testing pause:

- Build a dependency-light unit test harness with Node's built-in `node:test` runner.
- Test package boundaries after TypeScript compilation so tests exercise the same public exports used by apps.
- Add UI smoke coverage that opens the real browser editor in headless Chromium and asserts important progressive-disclosure behavior.
- Add runtime UI E2E coverage that opens the real playable browser runtime in headless Chromium and drives keyboard movement, interaction, dialogue, preferences, save/load, and reset.
- Keep the existing smoke playtest as an end-to-end runtime acceptance test.
- Add coverage output support through `NODE_V8_COVERAGE` so deeper coverage reporting can be layered on later.

## Commands

Use these commands from the repo root:

```powershell
npm run test:unit
npm run test:coverage
npm run test:ui:editor
npm run test:ui:runtime
npm run test:ui
npm run test:e2e
npm run playtest:smoke
npm test
```

Coverage note: `npm run test:coverage` currently runs the unit suite through the coverage-capable harness, but V8 coverage emission is disabled by default on this Node 18 Windows runtime because `NODE_V8_COVERAGE` crashes the process. On a verified runtime, set `ACS_ENABLE_V8_COVERAGE=1` to emit V8 coverage JSON to `coverage/unit`. A later milestone should either upgrade the local Node/tooling path or add a stable coverage reporter once dependency installation is healthy.

Important environment note: the repo-local TypeScript install has previously been corrupted in this Google Drive workspace. `tools/run-unit-tests.mjs` searches for a working compiler in this order:

1. `ACS_TSC` environment variable
2. `node_modules/typescript/lib/tsc.js`
3. `C:/Codex/tools/tsc-runner/node_modules/typescript/lib/tsc.js`

If the local compiler is repaired, the harness will automatically prefer it.

## Test Layers

| Layer | Current Harness | Purpose |
| --- | --- | --- |
| Domain/content shape | Unit tests through `readAdventurePackage` and validation | Catch schema migration, normalization, and structural contract regressions. |
| Validation | `tests/unit/validation.test.mjs` | Ensure broken references, tile geometry, and publish-readiness errors are caught. |
| Runtime core | `tests/unit/runtime-core.test.mjs` and `tools/playtest-smoke.mjs` | Verify commands, movement, exits, trigger chains, flags, inventory, quest state, and emitted events. |
| Editor core | `tests/unit/editor-core.test.mjs` | Verify pure data-editing operations clone package data and preserve object boundaries. |
| Persistence | `tests/unit/persistence.test.mjs` | Verify save records preserve the existing runtime snapshot state model. |
| Browser editor UI | `tools/editor-ui-smoke.ps1` | Verify the real editor starts, populates controls, hides irrelevant panels by mode, and renders pixel-editor previews. |
| Browser runtime UI | `tools/runtime-ui-e2e.ps1` | Verify the real playable runtime starts, renders a canvas, switches visual/scale preferences, accepts keyboard movement/interaction, shows dialogue, records trigger/flag events, saves, resets, and loads. |
| Runtime acceptance | `tools/playtest-smoke.mjs` | Verify a deterministic command-level adventure playthrough through runtime-core without the browser. |
| Documentation/tutorial acceptance | Screenshot capture scripts and generated PDFs | Keep guide images current and step-specific. |

## Coverage Goals

This first milestone creates the harness and high-value regression tests. The long-term target is not only a percentage number; it is confidence across behavior classes.

Near-term targets:

- Runtime commands: move, inspect, interact, open menu, use item, dialogue choice, end turn.
- Trigger actions: dialogue, flags, item grant/removal, teleport, tile change, quest stage, media cue, sound cue.
- Trigger conditions: flags, item possession, quest stage, map/cell placement, run-once behavior.
- Editor-core operations: create/update/delete or add/move operations for every object class as CRUD lands.
- Validation: missing references, invalid map geometry, singleton violations, invalid cue references, invalid starter-pack references, invalid category relations.
- UI: each editor area should have at least one smoke assertion that the intended panel appears and irrelevant controls are hidden.

Longer-term targets:

- Expand browser runtime UI tests for profile/inventory drawers, mobile play controls, cue displays, and future player/NPC actor permission flows.
- Add import/export and publishing artifact tests once forkable/standalone publishing lands.
- Add actor-capable command tests before AI NPCs and multiplayer, ensuring player and NPC actors call the same validated action services.
- Add snapshot-style tests for generated tutorial screenshots to prevent stale or empty screenshots from entering PDFs.
- Add coverage thresholds after the baseline is stable, rather than blocking early harness adoption with unrealistic numbers.

## Best-Practice Rules Adopted

- Prefer pure package tests first. They are fast, granular, and easy to diagnose.
- Keep UI tests focused on critical user flows rather than brittle pixel-perfect layout assertions.
- Test behavior and data contracts, not implementation details.
- Use one smoke playtest as a high-level canary, but do not rely on it instead of granular tests.
- Every new feature should add or update at least one test at the lowest relevant layer.
- Any bug fix should add a regression test when feasible.
- Tests should preserve the architecture boundary: runtime-core tests should not depend on DOM, and editor-core tests should not require browser APIs.
