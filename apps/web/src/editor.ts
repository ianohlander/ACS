import { readAdventurePackage, validateAdventurePackage, type RawAdventurePackage } from "@acs/content-schema";
import type { AdventurePackage, EntityInstance, MapDefinition } from "@acs/domain";
import {
  cloneAdventurePackage,
  getMapById,
  listEntitiesForMap,
  listTilePalette,
  moveEntityInstance,
  setTileAt,
  updateAdventureMetadata
} from "@acs/editor-core";
import {
  createProjectApiClient,
  type ApiSession,
  type ProjectRecord,
  type ReleaseSummary
} from "@acs/project-api";
import { createIndexedDbPersistence } from "@acs/persistence";
import { sampleAdventureData } from "./sampleAdventure.js";

const sampleAdventure = readAdventurePackage(sampleAdventureData as RawAdventurePackage);
const DRAFT_KEY = `draft:${sampleAdventure.metadata.id}`;
const FALLBACK_TILES = ["grass", "path", "shrub", "stone", "floor", "altar", "altar-lit", "door", "water"];
const DEFAULT_MAP_ID = sampleAdventure.maps[0]?.id;
const ACTIVE_PROJECT_STORAGE_KEY = "acs:active-project-id";

if (!DEFAULT_MAP_ID) {
  throw new Error("Sample adventure is missing a default map.");
}

const persistence = createIndexedDbPersistence();
const projectApi = createProjectApiClient();

const mapSelect = requireElement<HTMLSelectElement>("map-select");
const editModeSelect = requireElement<HTMLSelectElement>("edit-mode");
const tileSelect = requireElement<HTMLSelectElement>("tile-select");
const entitySelect = requireElement<HTMLSelectElement>("entity-select");
const tilePickerWrap = requireElement<HTMLElement>("tile-picker-wrap");
const entityPickerWrap = requireElement<HTMLElement>("entity-picker-wrap");
const brushPreview = requireElement<HTMLElement>("brush-preview");
const brushSwatch = requireElement<HTMLElement>("brush-swatch");
const brushValue = requireElement<HTMLElement>("brush-value");
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
const apiStatus = requireElement<HTMLElement>("api-status");
const projectStatus = requireElement<HTMLElement>("project-status");
const releaseSummary = requireElement<HTMLElement>("release-summary");
const createProjectButton = requireElement<HTMLButtonElement>("create-project-button");
const saveProjectButton = requireElement<HTMLButtonElement>("save-project-button");
const publishReleaseButton = requireElement<HTMLButtonElement>("publish-release-button");
const openReleaseButton = requireElement<HTMLButtonElement>("open-release-button");

let draft: AdventurePackage = cloneAdventurePackage(sampleAdventure);
let currentMapId = DEFAULT_MAP_ID;
let apiSession: ApiSession | null = null;
let currentProject: ProjectRecord | null = null;
let currentReleases: ReleaseSummary[] = [];
let selectedTileId = FALLBACK_TILES[0] ?? "grass";
let selectedEntityId: EntityInstance["id"] | "" = "";
let isTileBrushActive = false;
let lastPaintedCellKey: string | null = null;

mapSelect.addEventListener("change", () => {
  currentMapId = mapSelect.value as MapDefinition["id"];
  endTileBrush();
  renderEditor();
});

editModeSelect.addEventListener("change", () => {
  endTileBrush();
  syncModeVisibility();
  renderEditor();
});

tileSelect.addEventListener("change", () => {
  selectedTileId = tileSelect.value || selectedTileId;
  renderBrushPreview();
  renderEditorHint();
});

entitySelect.addEventListener("change", () => {
  selectedEntityId = (entitySelect.value as EntityInstance["id"] | "") || "";
  renderBrushPreview();
  renderEditorHint();
});

titleInput.addEventListener("input", () => {
  draft = updateAdventureMetadata(draft, { title: titleInput.value });
  renderValidation();
  renderProjectPanel();
});

