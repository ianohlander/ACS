import type { AdventurePackage, EntityInstance, MapDefinition } from "@acs/domain";
import { validateAdventurePackage } from "@acs/content-schema";
import {
  cloneAdventurePackage,
  getMapById,
  listEntitiesForMap,
  listTilePalette,
  moveEntityInstance,
  setTileAt,
  updateAdventureMetadata
} from "@acs/editor-core";
import { createIndexedDbPersistence } from "@acs/persistence";
import { sampleAdventure } from "./sampleAdventure.js";

const DRAFT_KEY = `draft:${sampleAdventure.metadata.id}`;
const FALLBACK_TILES = ["grass", "path", "shrub", "stone", "floor", "altar", "altar-lit", "door", "water"];
const DEFAULT_MAP_ID = sampleAdventure.maps[0]?.id;

if (!DEFAULT_MAP_ID) {
  throw new Error("Sample adventure is missing a default map.");
}

const persistence = createIndexedDbPersistence();

const mapSelect = requireElement<HTMLSelectElement>("map-select");
const editModeSelect = requireElement<HTMLSelectElement>("edit-mode");
const tileSelect = requireElement<HTMLSelectElement>("tile-select");
const entitySelect = requireElement<HTMLSelectElement>("entity-select");
const tilePickerWrap = requireElement<HTMLElement>("tile-picker-wrap");
const entityPickerWrap = requireElement<HTMLElement>("entity-picker-wrap");
const editorGrid = requireElement<HTMLElement>("editor-grid");
const editorHint = requireElement<HTMLElement>("editor-hint");
const titleInput = requireElement<HTMLInputElement>("title-input");
const descriptionInput = requireElement<HTMLTextAreaElement>("description-input");
const draftStatus = requireElement<HTMLElement>("draft-status");
const validationList = requireElement<HTMLElement>("validation-list");
const entitySummary = requireElement<HTMLElement>("entity-summary");
const saveDraftButton = requireElement<HTMLButtonElement>("save-draft-button");
const resetDraftButton = requireElement<HTMLButtonElement>("reset-draft-button");
const playtestButton = requireElement<HTMLButtonElement>("playtest-button");

let draft: AdventurePackage = cloneAdventurePackage(sampleAdventure);
let currentMapId = DEFAULT_MAP_ID;

mapSelect.addEventListener("change", () => {
  currentMapId = mapSelect.value as MapDefinition["id"];
  renderEditor();
});

editModeSelect.addEventListener("change", () => {
  syncModeVisibility();
  renderEditor();
});

titleInput.addEventListener("input", () => {
  draft = updateAdventureMetadata(draft, { title: titleInput.value });
  renderValidation();
});

descriptionInput.addEventListener("input", () => {
  draft = updateAdventureMetadata(draft, { description: descriptionInput.value });
  renderValidation();
});

saveDraftButton.addEventListener("click", () => {
  void saveDraft();
});

resetDraftButton.addEventListener("click", () => {
  void resetDraft();
});

playtestButton.addEventListener("click", () => {
  void launchPlaytest();
});

void bootstrap();

async function bootstrap(): Promise<void> {
  const existing = await persistence.getDraft<AdventurePackage>(DRAFT_KEY);
  if (existing) {
    draft = existing.value;
    draftStatus.textContent = `Loaded local draft from ${new Date(existing.updatedAt).toLocaleString()}.`;
  } else {
    draftStatus.textContent = "No saved draft yet. Editing the sample adventure.";
  }

  currentMapId = draft.maps[0]?.id ?? currentMapId;
  renderEditor();
}

function renderEditor(): void {
  renderMetadata();
  renderMapOptions();
  renderPalette();
  renderGrid();
  renderEntitySummary();
  renderValidation();
  syncModeVisibility();
}

function renderMetadata(): void {
  titleInput.value = draft.metadata.title;
  descriptionInput.value = draft.metadata.description;
}

function renderMapOptions(): void {
  mapSelect.innerHTML = "";

  for (const map of draft.maps) {
    const option = document.createElement("option");
    option.value = map.id;
    option.textContent = map.name;
    option.selected = map.id === currentMapId;
    mapSelect.append(option);
  }
}

function renderPalette(): void {
  const palette = [...new Set([...listTilePalette(draft, currentMapId), ...FALLBACK_TILES])];
  tileSelect.innerHTML = "";
  for (const tileId of palette) {
    const option = document.createElement("option");
    option.value = tileId;
    option.textContent = tileId;
    tileSelect.append(option);
  }

  entitySelect.innerHTML = "";
  for (const entity of listEntitiesForMap(draft, currentMapId)) {
    const option = document.createElement("option");
    option.value = entity.id;
    const definition = draft.entityDefinitions.find((candidate) => candidate.id === entity.definitionId);
    option.textContent = `${entity.id} (${definition?.name ?? entity.definitionId})`;
    entitySelect.append(option);
  }
}

