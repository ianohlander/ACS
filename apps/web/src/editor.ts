import { readAdventurePackage, type RawAdventurePackage } from "@acs/content-schema";
import type { Action, AdventurePackage, Condition, DialogueDefinition, EntityBehaviorMode, EntityBehaviorProfile, EntityDefId, EntityDefinition, EntityInstance, FlagDefId, ItemDefId, MapDefinition, MapKind, QuestId, RegionDefinition, SkillDefId, TriggerDefinition, TriggerType } from "@acs/domain";
import {
  addEntityInstance,
  canPlaceEntityDefinition,
  cloneAdventurePackage,
  createMapDefinition,
  createTriggerDefinition,
  deleteTriggerDefinition,
  duplicateTriggerDefinition,
  getMapById,
  listEntitiesForMap,
  listDialogueDefinitions,
  listEntityDefinitions,
  listFlagDefinitions,
  listItemDefinitions,
  listLibraryCategories,
  listQuestDefinitions,
  listRegions,
  listSkillDefinitions,
  listTilePalette,
  listTriggerDefinitions,
  moveEntityInstance,
  setTileAt,
  updateAdventureMetadata,
  updateDialogueNode,
  updateEntityDefinition,
  updateMapDefinition,
  updateTriggerDefinition
} from "@acs/editor-core";
import {
  createProjectApiClient,
  type ApiSession,
  type ProjectRecord,
  type ReleaseSummary
} from "@acs/project-api";
import { createIndexedDbPersistence } from "@acs/persistence";
import { validateAdventure, type ValidationReport } from "@acs/validation";
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
const workspaceMapSelect = requireElement<HTMLSelectElement>("workspace-map-select");
const logicMapSelect = requireElement<HTMLSelectElement>("logic-map-select");
const editModeSelect = requireElement<HTMLSelectElement>("edit-mode");
const tileSelect = requireElement<HTMLSelectElement>("tile-select");
const entitySelect = requireElement<HTMLSelectElement>("entity-select");
const entityDefinitionSelect = requireElement<HTMLSelectElement>("entity-definition-select");
const entityDefinitionPickerWrap = requireElement<HTMLElement>("entity-definition-picker-wrap");
const placeEntityButton = requireElement<HTMLButtonElement>("place-entity-button");
const tilePickerWrap = requireElement<HTMLElement>("tile-picker-wrap");
const entityPickerWrap = requireElement<HTMLElement>("entity-picker-wrap");
const brushPreview = requireElement<HTMLElement>("brush-preview");
const brushSwatch = requireElement<HTMLElement>("brush-swatch");
const brushValue = requireElement<HTMLElement>("brush-value");
const editorGrid = requireElement<HTMLElement>("editor-grid");
const editorHint = requireElement<HTMLElement>("editor-hint");
const titleInput = requireElement<HTMLInputElement>("title-input");
const descriptionInput = requireElement<HTMLTextAreaElement>("description-input");
const mapNameInput = requireElement<HTMLInputElement>("map-name-input");
const mapKindSelect = requireElement<HTMLSelectElement>("map-kind-select");
const mapRegionSelect = requireElement<HTMLSelectElement>("map-region-select");
const mapStructureStatus = requireElement<HTMLElement>("map-structure-status");
const newMapNameInput = requireElement<HTMLInputElement>("new-map-name-input");
const newMapKindSelect = requireElement<HTMLSelectElement>("new-map-kind-select");
const newMapRegionSelect = requireElement<HTMLSelectElement>("new-map-region-select");
const newMapWidthInput = requireElement<HTMLInputElement>("new-map-width-input");
const newMapHeightInput = requireElement<HTMLInputElement>("new-map-height-input");
const newMapFillInput = requireElement<HTMLInputElement>("new-map-fill-input");
const createMapButton = requireElement<HTMLButtonElement>("create-map-button");
const definitionEditorSelect = requireElement<HTMLSelectElement>("definition-editor-select");
const definitionNameInput = requireElement<HTMLInputElement>("definition-name-input");
const definitionKindSelect = requireElement<HTMLSelectElement>("definition-kind-select");
const definitionPlacementSelect = requireElement<HTMLSelectElement>("definition-placement-select");
const definitionAssetInput = requireElement<HTMLInputElement>("definition-asset-input");
const definitionFactionInput = requireElement<HTMLInputElement>("definition-faction-input");
const definitionLifeInput = requireElement<HTMLInputElement>("definition-life-input");
const definitionPowerInput = requireElement<HTMLInputElement>("definition-power-input");
const definitionSpeedInput = requireElement<HTMLInputElement>("definition-speed-input");
const libraryViewSelect = requireElement<HTMLSelectElement>("library-view-select");
const definitionSkillsSelect = requireElement<HTMLSelectElement>("definition-skills-select");
const definitionPossessionsSelect = requireElement<HTMLSelectElement>("definition-possessions-select");
const libraryCategorySummary = requireElement<HTMLElement>("library-category-summary");
const libraryObjectSummary = requireElement<HTMLElement>("library-object-summary");
const definitionBehaviorSelect = requireElement<HTMLSelectElement>("definition-behavior-select");
const definitionTurnIntervalInput = requireElement<HTMLInputElement>("definition-turn-interval-input");
const definitionDetectionInput = requireElement<HTMLInputElement>("definition-detection-input");
const definitionLeashInput = requireElement<HTMLInputElement>("definition-leash-input");
const definitionWanderInput = requireElement<HTMLInputElement>("definition-wander-input");
const definitionEditorStatus = requireElement<HTMLElement>("definition-editor-status");
const dialogueEditorSelect = requireElement<HTMLSelectElement>("dialogue-editor-select");
const dialogueSpeakerInput = requireElement<HTMLInputElement>("dialogue-speaker-input");
const dialogueTextInput = requireElement<HTMLTextAreaElement>("dialogue-text-input");
const dialogueChoiceInput = requireElement<HTMLInputElement>("dialogue-choice-input");
const dialogueEditorStatus = requireElement<HTMLElement>("dialogue-editor-status");
const triggerEditorSelect = requireElement<HTMLSelectElement>("trigger-editor-select");
const triggerTypeSelect = requireElement<HTMLSelectElement>("trigger-type-select");
const triggerMapSelect = requireElement<HTMLSelectElement>("trigger-map-select");
const triggerXInput = requireElement<HTMLInputElement>("trigger-x-input");
const triggerYInput = requireElement<HTMLInputElement>("trigger-y-input");
const triggerRunOnceInput = requireElement<HTMLInputElement>("trigger-run-once-input");
const createTriggerButton = requireElement<HTMLButtonElement>("create-trigger-button");
const duplicateTriggerButton = requireElement<HTMLButtonElement>("duplicate-trigger-button");
const deleteTriggerButton = requireElement<HTMLButtonElement>("delete-trigger-button");
const triggerConditionsInput = requireElement<HTMLTextAreaElement>("trigger-conditions-input");
const triggerActionsInput = requireElement<HTMLTextAreaElement>("trigger-actions-input");
const conditionBuilderType = requireElement<HTMLSelectElement>("condition-builder-type");
const conditionFlagFields = requireElement<HTMLElement>("condition-flag-fields");
const conditionItemFields = requireElement<HTMLElement>("condition-item-fields");
const conditionQuestFields = requireElement<HTMLElement>("condition-quest-fields");
const conditionFlagSelect = requireElement<HTMLSelectElement>("condition-flag-select");
const conditionValueInput = requireElement<HTMLInputElement>("condition-value-input");
const conditionItemSelect = requireElement<HTMLSelectElement>("condition-item-select");
const conditionQuantityInput = requireElement<HTMLInputElement>("condition-quantity-input");
const conditionQuestSelect = requireElement<HTMLSelectElement>("condition-quest-select");
const conditionStageInput = requireElement<HTMLInputElement>("condition-stage-input");
const addConditionButton = requireElement<HTMLButtonElement>("add-condition-button");
const conditionBuilderList = requireElement<HTMLElement>("condition-builder-list");
const actionBuilderType = requireElement<HTMLSelectElement>("action-builder-type");
const actionDialogueFields = requireElement<HTMLElement>("action-dialogue-fields");
const actionFlagFields = requireElement<HTMLElement>("action-flag-fields");
const actionItemFields = requireElement<HTMLElement>("action-item-fields");
const actionMapFields = requireElement<HTMLElement>("action-map-fields");
const actionTileFields = requireElement<HTMLElement>("action-tile-fields");
const actionDialogueSelect = requireElement<HTMLSelectElement>("action-dialogue-select");
const actionFlagSelect = requireElement<HTMLSelectElement>("action-flag-select");
const actionValueInput = requireElement<HTMLInputElement>("action-value-input");
const actionItemSelect = requireElement<HTMLSelectElement>("action-item-select");
const actionQuantityInput = requireElement<HTMLInputElement>("action-quantity-input");
const actionMapSelect = requireElement<HTMLSelectElement>("action-map-select");
const actionXInput = requireElement<HTMLInputElement>("action-x-input");
const actionYInput = requireElement<HTMLInputElement>("action-y-input");
const actionTileInput = requireElement<HTMLInputElement>("action-tile-input");
const addActionButton = requireElement<HTMLButtonElement>("add-action-button");
const actionBuilderList = requireElement<HTMLElement>("action-builder-list");
const triggerEditorStatus = requireElement<HTMLElement>("trigger-editor-status");
const triggerReferenceList = requireElement<HTMLElement>("trigger-reference-list");
const draftStatus = requireElement<HTMLElement>("draft-status");
const validationSummary = requireElement<HTMLElement>("validation-summary");
const validationList = requireElement<HTMLElement>("validation-list");
const entitySummary = requireElement<HTMLElement>("entity-summary");
const saveDraftButton = requireElement<HTMLButtonElement>("save-draft-button");
const resetDraftButton = requireElement<HTMLButtonElement>("reset-draft-button");
const playtestButton = requireElement<HTMLButtonElement>("playtest-button");
const apiStatus = requireElement<HTMLElement>("api-status");
const projectStatus = requireElement<HTMLElement>("project-status");
const serverValidationStatus = requireElement<HTMLElement>("server-validation-status");
const releaseSummary = requireElement<HTMLElement>("release-summary");
const validateDraftButton = requireElement<HTMLButtonElement>("validate-draft-button");
const createProjectButton = requireElement<HTMLButtonElement>("create-project-button");
const saveProjectButton = requireElement<HTMLButtonElement>("save-project-button");
const publishReleaseButton = requireElement<HTMLButtonElement>("publish-release-button");
const openReleaseButton = requireElement<HTMLButtonElement>("open-release-button");
const editorAreaLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-editor-area]"));
const editorAreaSections = Array.from(document.querySelectorAll<HTMLElement>("[data-editor-areas]"));