descriptionInput.addEventListener("input", () => {
  draft = updateAdventureMetadata(draft, { description: descriptionInput.value });
  renderValidation();
  renderProjectPanel();
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

createProjectButton.addEventListener("click", () => {
  void createProject();
});

saveProjectButton.addEventListener("click", () => {
  void saveProject();
});

publishReleaseButton.addEventListener("click", () => {
  void publishRelease();
});

openReleaseButton.addEventListener("click", () => {
  openLatestRelease();
});

window.addEventListener("pointerup", () => {
  endTileBrush();
});

window.addEventListener("pointercancel", () => {
  endTileBrush();
});

void bootstrap();

async function bootstrap(): Promise<void> {
  apiStatus.textContent = "Connecting to local API...";

  try {
    apiSession = await projectApi.getSession();
    apiStatus.textContent = `Connected to local API as ${apiSession.displayName}.`;
  } catch (error) {
    apiStatus.textContent = `Local API unavailable: ${toErrorMessage(error)}`;
  }

  let loadedLocalDraft = false;
  const existingDraft = await persistence.getDraft<AdventurePackage>(DRAFT_KEY);
  if (existingDraft) {
    draft = existingDraft.value;
    draftStatus.textContent = `Loaded local draft from ${new Date(existingDraft.updatedAt).toLocaleString()}.`;
    loadedLocalDraft = true;
  } else {
    draftStatus.textContent = "No saved draft yet. Editing the sample adventure.";
  }

  const rememberedProjectId = window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
  if (rememberedProjectId && apiSession) {
    try {
      currentProject = await projectApi.getProject(rememberedProjectId);
      currentReleases = await projectApi.listProjectReleases(rememberedProjectId);
      if (!loadedLocalDraft) {
        draft = cloneAdventurePackage(currentProject.draft);
        draftStatus.textContent = `Loaded project draft '${currentProject.title}' from the local API.`;
      }
    } catch (error) {
      window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
      projectStatus.textContent = `Saved project link could not be loaded: ${toErrorMessage(error)}`;
    }
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
  renderProjectPanel();
  syncModeVisibility();
  renderBrushPreview();
  renderEditorHint();
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
  if (!palette.includes(selectedTileId)) {
    selectedTileId = palette[0] ?? "grass";
  }

  tileSelect.innerHTML = "";
  for (const tileId of palette) {
    const option = document.createElement("option");
    option.value = tileId;
    option.textContent = tileId;
    option.selected = tileId === selectedTileId;
    tileSelect.append(option);
  }

  const mapEntities = listEntitiesForMap(draft, currentMapId);
  if (!mapEntities.some((entity) => entity.id === selectedEntityId)) {
    selectedEntityId = mapEntities[0]?.id ?? "";
  }

  entitySelect.innerHTML = "";
  for (const entity of mapEntities) {
    const option = document.createElement("option");
    option.value = entity.id;
    const definition = draft.entityDefinitions.find((candidate) => candidate.id === entity.definitionId);
    option.textContent = `${entity.id} (${definition?.name ?? entity.definitionId})`;
    option.selected = entity.id === selectedEntityId;
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
  const isTileMode = editModeSelect.value === "tiles";

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const index = y * map.width + x;
      const tileId = activeLayer?.tileIds[index] ?? "void";
      const occupant = mapEntities.find((entity) => entity.x === x && entity.y === y);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "editor-cell";
      button.dataset.cell = createCellKey(x, y);
      updateGridCell(button, tileId, occupant);

      if (isTileMode) {
        button.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) {
            return;
          }

          event.preventDefault();
          beginTileBrush(x, y);
        });
        button.addEventListener("pointerenter", () => {
          if (!isTileBrushActive) {
            return;
          }

          paintTileAt(x, y);
        });
      } else {
        button.addEventListener("click", () => {
          applyEntityEdit(x, y);
        });
      }

      editorGrid.append(button);
    }
  }
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

