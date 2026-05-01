# World Structure Retained Summary

## Purpose

This file preserves the important implementation guidance that originally lived in `docs/world_structure_codex_package/` so the package folder can be cleaned up without losing planning detail.

The main roadmap and LLM context already preserve the high-level decisions:

- regions organize content
- maps are playable spaces
- exits/travel links are the real runtime graph edges
- the world is a graph, not a strict tree
- Milestone 36 owns editor/domain/schema/world-atlas/map-workspace work
- Milestone 37 owns light runtime travel-metadata work

This summary keeps the finer-grained execution order and artifact expectations.

## Canonical Product Rule

Classic RPG world structure should support:

- an overworld map
- region entry maps
- local maps
- optional cross-region links

Visible UI language should teach:

- regions organize maps
- maps are playable spaces
- travel links connect maps

Internal compatibility rule:

- keep the existing exit model as the runtime truth
- treat `Travel Link` as designer-facing presentation language where useful

## Retained Domain And Schema Details

These are the specific world-structure additions that should remain the implementation target.

### Domain-level additions

- `WorldStructure`
- `WorldStructureTemplate`
- `MapRole`
- `MapAuthoringMetadata`
- `ExitPresentationMetadata`

### Content-schema behavior

- preserve old packages
- add safe default `worldStructure`
- infer existing world-scale maps where possible
- never invent fake exits
- keep world-structure metadata authoring-oriented rather than runtime-controlling

## Retained Implementation Order

This is the condensed implementation sequence preserved from the package.

1. Add domain types
   - `WorldStructure`
   - `WorldStructureTemplate`
   - `MapRole`
   - `MapAuthoringMetadata`
   - `ExitPresentationMetadata`

2. Add content schema normalization
   - preserve old packages
   - add safe default `worldStructure`
   - infer existing world-scale maps where possible

3. Add editor-core pure operations
   - set overworld
   - assign map role
   - assign map to region
   - mark region entry
   - create travel links
   - create return links
   - update/remove travel links

4. Add diagnostics
   - missing overworld
   - region without entry map
   - invalid exit target
   - unreachable maps
   - duplicate travel links
   - orphaned maps

5. Add Classic Overworld template generator

6. Update World Atlas UI
   - Structure tab
   - Connections tab
   - Templates tab

7. Update Map Workspace
   - Travel Link inspector
   - add/edit travel links
   - create return link action

8. Add runtime optional metadata support
   - locked exits
   - travel event metadata

9. Add tests

10. Update docs
   - User Guide
   - System Reference
   - LLM project context

## Retained Task Map

These task ids were unique to the package and are kept here for traceability.

| Task | Purpose | Main Area | Outputs |
| --- | --- | --- | --- |
| `WS-001` | Add world structure domain types | `packages/domain` | `WorldStructure`, `MapRole`, `ExitPresentationMetadata` |
| `WS-002` | Normalize world structure metadata | `packages/content-schema` | `normalizeWorldStructure` |
| `WS-003` | Implement editor-core world structure operations | `packages/editor-core` | `world-structure.ts`, `travel-links.ts` |
| `WS-004` | Implement topology diagnostics | `packages/editor-core` | new diagnostic codes |
| `WS-005` | Implement Classic Overworld template generator | `packages/editor-core` | `world-templates.ts` |
| `WS-006` | Upgrade World Atlas UI | `apps/web` | Structure / Connections / Templates tabs |
| `WS-007` | Upgrade Map Workspace travel link UI | `apps/web` | Travel Link inspector, Add Travel Link form |
| `WS-008` | Add optional runtime travel metadata support | `packages/runtime-core` | locked exit behavior, travel-link event metadata |
| `WS-009` | Add tests and regression coverage | workspace | unit, UI smoke, runtime regression coverage |

## What Was Already Folded Elsewhere

These details are already preserved in the main project memory:

- roadmap milestone placement
- editor/UI wording direction
- world atlas and map workspace behavior goals
- diagnostics expectations
- template-generator expectations
- runtime-light-touch travel metadata direction

Primary preserved locations:

- `docs/roadmap.html`
- `docs/llm-project-context.json`
- `docs/system-reference.md`

## Cleanup Status

After this summary was created, the `docs/world_structure_codex_package/` folder no longer held unique planning information that is required for milestone execution. Keeping the folder is still fine as archival material, but deleting it should not block future implementation as long as the retained summary and roadmap remain in the repo.