let draft: AdventurePackage = cloneAdventurePackage(sampleAdventure);
let currentMapId = DEFAULT_MAP_ID;
let apiSession: ApiSession | null = null;
let currentProject: ProjectRecord | null = null;
let currentReleases: ReleaseSummary[] = [];
let selectedTileId = FALLBACK_TILES[0] ?? "grass";
let selectedEntityId: EntityInstance["id"] | "" = "";
let selectedEntityDefinitionId: EntityDefId | "" = "";
let selectedDefinitionEditorId: EntityDefId | "" = "";
let selectedDialogueEditorId: DialogueDefinition["id"] | "" = "";
let selectedTriggerEditorId: TriggerDefinition["id"] | "" = "";
let entityEditIntent: "move" | "place" = "move";
let isTileBrushActive = false;
let lastPaintedCellKey: string | null = null;
let localValidationReport: ValidationReport = validateAdventure(draft);
let latestServerValidationReport: ValidationReport | null = null;
type EditorArea = "adventure" | "world" | "map" | "libraries" | "logic" | "test";
let activeEditorArea: EditorArea = readInitialEditorArea();
type TriggerDefinitionUpdateDraft = Omit<Partial<TriggerDefinition>, "mapId" | "x" | "y" | "runOnce"> & {
  mapId?: TriggerDefinition["mapId"] | "";
  x?: number | undefined;
  y?: number | undefined;
  runOnce?: boolean;
};


for (const link of editorAreaLinks) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    if (link.hash) {
      history.replaceState(null, "", link.hash);
    }
    setActiveEditorArea((link.dataset.editorArea ?? "world") as EditorArea);
  });
}
mapSelect.addEventListener("change", () => setCurrentMapFromSelect(mapSelect));
workspaceMapSelect.addEventListener("change", () => setCurrentMapFromSelect(workspaceMapSelect));
logicMapSelect.addEventListener("change", () => setCurrentMapFromSelect(logicMapSelect));

editModeSelect.addEventListener("change", () => {
  endTileBrush();
  syncModeVisibility();
  renderEditor();
});

tileSelect.addEventListener("change", () => {
  selectedTileId = tileSelect.value || selectedTileId;
  renderBrushPreview();
  renderEditorHint();
  renderActiveEditorArea();
});

entitySelect.addEventListener("change", () => {
  selectedEntityId = (entitySelect.value as EntityInstance["id"] | "") || "";
  entityEditIntent = selectedEntityId ? "move" : "place";
  renderBrushPreview();
  renderEditorHint();
  renderActiveEditorArea();
});

entityDefinitionSelect.addEventListener("change", () => {
  selectedEntityDefinitionId = (entityDefinitionSelect.value as EntityDefId | "") || "";
  entityEditIntent = "place";
  selectedEntityId = "";
  entitySelect.value = "";
  renderBrushPreview();
  renderEditorHint();
  renderActiveEditorArea();
});

placeEntityButton.addEventListener("click", () => {
  entityEditIntent = "place";
  selectedEntityId = "";
  entitySelect.value = "";
  renderBrushPreview();
  renderEditorHint();
  renderActiveEditorArea();
});

titleInput.addEventListener("input", () => {
  draft = updateAdventureMetadata(draft, { title: titleInput.value });
  markValidationDirty();
  renderProjectPanel();
});

descriptionInput.addEventListener("input", () => {
  draft = updateAdventureMetadata(draft, { description: descriptionInput.value });
  markValidationDirty();
  renderProjectPanel();
});

for (const element of [mapNameInput, mapKindSelect, mapRegionSelect]) {
  element.addEventListener("input", () => applyMapStructureChanges());
  element.addEventListener("change", () => applyMapStructureChanges());
}

createMapButton.addEventListener("click", () => {
  createBlankMapFromEditor();
});

libraryViewSelect.addEventListener("change", () => renderLibraryOverview());
definitionEditorSelect.addEventListener("change", () => {
  selectedDefinitionEditorId = (definitionEditorSelect.value as EntityDefId | "") || "";
  renderDefinitionEditor();
});

for (const element of [
  definitionNameInput,
  definitionKindSelect,
  definitionPlacementSelect,
  definitionAssetInput,
  definitionFactionInput,
  definitionLifeInput,
  definitionPowerInput,
  definitionSpeedInput,
  definitionSkillsSelect,
  definitionPossessionsSelect,
  definitionBehaviorSelect,
  definitionTurnIntervalInput,
  definitionDetectionInput,
  definitionLeashInput,
  definitionWanderInput
]) {
  element.addEventListener("input", () => applyDefinitionEditorChanges());
  element.addEventListener("change", () => applyDefinitionEditorChanges());
}

dialogueEditorSelect.addEventListener("change", () => {
  selectedDialogueEditorId = (dialogueEditorSelect.value as DialogueDefinition["id"] | "") || "";
  renderDialogueEditor();
});

for (const element of [dialogueSpeakerInput, dialogueTextInput, dialogueChoiceInput]) {
  element.addEventListener("input", () => applyDialogueEditorChanges());
}

triggerEditorSelect.addEventListener("change", () => {
  selectedTriggerEditorId = (triggerEditorSelect.value as TriggerDefinition["id"] | "") || "";
  renderTriggerEditor();
});

createTriggerButton.addEventListener("click", () => createTriggerFromEditor());
duplicateTriggerButton.addEventListener("click", () => duplicateSelectedTrigger());
deleteTriggerButton.addEventListener("click", () => deleteSelectedTrigger());

for (const element of [
  triggerTypeSelect,
  triggerMapSelect,
  triggerXInput,
  triggerYInput,
  triggerRunOnceInput,
  triggerConditionsInput,
  triggerActionsInput
]) {
  element.addEventListener("input", () => applyTriggerEditorChanges());
  element.addEventListener("change", () => applyTriggerEditorChanges());
}

conditionBuilderType.addEventListener("change", () => renderRuleBuilderControlVisibility());
actionBuilderType.addEventListener("change", () => renderRuleBuilderControlVisibility());
addConditionButton.addEventListener("click", () => addBuiltCondition());
addActionButton.addEventListener("click", () => addBuiltAction());
saveDraftButton.addEventListener("click", () => {
  void saveDraft();
});

resetDraftButton.addEventListener("click", () => {
  void resetDraft();
});

playtestButton.addEventListener("click", () => {
  void launchPlaytest();
});