function renderGrid(): void {
  const map = getMapById(draft, currentMapId);
  if (!map) {
    editorGrid.innerHTML = "";
    return;
  }

  editorGrid.innerHTML = "";
  editorGrid.style.gridTemplateColumns = `repeat(${map.width}, minmax(40px, 1fr))`;

  const activeLayer = map.tileLayers[0];
  const mapEntities = listEntitiesForMap(draft, currentMapId);

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const index = y * map.width + x;
      const tileId = activeLayer?.tileIds[index] ?? "void";
      const occupant = mapEntities.find((entity) => entity.x === x && entity.y === y);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "editor-cell";
      button.style.background = tileColor(tileId);
      button.title = occupant ? `${tileId}\n${occupant.id}` : tileId;
      button.innerHTML = occupant ? `<span class="entity-chip">${shortEntityLabel(occupant)}</span>` : `<span>${tileId}</span>`;
      button.addEventListener("click", () => {
        applyCellEdit(x, y);
      });
      editorGrid.append(button);
    }
  }

  editorHint.textContent =
    editModeSelect.value === "tiles"
      ? `Painting tiles on ${map.name}. Selected tile: ${tileSelect.value || "none"}.`
      : `Repositioning entities on ${map.name}. Selected entity: ${entitySelect.value || "none"}.`;
}

function renderValidation(): void {
  validationList.innerHTML = "";
  const issues = validateAdventurePackage(draft);

  if (issues.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No validation issues.";
    validationList.append(item);
    return;
  }

  for (const issue of issues) {
    const item = document.createElement("li");
    item.textContent = `[${issue.severity}] ${issue.message}`;
    validationList.append(item);
  }
}

function renderEntitySummary(): void {
  entitySummary.innerHTML = "";
  const entities = listEntitiesForMap(draft, currentMapId);
  if (entities.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No entities on this map.";
    entitySummary.append(item);
    return;
  }

  for (const entity of entities) {
    const definition = draft.entityDefinitions.find((candidate) => candidate.id === entity.definitionId);
    const item = document.createElement("li");
    item.textContent = `${entity.id}: ${definition?.name ?? entity.definitionId} at (${entity.x}, ${entity.y})`;
    entitySummary.append(item);
  }
}

function syncModeVisibility(): void {
  const isTileMode = editModeSelect.value === "tiles";
  tilePickerWrap.classList.toggle("hidden", !isTileMode);
  entityPickerWrap.classList.toggle("hidden", isTileMode);
}

function applyCellEdit(x: number, y: number): void {
  if (editModeSelect.value === "tiles") {
    draft = setTileAt(draft, currentMapId, x, y, tileSelect.value || "grass");
  } else {
    const entityId = entitySelect.value as EntityInstance["id"] | "";
    if (!entityId) {
      return;
    }

    draft = moveEntityInstance(draft, entityId, currentMapId, x, y);
  }

  renderEditor();
}

async function saveDraft(): Promise<void> {
  const record = await persistence.putDraft(DRAFT_KEY, draft);
  draftStatus.textContent = `Draft saved locally at ${new Date(record.updatedAt).toLocaleString()}.`;
}

async function resetDraft(): Promise<void> {
  draft = cloneAdventurePackage(sampleAdventure);
  await persistence.deleteDraft(DRAFT_KEY);
  draftStatus.textContent = "Draft reset to the built-in sample adventure.";
  currentMapId = draft.maps[0]?.id ?? currentMapId;
  renderEditor();
}

async function launchPlaytest(): Promise<void> {
  const record = await persistence.putDraft(DRAFT_KEY, draft);
  draftStatus.textContent = `Draft saved for playtest at ${new Date(record.updatedAt).toLocaleString()}.`;
  window.open(`/apps/web/index.html?draft=${encodeURIComponent(DRAFT_KEY)}`, "_blank", "noopener");
}

function shortEntityLabel(entity: EntityInstance): string {
  return entity.id.replace(/^entity_/, "").slice(0, 4).toUpperCase();
}

function tileColor(tileId: string): string {
  switch (tileId) {
    case "grass":
      return "#497c4c";
    case "path":
      return "#a58258";
    case "water":
      return "#2e5b88";
    case "stone":
      return "#68737d";
    case "altar":
      return "#c4a85a";
    case "altar-lit":
      return "#e1c66f";
    case "shrub":
      return "#2d5132";
    case "door":
      return "#704b2e";
    case "floor":
      return "#8b8f94";
    default:
      return "#1f2329";
  }
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element '${id}'.`);
  }

  return element as T;
}