function renderProjectPanel(): void {
  createProjectButton.disabled = !apiSession;
  saveProjectButton.disabled = !apiSession || !currentProject;
  publishReleaseButton.disabled = !apiSession || !currentProject;
  openReleaseButton.disabled = !latestReleaseId();

  if (!apiSession) {
    projectStatus.textContent = "Project publishing is unavailable until the local API is running.";
  } else if (!currentProject) {
    projectStatus.textContent = "No project linked yet. Create a project from the current draft to start publishing.";
  } else {
    projectStatus.textContent = `Project ${currentProject.title} (${currentProject.id}) with ${currentProject.releaseCount} published release(s).`;
  }

  releaseSummary.innerHTML = "";
  if (currentReleases.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No releases published yet.";
    releaseSummary.append(item);
    return;
  }

  for (const release of [...currentReleases].sort((a, b) => b.version - a.version).slice(0, 3)) {
    const item = document.createElement("li");
    item.textContent = `${release.label} (${release.id}) published ${new Date(release.createdAt).toLocaleString()}`;
    releaseSummary.append(item);
  }
}

function syncModeVisibility(): void {
  const isTileMode = editModeSelect.value === "tiles";
  tilePickerWrap.classList.toggle("hidden", !isTileMode);
  entityPickerWrap.classList.toggle("hidden", isTileMode);
  brushPreview.classList.toggle("hidden", !isTileMode);
}

function renderBrushPreview(): void {
  if (editModeSelect.value === "tiles") {
    brushSwatch.style.background = tileColor(selectedTileId || "void");
    brushValue.textContent = selectedTileId || "none";
    return;
  }

  const entity = listEntitiesForMap(draft, currentMapId).find((candidate) => candidate.id === selectedEntityId);
  const definition = draft.entityDefinitions.find((candidate) => candidate.id === entity?.definitionId);
  brushSwatch.style.background = "#1f2329";
  brushValue.textContent = definition?.name ?? (selectedEntityId || "none");
}

function renderEditorHint(): void {
  const map = getMapById(draft, currentMapId);
  if (!map) {
    editorHint.textContent = "";
    return;
  }

  editorHint.textContent =
    editModeSelect.value === "tiles"
      ? `Painting tiles on ${map.name}. Brush tile: ${selectedTileId || "none"}. Click and drag to paint multiple cells.`
      : `Repositioning entities on ${map.name}. Selected entity: ${selectedEntityId || "none"}.`;
}

function beginTileBrush(x: number, y: number): void {
  isTileBrushActive = true;
  lastPaintedCellKey = null;
  paintTileAt(x, y);
}

function endTileBrush(): void {
  isTileBrushActive = false;
  lastPaintedCellKey = null;
}

function paintTileAt(x: number, y: number): void {
  if (editModeSelect.value !== "tiles") {
    return;
  }

  const cellKey = createCellKey(x, y);
  if (lastPaintedCellKey === cellKey) {
    return;
  }

  const tileId = selectedTileId || tileSelect.value || "grass";
  const currentTileId = getTileIdAt(x, y);
  lastPaintedCellKey = cellKey;

  if (currentTileId === tileId) {
    return;
  }

  draft = setTileAt(draft, currentMapId, x, y, tileId);
  refreshGridCell(x, y);
  renderValidation();
}

function applyEntityEdit(x: number, y: number): void {
  const entityId = selectedEntityId || (entitySelect.value as EntityInstance["id"] | "");
  if (!entityId) {
    return;
  }

  draft = moveEntityInstance(draft, entityId, currentMapId, x, y);
  renderEditor();
}

function refreshGridCell(x: number, y: number): void {
  const button = editorGrid.querySelector<HTMLButtonElement>(`button[data-cell="${createCellKey(x, y)}"]`);
  if (!button) {
    return;
  }

  const tileId = getTileIdAt(x, y);
  const occupant = listEntitiesForMap(draft, currentMapId).find((entity) => entity.x === x && entity.y === y);
  updateGridCell(button, tileId, occupant);
}