validateDraftButton.addEventListener("click", () => {
  void validateDraftWithApi();
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

renderEditor();
void bootstrap();

async function bootstrap(): Promise<void> {
  apiStatus.textContent = "Connecting to local API...";

  let loadedLocalDraft = false;
  const existingDraft = await persistence.getDraft<AdventurePackage>(DRAFT_KEY);
  if (existingDraft) {
    draft = normalizeEditableAdventure(existingDraft.value);
    draftStatus.textContent = `Loaded local draft from ${new Date(existingDraft.updatedAt).toLocaleString()}.`;
    loadedLocalDraft = true;
  } else {
    draftStatus.textContent = "No saved draft yet. Editing the sample adventure.";
  }

  currentMapId = draft.maps[0]?.id ?? currentMapId;
  localValidationReport = validateAdventure(draft);
  renderEditor();

  try {
    apiSession = await projectApi.getSession();
    apiStatus.textContent = `Connected to local API as ${apiSession.displayName}.`;
  } catch (error) {
    apiStatus.textContent = `Local API unavailable: ${toErrorMessage(error)}`;
    renderProjectPanel();
    return;
  }

  const rememberedProjectId = window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
  if (rememberedProjectId) {
    try {
      currentProject = await projectApi.getProject(rememberedProjectId);
      currentReleases = await projectApi.listProjectReleases(rememberedProjectId);
      if (!loadedLocalDraft) {
        draft = normalizeEditableAdventure(currentProject.draft);
        draftStatus.textContent = `Loaded project draft '${currentProject.title}' from the local API.`;
        currentMapId = draft.maps[0]?.id ?? currentMapId;
        localValidationReport = validateAdventure(draft);
      }
    } catch (error) {
      window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
      projectStatus.textContent = `Saved project link could not be loaded: ${toErrorMessage(error)}`;
    }
  }

  renderEditor();
}

function normalizeEditableAdventure(value: unknown): AdventurePackage {
  return readAdventurePackage(value as RawAdventurePackage);
}

function setCurrentMapFromSelect(select: HTMLSelectElement): void {
  currentMapId = select.value as MapDefinition["id"];
  endTileBrush();
  renderEditor();
}
function renderEditor(): void {
  renderMetadata();
  renderDefinitionEditor();
  renderLibraryOverview();
  renderDialogueEditor();
  renderTriggerEditor();
  renderMapStructureEditor();
  renderMapOptions();
  renderPalette();
  renderGrid();
  renderEntitySummary();
  renderValidation();
  renderProjectPanel();
  syncModeVisibility();
  renderBrushPreview();
  renderEditorHint();
  renderActiveEditorArea();
}

function readInitialEditorArea(): EditorArea {
  const matchedLink = editorAreaLinks.find((link) => link.hash === window.location.hash);
  return (matchedLink?.dataset.editorArea ?? "world") as EditorArea;
}

function setActiveEditorArea(area: EditorArea): void {
  activeEditorArea = area;
  renderActiveEditorArea();
}

function renderActiveEditorArea(): void {
  for (const link of editorAreaLinks) {
    link.classList.toggle("active", link.dataset.editorArea === activeEditorArea);
    link.setAttribute("aria-current", link.dataset.editorArea === activeEditorArea ? "page" : "false");
  }

  for (const section of editorAreaSections) {
    const areas = (section.dataset.editorAreas ?? "").split(/\s+/).filter((area) => area.length > 0);
    section.classList.toggle("active", areas.includes(activeEditorArea));
  }
}
function renderMetadata(): void {
  titleInput.value = draft.metadata.title;
  descriptionInput.value = draft.metadata.description;
}


function renderMapStructureEditor(): void {
  const map = getMapById(draft, currentMapId);
  const regions = listRegions(draft);
  populateRegionSelect(mapRegionSelect, regions, map?.regionId ?? "");
  populateRegionSelect(newMapRegionSelect, regions, newMapRegionSelect.value as RegionDefinition["id"] | "");

  const disabled = !map;
  mapNameInput.disabled = disabled;
  mapKindSelect.disabled = disabled;
  mapRegionSelect.disabled = disabled;
  mapNameInput.value = map?.name ?? "";
  mapKindSelect.value = map?.kind ?? "local";
  mapRegionSelect.value = map?.regionId ?? "";
  renderMapStructureStatus();
}

function applyMapStructureChanges(): void {
  const map = getMapById(draft, currentMapId);
  if (!map) {
    return;
  }

  const updates: Partial<Pick<MapDefinition, "name" | "kind" | "regionId">> = {
    name: mapNameInput.value,
    kind: mapKindSelect.value as MapKind
  };
  updates.regionId = (mapRegionSelect.value || "") as NonNullable<MapDefinition["regionId"]>;

  draft = updateMapDefinition(draft, map.id, updates);
  markValidationDirty();
  renderMapOptions();
  renderMapStructureStatus();
  renderProjectPanel();
}

function createBlankMapFromEditor(): void {
  const name = newMapNameInput.value.trim() || "Untitled Map";
  const width = clampWholeNumber(newMapWidthInput.value, 3, 64, 8);
  const height = clampWholeNumber(newMapHeightInput.value, 3, 64, 8);
  const beforeIds = new Set(draft.maps.map((map) => map.id));
  const createInput: Parameters<typeof createMapDefinition>[1] = {
    name,
    kind: newMapKindSelect.value as MapKind,
    width,
    height,
    fillTileId: newMapFillInput.value.trim() || "grass"
  };
  const regionId = optionalRegionId(newMapRegionSelect.value);
  if (regionId) {
    createInput.regionId = regionId;
  }

  draft = createMapDefinition(draft, createInput);

  const created = draft.maps.find((map) => !beforeIds.has(map.id));
  currentMapId = created?.id ?? currentMapId;
  selectedTileId = newMapFillInput.value.trim() || selectedTileId;
  newMapNameInput.value = "";
  markValidationDirty();
  renderEditor();
  mapStructureStatus.textContent = `Created ${created?.name ?? name} as a ${created?.kind ?? "local"} map.`;
}

function populateRegionSelect(
  select: HTMLSelectElement,
  regions: RegionDefinition[],
  selectedRegionId: RegionDefinition["id"] | ""
): void {
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "No region";
  empty.selected = selectedRegionId === "";
  select.append(empty);

  for (const region of regions) {
    const option = document.createElement("option");
    option.value = region.id;
    option.textContent = region.name;
    option.selected = region.id === selectedRegionId;
    select.append(option);
  }
}

function renderMapStructureStatus(): void {
  const map = getMapById(draft, currentMapId);
  if (!map) {
    mapStructureStatus.textContent = "No map selected.";
    return;
  }

  const region = draft.regions.find((candidate) => candidate.id === map.regionId);
  mapStructureStatus.textContent = `${map.name}: ${map.width}x${map.height}, ${map.kind ?? "local"}, region ${region?.name ?? "none"}.`;
}

function optionalRegionId(value: string): RegionDefinition["id"] | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed as RegionDefinition["id"] : undefined;
}

function clampWholeNumber(value: string, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function renderDefinitionEditor(): void {
  const definitions = listEntityDefinitions(draft);
  if (!definitions.some((definition) => definition.id === selectedDefinitionEditorId)) {
    selectedDefinitionEditorId = definitions.find((definition) => definition.kind !== "player")?.id ?? definitions[0]?.id ?? "";
  }

  definitionEditorSelect.innerHTML = "";
  for (const definition of definitions) {
    const option = document.createElement("option");
    option.value = definition.id;
    option.textContent = `${definition.name} (${definition.kind})`;
    option.selected = definition.id === selectedDefinitionEditorId;
    definitionEditorSelect.append(option);
  }

  const definition = currentEditedDefinition();
  const behavior = normalizeBehaviorProfile(definition?.behavior);
  const disabled = !definition;

  definitionNameInput.disabled = disabled;
  definitionKindSelect.disabled = disabled;
  definitionPlacementSelect.disabled = disabled;
  definitionAssetInput.disabled = disabled;
  definitionFactionInput.disabled = disabled;
  definitionLifeInput.disabled = disabled;
  definitionPowerInput.disabled = disabled;
  definitionSpeedInput.disabled = disabled;
  definitionSkillsSelect.disabled = disabled;
  definitionPossessionsSelect.disabled = disabled;
  definitionBehaviorSelect.disabled = disabled;
  definitionTurnIntervalInput.disabled = disabled;
  definitionDetectionInput.disabled = disabled;
  definitionLeashInput.disabled = disabled;
  definitionWanderInput.disabled = disabled;

  definitionNameInput.value = definition?.name ?? "";
  definitionKindSelect.value = definition?.kind ?? "npc";
  definitionPlacementSelect.value = definition?.placement ?? "multiple";
  definitionAssetInput.value = definition?.assetId ? String(definition.assetId) : "";
  definitionFactionInput.value = definition?.faction ?? "";
  definitionLifeInput.value = definition?.profile?.stats?.life !== undefined ? String(definition.profile.stats.life) : "";
  definitionPowerInput.value = definition?.profile?.stats?.power !== undefined ? String(definition.profile.stats.power) : "";
  definitionSpeedInput.value = definition?.profile?.stats?.speed !== undefined ? String(definition.profile.stats.speed) : "";
  populateSkillSelect(definition?.profile?.skillIds ?? []);
  populatePossessionSelect(definition);
  definitionBehaviorSelect.value = behavior.mode;
  definitionTurnIntervalInput.value = behavior.turnInterval ? String(behavior.turnInterval) : "";
  definitionDetectionInput.value = behavior.detectionRange ? String(behavior.detectionRange) : "";
  definitionLeashInput.value = behavior.leashRange ? String(behavior.leashRange) : "";
  definitionWanderInput.value = behavior.wanderRadius ? String(behavior.wanderRadius) : "";

  renderDefinitionEditorStatus();
}

function applyDefinitionEditorChanges(): void {
  const definition = currentEditedDefinition();
  if (!definition) {
    return;
  }

  const name = definitionNameInput.value.trim() || definition.name;
  const behavior = createBehaviorProfileFromEditor();
  const updates: Partial<EntityDefinition> = {
    name,
    kind: definitionKindSelect.value as EntityDefinition["kind"],
    placement: definitionPlacementSelect.value as NonNullable<EntityDefinition["placement"]>,
    behavior,
    profile: createEntityProfileFromEditor() ?? {},
    startingPossessions: selectedStartingPossessions() ?? []
  };
  const assetId = optionalAssetId(definitionAssetInput.value);
  const faction = optionalText(definitionFactionInput.value);
  if (assetId !== undefined) {
    updates.assetId = assetId;
  } else {
    updates.assetId = "" as NonNullable<EntityDefinition["assetId"]>;
  }
  if (faction !== undefined) {
    updates.faction = faction;
  } else {
    updates.faction = "";
  }

  draft = updateEntityDefinition(draft, definition.id, updates);

  selectedEntityDefinitionId = selectedEntityDefinitionId || definition.id;
  markValidationDirty();
  renderPalette();
  renderEntitySummary();
  renderBrushPreview();
  renderEditorHint();
  renderDefinitionEditorStatus();
  renderProjectPanel();
}

function populateSkillSelect(selectedIds: readonly SkillDefId[]): void {
  const selected = new Set(selectedIds.map(String));
  definitionSkillsSelect.innerHTML = "";
  for (const skill of listSkillDefinitions(draft)) {
    const option = document.createElement("option");
    option.value = skill.id;
    option.textContent = `${skill.name} (${categoryName(skill.categoryId)})`;
    option.selected = selected.has(String(skill.id));
    definitionSkillsSelect.append(option);
  }
}

function populatePossessionSelect(definition: EntityDefinition | undefined): void {
  const selected = new Set((definition?.startingPossessions ?? []).map((possession) => String(possession.itemId)));
  definitionPossessionsSelect.innerHTML = "";
  for (const item of listItemDefinitions(draft)) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} (${categoryName(item.categoryId)})`;
    option.selected = selected.has(String(item.id));
    definitionPossessionsSelect.append(option);
  }
}

function selectedSkillIds(): SkillDefId[] {
  return Array.from(definitionSkillsSelect.selectedOptions).map((option) => option.value as SkillDefId);
}

function selectedStartingPossessions(): EntityDefinition["startingPossessions"] {
  const possessions = Array.from(definitionPossessionsSelect.selectedOptions).map((option) => ({
    itemId: option.value as ItemDefId,
    quantity: 1
  }));
  return possessions.length > 0 ? possessions : undefined;
}

function skillName(skillId: SkillDefId): string {
  return draft.skillDefinitions.find((skill) => skill.id === skillId)?.name ?? String(skillId);
}

function itemName(itemId: ItemDefId): string {
  return draft.itemDefinitions.find((item) => item.id === itemId)?.name ?? String(itemId);
}

function categoryName(categoryId: string | undefined): string {
  if (!categoryId) {
    return "Uncategorized";
  }
  return draft.libraryCategories.find((category) => category.id === categoryId)?.name ?? String(categoryId);
}
function currentEditedDefinition(): EntityDefinition | undefined {
  return draft.entityDefinitions.find((definition) => definition.id === selectedDefinitionEditorId);
}

function createEntityProfileFromEditor(): EntityDefinition["profile"] {
  const stats: NonNullable<EntityDefinition["profile"]>["stats"] = {};
  const life = optionalWholeNumber(definitionLifeInput.value);
  const power = optionalWholeNumber(definitionPowerInput.value);
  const speed = optionalWholeNumber(definitionSpeedInput.value);
  if (life !== undefined) {
    stats.life = life;
  }
  if (power !== undefined) {
    stats.power = power;
  }
  if (speed !== undefined) {
    stats.speed = speed;
  }

  const skills = selectedSkillIds();
  const profile: NonNullable<EntityDefinition["profile"]> = {};
  if (Object.keys(stats).length > 0) {
    profile.stats = stats;
  }
  if (skills.length > 0) {
    profile.skillIds = skills;
  }

  return Object.keys(profile).length > 0 ? profile : undefined;
}

function parseStartingPossessions(value: string): EntityDefinition["startingPossessions"] {
  const possessions = parseCommaList(value)
    .map((entry) => {
      const [itemId, quantityText] = entry.split(":").map((part) => part.trim());
      return {
        itemId: itemId as ItemDefId,
        quantity: optionalPositiveWholeNumber(quantityText ?? "") ?? 1
      };
    })
    .filter((possession) => String(possession.itemId).length > 0);

  return possessions.length > 0 ? possessions : undefined;
}

function parseCommaList(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
}

function formatStartingPossessions(definition: EntityDefinition | undefined): string {
  return (definition?.startingPossessions ?? [])
    .map((possession) => `${possession.itemId}:${possession.quantity ?? 1}`)
    .join(", ");
}

function createBehaviorProfileFromEditor(): EntityBehaviorProfile {
  const behavior: EntityBehaviorProfile = {
    mode: definitionBehaviorSelect.value as EntityBehaviorMode
  };
  assignOptionalNumber(behavior, "detectionRange", optionalWholeNumber(definitionDetectionInput.value));
  assignOptionalNumber(behavior, "leashRange", optionalWholeNumber(definitionLeashInput.value));
  assignOptionalNumber(behavior, "wanderRadius", optionalWholeNumber(definitionWanderInput.value));
  assignOptionalNumber(behavior, "turnInterval", optionalPositiveWholeNumber(definitionTurnIntervalInput.value));
  return behavior;
}


function assignOptionalNumber(
  target: EntityBehaviorProfile,
  key: "detectionRange" | "leashRange" | "wanderRadius" | "turnInterval",
  value: number | undefined
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}
function normalizeBehaviorProfile(behavior: EntityDefinition["behavior"]): EntityBehaviorProfile {
  if (!behavior) {
    return { mode: "idle" };
  }

  if (typeof behavior === "string") {
    return { mode: behavior };
  }

  return behavior;
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalAssetId(value: string): EntityDefinition["assetId"] | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed as NonNullable<EntityDefinition["assetId"]> : undefined;
}

function optionalWholeNumber(value: string): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(0, Math.floor(parsed));
}

function optionalPositiveWholeNumber(value: string): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(1, Math.floor(parsed));
}

function renderDefinitionEditorStatus(): void {
  const definition = currentEditedDefinition();
  if (!definition) {
    definitionEditorStatus.textContent = "No entity definition selected.";
    return;
  }

  const count = draft.entityInstances.filter((entity) => entity.definitionId === definition.id).length;
  const profile = summarizeDefinitionProfile(definition);
  const possessions = summarizeStartingPossessions(definition);
  definitionEditorStatus.textContent = `${definition.name} is a ${definition.kind} definition with ${count} placed instance(s). Profile: ${profile}. Starts with: ${possessions}. Edits affect future playtests and all existing instances of this definition.`;
}

function summarizeDefinitionProfile(definition: EntityDefinition): string {
  const stats = definition.profile?.stats;
  const statParts = [
    stats?.life !== undefined ? `life ${stats.life}` : "",
    stats?.power !== undefined ? `power ${stats.power}` : "",
    stats?.speed !== undefined ? `speed ${stats.speed}` : ""
  ].filter((part) => part.length > 0);
  const skills = definition.profile?.skillIds?.length ? `skills ${definition.profile.skillIds.map((skillId) => skillName(skillId)).join(", ")}` : "";
  return [...statParts, skills].filter((part) => part.length > 0).join("; ") || "none";
}

function summarizeStartingPossessions(definition: EntityDefinition): string {
  return (definition.startingPossessions ?? [])
    .map((possession) => `${possession.quantity ?? 1} x ${itemName(possession.itemId)}`)
    .join(", ") || "none";
}
function renderLibraryOverview(): void {
  const focus = libraryViewSelect.value || "entities";
  libraryCategorySummary.innerHTML = "";
  libraryObjectSummary.innerHTML = "";

  const categories = listLibraryCategories(draft).filter((category) => category.kind === focus.slice(0, -1) || category.kind === focus);
  if (categories.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No categories defined for this library focus yet.";
    libraryCategorySummary.append(item);
  } else {
    for (const category of categories) {
      const item = document.createElement("li");
      item.textContent = `${category.name}: ${category.description ?? "No description."}`;
      libraryCategorySummary.append(item);
    }
  }

  const rows = focusedLibraryRows(focus);
  if (rows.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No objects defined for this focus yet.";
    libraryObjectSummary.append(item);
    return;
  }

  for (const row of rows) {
    const item = document.createElement("li");
    item.textContent = row;
    libraryObjectSummary.append(item);
  }
}

function focusedLibraryRows(focus: string): string[] {
  switch (focus) {
    case "entities":
      return listEntityDefinitions(draft).map((definition) => `${definition.name} - ${definition.kind} - ${categoryName(definition.categoryId)}`);
    case "items":
      return listItemDefinitions(draft).map((item) => `${item.name} - ${item.useKind ?? "passive"} - ${categoryName(item.categoryId)}`);
    case "skills":
      return listSkillDefinitions(draft).map((skill) => `${skill.name} - ${categoryName(skill.categoryId)}`);
    case "flags":
      return listFlagDefinitions(draft).map((flag) => `${flag.name} - default ${String(flag.defaultValue ?? "unset")} - ${categoryName(flag.categoryId)}`);
    case "quests":
      return listQuestDefinitions(draft).map((quest) => `${quest.name} - ${categoryName(quest.categoryId)}`);
    default:
      return [];
  }
}
function renderDialogueEditor(): void {
  const dialogues = listDialogueDefinitions(draft);
  if (!dialogues.some((dialogue) => dialogue.id === selectedDialogueEditorId)) {
    selectedDialogueEditorId = dialogues[0]?.id ?? "";
  }

  dialogueEditorSelect.innerHTML = "";
  for (const dialogue of dialogues) {
    const option = document.createElement("option");
    option.value = dialogue.id;
    option.textContent = dialogue.id;
    option.selected = dialogue.id === selectedDialogueEditorId;
    dialogueEditorSelect.append(option);
  }

  const node = currentEditedDialogueNode();
  const disabled = !node;
  dialogueSpeakerInput.disabled = disabled;
  dialogueTextInput.disabled = disabled;
  dialogueChoiceInput.disabled = disabled;
  dialogueSpeakerInput.value = node?.speaker ?? "";
  dialogueTextInput.value = node?.text ?? "";
  dialogueChoiceInput.value = node?.choices?.[0]?.label ?? "Continue";
  renderDialogueEditorStatus();
}

function applyDialogueEditorChanges(): void {
  const dialogue = currentEditedDialogue();
  const node = currentEditedDialogueNode();
  if (!dialogue || !node) {
    return;
  }

  const firstChoice = node.choices?.[0] ?? { id: `${node.id}_close`, label: "Continue" };
  draft = updateDialogueNode(draft, dialogue.id, node.id, {
    speaker: dialogueSpeakerInput.value.trim(),
    text: dialogueTextInput.value,
    choices: [{ ...firstChoice, label: dialogueChoiceInput.value.trim() || "Continue" }]
  });
  markValidationDirty();
  renderDialogueEditorStatus();
  renderProjectPanel();
}

function currentEditedDialogue(): DialogueDefinition | undefined {
  return draft.dialogue.find((dialogue) => dialogue.id === selectedDialogueEditorId);
}

function currentEditedDialogueNode(): DialogueDefinition["nodes"][number] | undefined {
  return currentEditedDialogue()?.nodes[0];
}

function renderDialogueEditorStatus(): void {
  const dialogue = currentEditedDialogue();
  const node = currentEditedDialogueNode();
  if (!dialogue || !node) {
    dialogueEditorStatus.textContent = "No dialogue record selected.";
    return;
  }

  dialogueEditorStatus.textContent = `${dialogue.id} edits node ${node.id}. Runtime triggers that show this dialogue will use the updated text.`;
}

function renderTriggerEditor(): void {
  const triggers = listTriggerDefinitions(draft);
  if (!triggers.some((trigger) => trigger.id === selectedTriggerEditorId)) {
    selectedTriggerEditorId = triggers[0]?.id ?? "";
  }

  triggerEditorSelect.innerHTML = "";
  for (const trigger of triggers) {
    const option = document.createElement("option");
    option.value = trigger.id;
    option.textContent = `${trigger.id} (${trigger.type})`;
    option.selected = trigger.id === selectedTriggerEditorId;
    triggerEditorSelect.append(option);
  }

  triggerMapSelect.innerHTML = "";
  const anyMapOption = document.createElement("option");
  anyMapOption.value = "";
  anyMapOption.textContent = "Any current map";
  triggerMapSelect.append(anyMapOption);
  for (const map of draft.maps) {
    const option = document.createElement("option");
    option.value = map.id;
    option.textContent = map.name;
    triggerMapSelect.append(option);
  }

  const trigger = currentEditedTrigger();
  const disabled = !trigger;
  triggerTypeSelect.disabled = disabled;
  triggerMapSelect.disabled = disabled;
  triggerXInput.disabled = disabled;
  triggerYInput.disabled = disabled;
  triggerRunOnceInput.disabled = disabled;
  triggerConditionsInput.disabled = disabled;
  triggerActionsInput.disabled = disabled;
  createTriggerButton.disabled = false;
  duplicateTriggerButton.disabled = disabled;
  deleteTriggerButton.disabled = disabled;
  addConditionButton.disabled = disabled;
  addActionButton.disabled = disabled;
  conditionBuilderType.disabled = disabled;
  actionBuilderType.disabled = disabled;

  triggerTypeSelect.value = trigger?.type ?? "onEnterTile";
  triggerMapSelect.value = trigger?.mapId ?? "";
  triggerXInput.value = typeof trigger?.x === "number" ? String(trigger.x) : "";
  triggerYInput.value = typeof trigger?.y === "number" ? String(trigger.y) : "";
  triggerRunOnceInput.checked = trigger?.runOnce ?? false;
  triggerConditionsInput.value = formatJson(trigger?.conditions ?? []);
  triggerActionsInput.value = formatJson(trigger?.actions ?? []);
  renderRuleBuilder(trigger);
  renderTriggerReferences(trigger);
  renderTriggerEditorStatus();
}

function createTriggerFromEditor(): void {
  const map = getMapById(draft, currentMapId);
  draft = createTriggerDefinition(draft, {
    name: map ? `${map.name}_event` : "event",
    type: "onEnterTile",
    mapId: currentMapId,
    x: 0,
    y: 0
  });
  selectedTriggerEditorId = draft.triggers[draft.triggers.length - 1]?.id ?? "";
  markValidationDirty();
  renderEditor();
  triggerEditorStatus.textContent = `Created ${selectedTriggerEditorId}. Switch Map Workspace to Trigger Markers and click a cell to place it.`;
}

function duplicateSelectedTrigger(): void {
  const trigger = currentEditedTrigger();
  if (!trigger) {
    return;
  }

  const previousIds = new Set(draft.triggers.map((candidate) => candidate.id));
  draft = duplicateTriggerDefinition(draft, trigger.id);
  selectedTriggerEditorId = draft.triggers.find((candidate) => !previousIds.has(candidate.id))?.id ?? trigger.id;
  markValidationDirty();
  renderEditor();
  triggerEditorStatus.textContent = `Duplicated ${trigger.id} as ${selectedTriggerEditorId}.`;
}

function deleteSelectedTrigger(): void {
  const trigger = currentEditedTrigger();
  if (!trigger) {
    return;
  }

  draft = deleteTriggerDefinition(draft, trigger.id);
  selectedTriggerEditorId = draft.triggers[0]?.id ?? "";
  markValidationDirty();
  renderEditor();
  triggerEditorStatus.textContent = `Deleted ${trigger.id}.`;
}

function attachSelectedTriggerToCell(x: number, y: number): void {
  const trigger = currentEditedTrigger();
  if (!trigger) {
    triggerEditorStatus.textContent = "Create or select a trigger before attaching it to the map.";
    return;
  }

  draft = updateTriggerDefinition(draft, trigger.id, {
    mapId: currentMapId,
    x,
    y
  });
  triggerMapSelect.value = currentMapId;
  triggerXInput.value = String(x);
  triggerYInput.value = String(y);
  markValidationDirty();
  renderEditor();
  triggerEditorStatus.textContent = `Attached ${trigger.id} to ${currentMapId} (${x}, ${y}).`;
}
function applyTriggerEditorChanges(): void {
  const trigger = currentEditedTrigger();
  if (!trigger) {
    return;
  }

  const conditions = parseJsonArray<Condition>(triggerConditionsInput.value);
  const actions = parseJsonArray<Action>(triggerActionsInput.value);
  if (!conditions.valid) {
    triggerEditorStatus.textContent = `Fix conditions JSON before saving rule changes. ${conditions.error}`;
    return;
  }

  if (!actions.valid) {
    triggerEditorStatus.textContent = `Fix actions JSON before saving rule changes. ${actions.error}`;
    return;
  }

  const updates: TriggerDefinitionUpdateDraft = {
    type: triggerTypeSelect.value as TriggerType,
    runOnce: triggerRunOnceInput.checked,
    conditions: conditions.value,
    actions: actions.value,
    mapId: (triggerMapSelect.value || "") as NonNullable<TriggerDefinition["mapId"]>,
    x: optionalCoordinate(triggerXInput.value),
    y: optionalCoordinate(triggerYInput.value)
  };

  draft = updateTriggerDefinition(draft, trigger.id, updates);
  markValidationDirty();
  renderRuleBuilder(currentEditedTrigger());
  renderTriggerEditorStatus();
  renderProjectPanel();
}

function currentEditedTrigger(): TriggerDefinition | undefined {
  return draft.triggers.find((trigger) => trigger.id === selectedTriggerEditorId);
}

function renderTriggerReferences(trigger: TriggerDefinition | undefined): void {
  triggerReferenceList.innerHTML = "";
  if (!trigger) {
    const item = document.createElement("li");
    item.textContent = "No trigger selected.";
    triggerReferenceList.append(item);
    return;
  }

  const references = summarizeTriggerReferences(trigger);
  if (references.length === 0) {
    const item = document.createElement("li");
    item.textContent = "This trigger does not reference any maps, dialogue, items, quests, or tiles yet.";
    triggerReferenceList.append(item);
    return;
  }

  for (const reference of references) {
    const item = document.createElement("li");
    item.textContent = reference;
    triggerReferenceList.append(item);
  }
}

function summarizeTriggerReferences(trigger: TriggerDefinition): string[] {
  const references: string[] = [];
  if (trigger.mapId) {
    const map = draft.maps.find((candidate) => candidate.id === trigger.mapId);
    references.push(`When map: ${map?.name ?? trigger.mapId}${typeof trigger.x === "number" && typeof trigger.y === "number" ? ` at (${trigger.x}, ${trigger.y})` : ""}`);
  }

  for (const condition of trigger.conditions) {
    switch (condition.type) {
      case "flagEquals":
        references.push(`Condition flag: ${condition.flag}`);
        break;
      case "hasItem": {
        const item = draft.itemDefinitions.find((candidate) => candidate.id === condition.itemId);
        references.push(`Condition item: ${item?.name ?? condition.itemId}`);
        break;
      }
      case "questStageAtLeast": {
        const quest = draft.questDefinitions.find((candidate) => candidate.id === condition.questId);
        references.push(`Condition quest: ${quest?.name ?? condition.questId}`);
        break;
      }
    }
  }

  for (const action of trigger.actions) {
    switch (action.type) {
      case "showDialogue":
        references.push(`Action dialogue: ${action.dialogueId}`);
        break;
      case "setFlag":
        references.push(`Action flag: ${action.flag}`);
        break;
      case "giveItem": {
        const item = draft.itemDefinitions.find((candidate) => candidate.id === action.itemId);
        references.push(`Action item: ${item?.name ?? action.itemId}`);
        break;
      }
      case "teleport": {
        const map = draft.maps.find((candidate) => candidate.id === action.mapId);
        references.push(`Action teleport: ${map?.name ?? action.mapId} (${action.x}, ${action.y})`);
        break;
      }
      case "changeTile": {
        const map = draft.maps.find((candidate) => candidate.id === action.mapId);
        references.push(`Action tile: ${map?.name ?? action.mapId} (${action.x}, ${action.y}) -> ${action.tileId}`);
        break;
      }
    }
  }

  return references;
}
function renderTriggerEditorStatus(): void {
  const trigger = currentEditedTrigger();
  if (!trigger) {
    triggerEditorStatus.textContent = "No trigger selected.";
    return;
  }

  const location = trigger.mapId ? `${trigger.mapId} (${trigger.x ?? "any"}, ${trigger.y ?? "any"})` : "any current map";
  triggerEditorStatus.textContent = `${trigger.id} fires on ${trigger.type} at ${location}. Conditions and actions are structured JSON, not executable code.`;
}

function renderRuleBuilder(trigger: TriggerDefinition | undefined): void {
  populateRuleBuilderOptions();
  renderRuleBuilderControlVisibility();
  renderConditionBuilderList(trigger?.conditions ?? []);
  renderActionBuilderList(trigger?.actions ?? []);
}

function populateRuleBuilderOptions(): void {
  populateFlagSelect(conditionFlagSelect, draft.flagDefinitions[0]?.id ?? "");
  populateFlagSelect(actionFlagSelect, draft.flagDefinitions[0]?.id ?? "");
  populateItemSelect(conditionItemSelect, draft.itemDefinitions[0]?.id ?? "");
  populateItemSelect(actionItemSelect, draft.itemDefinitions[0]?.id ?? "");
  populateQuestSelect(conditionQuestSelect, draft.questDefinitions[0]?.id ?? "");
  populateDialogueSelect(actionDialogueSelect, draft.dialogue[0]?.id ?? "");
  populateMapSelect(actionMapSelect, currentMapId);
}

function renderRuleBuilderControlVisibility(): void {
  const conditionType = conditionBuilderType.value as Condition["type"];
  conditionFlagFields.classList.toggle("hidden", conditionType !== "flagEquals");
  conditionItemFields.classList.toggle("hidden", conditionType !== "hasItem");
  conditionQuestFields.classList.toggle("hidden", conditionType !== "questStageAtLeast");

  const actionType = actionBuilderType.value as Action["type"];
  actionDialogueFields.classList.toggle("hidden", actionType !== "showDialogue");
  actionFlagFields.classList.toggle("hidden", actionType !== "setFlag");
  actionItemFields.classList.toggle("hidden", actionType !== "giveItem");
  actionMapFields.classList.toggle("hidden", actionType !== "teleport" && actionType !== "changeTile");
  actionTileFields.classList.toggle("hidden", actionType !== "changeTile");
}

function renderConditionBuilderList(conditions: Condition[]): void {
  conditionBuilderList.innerHTML = "";
  if (conditions.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No conditions. This trigger always fires when its When target matches.";
    conditionBuilderList.append(item);
    return;
  }

  conditions.forEach((condition, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${summarizeCondition(condition)}</span>`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "mini-remove-button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeBuiltCondition(index));
    item.append(remove);
    conditionBuilderList.append(item);
  });
}

function renderActionBuilderList(actions: Action[]): void {
  actionBuilderList.innerHTML = "";
  if (actions.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No actions yet. Add at least one Then action to make the trigger visible in play.";
    actionBuilderList.append(item);
    return;
  }

  actions.forEach((action, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${index + 1}. ${summarizeAction(action)}</span>`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "mini-remove-button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeBuiltAction(index));
    item.append(remove);
    actionBuilderList.append(item);
  });
}

function addBuiltCondition(): void {
  const trigger = currentEditedTrigger();
  if (!trigger) {
    return;
  }

  const condition = buildConditionFromControls();
  if (!condition) {
    return;
  }

  draft = updateTriggerDefinition(draft, trigger.id, { conditions: [...trigger.conditions, condition] });
  markValidationDirty();
  renderTriggerEditor();
  renderProjectPanel();
}

function removeBuiltCondition(index: number): void {
  const trigger = currentEditedTrigger();
  if (!trigger) {
    return;
  }

  draft = updateTriggerDefinition(draft, trigger.id, { conditions: trigger.conditions.filter((_, candidateIndex) => candidateIndex !== index) });
  markValidationDirty();
  renderTriggerEditor();
  renderProjectPanel();
}

function addBuiltAction(): void {
  const trigger = currentEditedTrigger();
  if (!trigger) {
    return;
  }

  const action = buildActionFromControls();
  if (!action) {
    return;
  }

  draft = updateTriggerDefinition(draft, trigger.id, { actions: [...trigger.actions, action] });
  markValidationDirty();
  renderTriggerEditor();
  renderProjectPanel();
}

function removeBuiltAction(index: number): void {
  const trigger = currentEditedTrigger();
  if (!trigger) {
    return;
  }

  draft = updateTriggerDefinition(draft, trigger.id, { actions: trigger.actions.filter((_, candidateIndex) => candidateIndex !== index) });
  markValidationDirty();
  renderTriggerEditor();
  renderProjectPanel();
}

function buildConditionFromControls(): Condition | null {
  switch (conditionBuilderType.value as Condition["type"]) {
    case "flagEquals": {
      const flag = conditionFlagSelect.value.trim();
      if (!flag) {
        triggerEditorStatus.textContent = "Choose a flag name before adding a flag condition.";
        return null;
      }

      return { type: "flagEquals", flag, value: parseRuleValue(conditionValueInput.value) };
    }
    case "hasItem": {
      const itemId = conditionItemSelect.value as ItemDefId;
      if (!itemId) {
        triggerEditorStatus.textContent = "Choose an item before adding an inventory condition.";
        return null;
      }

      return { type: "hasItem", itemId, quantity: clampWholeNumber(conditionQuantityInput.value, 1, 999, 1) };
    }
    case "questStageAtLeast": {
      const questId = conditionQuestSelect.value as QuestId;
      if (!questId) {
        triggerEditorStatus.textContent = "Choose a quest before adding a quest-stage condition.";
        return null;
      }

      return { type: "questStageAtLeast", questId, stage: clampWholeNumber(conditionStageInput.value, 0, 99, 1) };
    }
    default:
      return null;
  }
}

function buildActionFromControls(): Action | null {
  switch (actionBuilderType.value as Action["type"]) {
    case "showDialogue": {
      const dialogueId = actionDialogueSelect.value as DialogueDefinition["id"];
      if (!dialogueId) {
        triggerEditorStatus.textContent = "Choose dialogue before adding a show-dialogue action.";
        return null;
      }

      return { type: "showDialogue", dialogueId };
    }
    case "setFlag": {
      const flag = actionFlagSelect.value.trim();
      if (!flag) {
        triggerEditorStatus.textContent = "Choose a flag name before adding a set-flag action.";
        return null;
      }

      return { type: "setFlag", flag, value: parseRuleValue(actionValueInput.value) };
    }
    case "giveItem": {
      const itemId = actionItemSelect.value as ItemDefId;
      if (!itemId) {
        triggerEditorStatus.textContent = "Choose an item before adding a give-item action.";
        return null;
      }

      return { type: "giveItem", itemId, quantity: clampWholeNumber(actionQuantityInput.value, 1, 999, 1) };
    }
    case "teleport": {
      const mapId = actionMapSelect.value as MapDefinition["id"];
      if (!mapId) {
        triggerEditorStatus.textContent = "Choose a map before adding a teleport action.";
        return null;
      }

      return { type: "teleport", mapId, x: clampWholeNumber(actionXInput.value, 0, 999, 1), y: clampWholeNumber(actionYInput.value, 0, 999, 1) };
    }
    case "changeTile": {
      const mapId = actionMapSelect.value as MapDefinition["id"];
      const tileId = actionTileInput.value.trim();
      if (!mapId || !tileId) {
        triggerEditorStatus.textContent = "Choose a map and tile id before adding a tile-change action.";
        return null;
      }

      return { type: "changeTile", mapId, x: clampWholeNumber(actionXInput.value, 0, 999, 1), y: clampWholeNumber(actionYInput.value, 0, 999, 1), tileId };
    }
    default:
      return null;
  }
}

function populateFlagSelect(select: HTMLSelectElement, selectedId: FlagDefId | ""): void {
  const previousValue = select.value || selectedId;
  select.innerHTML = "";
  for (const flag of listFlagDefinitions(draft)) {
    const option = document.createElement("option");
    option.value = flag.id;
    option.textContent = `${flag.name} (${categoryName(flag.categoryId)})`;
    option.selected = flag.id === previousValue;
    select.append(option);
  }
}
function populateItemSelect(select: HTMLSelectElement, selectedId: ItemDefId | ""): void {
  const previousValue = select.value || selectedId;
  select.innerHTML = "";
  for (const item of draft.itemDefinitions) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    option.selected = item.id === previousValue;
    select.append(option);
  }
}

function populateQuestSelect(select: HTMLSelectElement, selectedId: string): void {
  const previousValue = select.value || selectedId;
  select.innerHTML = "";
  for (const quest of draft.questDefinitions) {
    const option = document.createElement("option");
    option.value = quest.id;
    option.textContent = quest.name;
    option.selected = quest.id === previousValue;
    select.append(option);
  }
}

function populateDialogueSelect(select: HTMLSelectElement, selectedId: DialogueDefinition["id"] | ""): void {
  const previousValue = select.value || selectedId;
  select.innerHTML = "";
  for (const dialogue of draft.dialogue) {
    const option = document.createElement("option");
    option.value = dialogue.id;
    option.textContent = String(dialogue.id);
    option.selected = dialogue.id === previousValue;
    select.append(option);
  }
}

function populateMapSelect(select: HTMLSelectElement, selectedId: MapDefinition["id"] | ""): void {
  const previousValue = selectedId || select.value;
  select.innerHTML = "";
  for (const map of draft.maps) {
    const option = document.createElement("option");
    option.value = map.id;
    option.textContent = map.name;
    option.selected = map.id === previousValue;
    select.append(option);
  }
}

function summarizeCondition(condition: Condition): string {
  switch (condition.type) {
    case "flagEquals":
      return `Flag ${condition.flag} equals ${String(condition.value)}`;
    case "hasItem":
      return `Inventory has ${condition.quantity ?? 1} x ${condition.itemId}`;
    case "questStageAtLeast":
      return `Quest ${condition.questId} is at least stage ${condition.stage}`;
    default:
      return assertUnknownRule(condition);
  }
}

function summarizeAction(action: Action): string {
  switch (action.type) {
    case "showDialogue":
      return `Show dialogue ${action.dialogueId}`;
    case "setFlag":
      return `Set flag ${action.flag} to ${String(action.value)}`;
    case "giveItem":
      return `Give ${action.quantity ?? 1} x ${action.itemId}`;
    case "teleport":
      return `Teleport to ${action.mapId} at (${action.x}, ${action.y})`;
    case "changeTile":
      return `Change ${action.mapId} (${action.x}, ${action.y}) to ${action.tileId}`;
    default:
      return assertUnknownRule(action);
  }
}

function parseRuleValue(value: string): boolean | number | string {
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "true") {
    return true;
  }

  if (trimmed.toLowerCase() === "false") {
    return false;
  }

  const numeric = Number(trimmed);
  if (trimmed.length > 0 && Number.isFinite(numeric)) {
    return numeric;
  }

  return trimmed;
}

function assertUnknownRule(value: never): string {
  return `Unknown rule fragment ${JSON.stringify(value)}`;
}
function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function parseJsonArray<T>(value: string): { valid: true; value: T[] } | { valid: false; error: string } {
  try {
    const parsed = JSON.parse(value || "[]") as unknown;
    if (!Array.isArray(parsed)) {
      return { valid: false, error: "Expected a JSON array." };
    }

    return { valid: true, value: parsed as T[] };
  } catch (error) {
    return { valid: false, error: toErrorMessage(error) };
  }
}

function optionalCoordinate(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(0, Math.floor(parsed));
}

function renderMapOptions(): void {
  populateMapSelect(mapSelect, currentMapId);
  populateMapSelect(workspaceMapSelect, currentMapId);
  populateMapSelect(logicMapSelect, currentMapId);
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
    selectedEntityId = "";
  }

  if (entityEditIntent === "move" && !selectedEntityId) {
    selectedEntityId = mapEntities[0]?.id ?? "";
  }

  if (!selectedEntityId && mapEntities.length === 0) {
    entityEditIntent = "place";
  }

  entitySelect.innerHTML = "";
  const emptyEntityOption = document.createElement("option");
  emptyEntityOption.value = "";
  emptyEntityOption.textContent = "Place new entity";
  emptyEntityOption.selected = entityEditIntent === "place" || !selectedEntityId;
  entitySelect.append(emptyEntityOption);

  for (const entity of mapEntities) {
    const option = document.createElement("option");
    option.value = entity.id;
    const definition = draft.entityDefinitions.find((candidate) => candidate.id === entity.definitionId);
    option.textContent = `${entity.id} (${definition?.name ?? entity.definitionId})`;
    option.selected = entity.id === selectedEntityId;
    entitySelect.append(option);
  }

  const definitions = listEntityDefinitions(draft).filter((definition) => definition.kind !== "player");
  if (
    !definitions.some((definition) => definition.id === selectedEntityDefinitionId) ||
    (selectedEntityDefinitionId && !canPlaceEntityDefinition(draft, selectedEntityDefinitionId))
  ) {
    selectedEntityDefinitionId = definitions.find((definition) => canPlaceEntityDefinition(draft, definition.id))?.id ?? definitions[0]?.id ?? "";
  }

  entityDefinitionSelect.innerHTML = "";
  if (definitions.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No entity definitions available";
    option.disabled = true;
    option.selected = true;
    entityDefinitionSelect.append(option);
  }

  for (const definition of definitions) {
    const option = document.createElement("option");
    option.value = definition.id;
    option.textContent = `${definition.name} (${definition.placement ?? "multiple"})`;
    option.disabled = !canPlaceEntityDefinition(draft, definition.id);
    option.selected = definition.id === selectedEntityDefinitionId;
    entityDefinitionSelect.append(option);
  }

  if (!selectedEntityId && selectedEntityDefinitionId) {
    entityEditIntent = "place";
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
  const isTriggerMode = editModeSelect.value === "triggers";

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const index = y * map.width + x;
      const tileId = activeLayer?.tileIds[index] ?? "void";
      const occupant = mapEntities.find((entity) => entity.x === x && entity.y === y);
      const cellTriggers = triggersForCell(currentMapId, x, y);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "editor-cell";
      button.dataset.cell = createCellKey(x, y);
      updateGridCell(button, tileId, occupant, cellTriggers);

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
      } else if (isTriggerMode) {
        button.addEventListener("click", () => attachSelectedTriggerToCell(x, y));
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
  localValidationReport = validateAdventure(draft);
  validationSummary.textContent = localValidationReport.blocking
    ? `Draft has ${localValidationReport.summary.errorCount} error(s) and ${localValidationReport.summary.warningCount} warning(s).`
    : `Draft is publishable with ${localValidationReport.summary.warningCount} warning(s).`;

  if (localValidationReport.issues.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No validation issues.";
    validationList.append(item);
    return;
  }

  for (const issue of localValidationReport.issues) {
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
  validateDraftButton.disabled = !apiSession;
  createProjectButton.disabled = !apiSession || localValidationReport.blocking;
  saveProjectButton.disabled = !apiSession || !currentProject || localValidationReport.blocking;
  publishReleaseButton.disabled = !apiSession || !currentProject || localValidationReport.blocking;
  openReleaseButton.disabled = !latestReleaseId();

  if (!apiSession) {
    projectStatus.textContent = "Project publishing is unavailable until the local API is running.";
  } else if (localValidationReport.blocking) {
    projectStatus.textContent = `Fix ${localValidationReport.summary.errorCount} validation error(s) before saving or publishing through the API.`;
  } else if (!currentProject) {
    projectStatus.textContent = "No project linked yet. Create a project from the current draft to start publishing.";
  } else {
    projectStatus.textContent = `Project ${currentProject.title} (${currentProject.id}) with ${currentProject.releaseCount} published release(s).`;
  }

  if (!latestServerValidationReport) {
    serverValidationStatus.textContent = "No server validation run yet.";
  } else if (latestServerValidationReport.blocking) {
    serverValidationStatus.textContent = `Server validation found ${latestServerValidationReport.summary.errorCount} error(s) and ${latestServerValidationReport.summary.warningCount} warning(s).`;
  } else {
    serverValidationStatus.textContent = `Server validation passed with ${latestServerValidationReport.summary.warningCount} warning(s).`;
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
    item.textContent = `${release.label} (${release.id}) published ${new Date(release.createdAt).toLocaleString()} - ${release.validationReport.summary.errorCount} error(s), ${release.validationReport.summary.warningCount} warning(s)`;
    releaseSummary.append(item);
  }
}

function syncModeVisibility(): void {
  const isTileMode = editModeSelect.value === "tiles";
  const isTriggerMode = editModeSelect.value === "triggers";
  tilePickerWrap.classList.toggle("hidden", !isTileMode);
  entityPickerWrap.classList.toggle("hidden", isTileMode);
  entityDefinitionPickerWrap.classList.toggle("hidden", isTileMode);
  placeEntityButton.classList.toggle("hidden", isTileMode);
  brushPreview.classList.toggle("hidden", false);
}
function renderBrushPreview(): void {
  if (editModeSelect.value === "tiles") {
    brushSwatch.style.background = tileColor(selectedTileId || "void");
    brushValue.textContent = selectedTileId || "none";
    return;
  }

  if (editModeSelect.value === "triggers") {
    const trigger = currentEditedTrigger();
    brushSwatch.style.background = "#f5d547";
    brushValue.textContent = trigger ? `Attach ${trigger.id}` : "No trigger";
    return;
  }

  if (entityEditIntent === "place") {
    const definition = draft.entityDefinitions.find((candidate) => candidate.id === selectedEntityDefinitionId);
    brushSwatch.style.background = entityKindColor(definition?.kind);
    brushValue.textContent = definition ? `Place ${definition.name}` : "No definition";
    placeEntityButton.disabled = !definition || !canPlaceEntityDefinition(draft, definition.id);
    return;
  }

  const entity = listEntitiesForMap(draft, currentMapId).find((candidate) => candidate.id === selectedEntityId);
  const definition = draft.entityDefinitions.find((candidate) => candidate.id === entity?.definitionId);
  brushSwatch.style.background = entityKindColor(definition?.kind);
  brushValue.textContent = definition?.name ?? (selectedEntityId || "none");
  placeEntityButton.disabled = !selectedEntityDefinitionId || !canPlaceEntityDefinition(draft, selectedEntityDefinitionId);
}
function renderEditorHint(): void {
  const map = getMapById(draft, currentMapId);
  if (!map) {
    editorHint.textContent = "";
    return;
  }

  if (editModeSelect.value === "tiles") {
    editorHint.textContent = `Painting tiles on ${map.name}. Brush tile: ${selectedTileId || "none"}. Click and drag to paint multiple cells.`;
    return;
  }

  if (editModeSelect.value === "triggers") {
    editorHint.textContent = `Attaching trigger markers on ${map.name}. Click a cell to set the selected trigger map/x/y location.`;
    return;
  }

  if (entityEditIntent === "place") {
    const definition = draft.entityDefinitions.find((candidate) => candidate.id === selectedEntityDefinitionId);
    const placement = definition?.placement ?? "multiple";
    const availability = definition && !canPlaceEntityDefinition(draft, definition.id) ? " Already placed." : "";
    editorHint.textContent = `Placing ${definition?.name ?? "an entity"} on ${map.name}. Placement: ${placement}.${availability} Click a cell to add an instance.`;
    return;
  }

  editorHint.textContent = `Repositioning entities on ${map.name}. Selected entity: ${selectedEntityId || "none"}.`;
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
  markValidationDirty();
}

function applyEntityEdit(x: number, y: number): void {
  if (entityEditIntent === "place" || !selectedEntityId) {
    const definitionId = selectedEntityDefinitionId || (entityDefinitionSelect.value as EntityDefId | "");
    if (!definitionId || !canPlaceEntityDefinition(draft, definitionId)) {
      renderEditorHint();
      return;
    }

    draft = addEntityInstance(draft, definitionId, currentMapId, x, y);
    selectedEntityId = "";
    entityEditIntent = "place";
    markValidationDirty();
    renderEditor();
    return;
  }

  const entityId = selectedEntityId || (entitySelect.value as EntityInstance["id"] | "");
  if (!entityId) {
    return;
  }

  draft = moveEntityInstance(draft, entityId, currentMapId, x, y);
  markValidationDirty();
  renderEditor();
}
function refreshGridCell(x: number, y: number): void {
  const button = editorGrid.querySelector<HTMLButtonElement>(`button[data-cell="${createCellKey(x, y)}"]`);
  if (!button) {
    return;
  }

  const tileId = getTileIdAt(x, y);
  const occupant = listEntitiesForMap(draft, currentMapId).find((entity) => entity.x === x && entity.y === y);
  updateGridCell(button, tileId, occupant, triggersForCell(currentMapId, x, y));
}

function updateGridCell(button: HTMLButtonElement, tileId: string, occupant: EntityInstance | undefined, cellTriggers: TriggerDefinition[] = []): void {
  button.style.background = tileColor(tileId);
  const triggerLabel = cellTriggers.length > 0 ? `\nTriggers: ${cellTriggers.map((trigger) => trigger.id).join(", ")}` : "";
  button.title = occupant ? `${tileId}\n${occupant.id}${triggerLabel}` : `${tileId}${triggerLabel}`;
  const entityMarkup = occupant ? `<span class="entity-chip">${shortEntityLabel(occupant)}</span>` : `<span>${tileId}</span>`;
  const triggerMarkup = cellTriggers.length > 0 ? `<span class="trigger-chip">${cellTriggers.length}</span>` : "";
  button.innerHTML = `${entityMarkup}${triggerMarkup}`;
}

function getTileIdAt(x: number, y: number): string {
  const map = getMapById(draft, currentMapId);
  const activeLayer = map?.tileLayers[0];
  if (!map || !activeLayer) {
    return "void";
  }

  return activeLayer.tileIds[y * map.width + x] ?? "void";
}

function triggersForCell(mapId: MapDefinition["id"], x: number, y: number): TriggerDefinition[] {
  return draft.triggers.filter((trigger) => trigger.mapId === mapId && trigger.x === x && trigger.y === y);
}
function createCellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function markValidationDirty(): void {
  latestServerValidationReport = null;
  renderValidation();
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
  selectedEntityDefinitionId = "";
  entityEditIntent = "move";
  selectedTileId = FALLBACK_TILES[0] ?? "grass";
  latestServerValidationReport = null;
  endTileBrush();
  localValidationReport = validateAdventure(draft);
  renderEditor();
}

async function launchPlaytest(): Promise<void> {
  const record = await persistence.putDraft(DRAFT_KEY, draft);
  draftStatus.textContent = `Draft saved for playtest at ${new Date(record.updatedAt).toLocaleString()}.`;
  window.open(`/apps/web/index.html?draft=${encodeURIComponent(DRAFT_KEY)}`, "_blank", "noopener");
}

async function validateDraftWithApi(): Promise<void> {
  if (!apiSession) {
    serverValidationStatus.textContent = "Start the local API before running server validation.";
    return;
  }

  serverValidationStatus.textContent = "Running server validation...";

  try {
    latestServerValidationReport = await projectApi.validateAdventure({ draft });
    renderProjectPanel();
  } catch (error) {
    serverValidationStatus.textContent = `Server validation failed: ${toErrorMessage(error)}`;
  }
}

async function createProject(): Promise<void> {
  if (!apiSession) {
    projectStatus.textContent = "Start the local API before creating a project.";
    return;
  }

  if (localValidationReport.blocking) {
    projectStatus.textContent = `Fix ${localValidationReport.summary.errorCount} validation error(s) before creating a project.`;
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

  if (localValidationReport.blocking) {
    projectStatus.textContent = `Fix ${localValidationReport.summary.errorCount} validation error(s) before saving the project.`;
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

  if (localValidationReport.blocking) {
    projectStatus.textContent = `Fix ${localValidationReport.summary.errorCount} validation error(s) before publishing.`;
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
    latestServerValidationReport = release.validationReport;
    currentProject = await projectApi.getProject(currentProject.id);
    currentReleases = await projectApi.listProjectReleases(currentProject.id);
    projectStatus.textContent = `Published ${release.label} (${release.id}) with ${release.validationReport.summary.warningCount} warning(s).`;
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

function entityKindColor(kind: string | undefined): string {
  switch (kind) {
    case "npc":
      return "#f3f4f6";
    case "enemy":
      return "#bf4b45";
    case "container":
      return "#c4a85a";
    default:
      return "#1f2329";
  }
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