function updateGridCell(button: HTMLButtonElement, tileId: string, occupant: EntityInstance | undefined): void {
  button.style.background = tileColor(tileId);
  button.title = occupant ? `${tileId}\n${occupant.id}` : tileId;
  button.innerHTML = occupant ? `<span class="entity-chip">${shortEntityLabel(occupant)}</span>` : `<span>${tileId}</span>`;
}

function getTileIdAt(x: number, y: number): string {
  const map = getMapById(draft, currentMapId);
  const activeLayer = map?.tileLayers[0];
  if (!map || !activeLayer) {
    return "void";
  }

  return activeLayer.tileIds[y * map.width + x] ?? "void";
}

function createCellKey(x: number, y: number): string {
  return `${x},${y}`;
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
  selectedEntityId = "";
  selectedTileId = FALLBACK_TILES[0] ?? "grass";
  endTileBrush();
  renderEditor();
}

async function launchPlaytest(): Promise<void> {
  const record = await persistence.putDraft(DRAFT_KEY, draft);
  draftStatus.textContent = `Draft saved for playtest at ${new Date(record.updatedAt).toLocaleString()}.`;
  window.open(`/apps/web/index.html?draft=${encodeURIComponent(DRAFT_KEY)}`, "_blank", "noopener");
}

async function createProject(): Promise<void> {
  if (!apiSession) {
    projectStatus.textContent = "Start the local API before creating a project.";
    return;
  }

  await saveDraft();

  try {
    currentProject = await projectApi.createProject({
      title: draft.metadata.title,
      description: draft.metadata.description,
      draft
    });
    currentReleases = [];
    window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, currentProject.id);
    projectStatus.textContent = `Created project ${currentProject.title} (${currentProject.id}).`;
    renderProjectPanel();
  } catch (error) {
    projectStatus.textContent = `Failed to create project: ${toErrorMessage(error)}`;
  }
}

async function saveProject(): Promise<void> {
  if (!apiSession) {
    projectStatus.textContent = "Start the local API before saving a project.";
    return;
  }

  if (!currentProject) {
    await createProject();
    return;
  }

  await saveDraft();

  try {
    currentProject = await projectApi.saveProjectDraft(currentProject.id, {
      title: draft.metadata.title,
      description: draft.metadata.description,
      draft
    });
    projectStatus.textContent = `Saved project draft to the local API at ${new Date(currentProject.updatedAt).toLocaleString()}.`;
    renderProjectPanel();
  } catch (error) {
    projectStatus.textContent = `Failed to save project: ${toErrorMessage(error)}`;
  }
}

async function publishRelease(): Promise<void> {
  if (!apiSession) {
    projectStatus.textContent = "Start the local API before publishing a release.";
    return;
  }

  if (!currentProject) {
    await createProject();
    if (!currentProject) {
      return;
    }
  }

  await saveProject();

  try {
    const release = await projectApi.publishRelease(currentProject.id);
    currentProject = await projectApi.getProject(currentProject.id);
    currentReleases = await projectApi.listProjectReleases(currentProject.id);
    projectStatus.textContent = `Published ${release.label} (${release.id}).`;
    renderProjectPanel();
  } catch (error) {
    projectStatus.textContent = `Failed to publish release: ${toErrorMessage(error)}`;
  }
}

function openLatestRelease(): void {
  const releaseId = latestReleaseId();
  if (!releaseId) {
    return;
  }

  window.open(`/apps/web/index.html?release=${encodeURIComponent(releaseId)}`, "_blank", "noopener");
}

function latestReleaseId(): string | null {
  if (currentReleases.length === 0) {
    return currentProject?.latestReleaseId ?? null;
  }

  const sorted = [...currentReleases].sort((a, b) => b.version - a.version);
  return sorted[0]?.id ?? currentProject?.latestReleaseId ?? null;
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element '${id}'.`);
  }

  return element as T;
}

