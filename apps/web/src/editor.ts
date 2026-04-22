import { readAdventurePackage, type RawAdventurePackage } from "@acs/content-schema";
import type { Action, AdventurePackage, Condition, DialogueDefinition, ExitDefinition, EntityBehaviorMode, EntityBehaviorProfile, EntityDefId, EntityDefinition, EntityInstance, FlagDefId, ItemDefId, LibraryCategoryId, LibraryObjectKind, MapDefinition, MapKind, MediaCueId, QuestDefinition, QuestId, QuestObjectiveDefinition, QuestRewardDefinition, RegionDefinition, ClassicPixelSpriteDefinition, AssetId, SkillDefId, SoundCueId, TileDefinition, TilePassability, TriggerDefinition, TriggerType } from "@acs/domain";
import {
  addEntityInstance,
  applyDisplayRename,
  canPlaceEntityDefinition,
  cloneAdventurePackage,
  createMapDefinition,
  createTileDefinition,
  createQuestDefinition,
  createQuestObjectiveDefinition,
  createQuestRewardDefinition,
  createClassicPixelSprite,
  createAuthoringDiagnostics,
  createTriggerDefinition,
  deleteExitDefinition,
  deleteTriggerDefinition,
  duplicateTriggerDefinition,
  getMapById,
  listEntitiesForMap,
  listExitsForMap,
  listDialogueDefinitions,
  listEntityDefinitions,
  listFlagDefinitions,
  listItemDefinitions,
  listLibraryCategories,
  listMediaCues,
  listQuestDefinitions,
  listClassicPixelSprites,
  listStarterLibraryPacks,
  listRegions,
  listSkillDefinitions,
  listSoundCues,
  listTileDefinitions,
  listTilePalette,
  listTriggerDefinitions,
  moveEntityInstance,
  previewDisplayRename,
  setTileAt,
  updateAdventureMetadata,
  setClassicPixelSpritePixel,
  updateAdventurePresentation,
  updateDialogueNode,
  updateEntityDefinition,
  updateEntityInstance,
  updateMapDefinition,
  updateQuestDefinition,
  updateClassicPixelSprite,
  updateTileDefinition,
  upsertExitDefinition,
  type AuthoringDiagnosticsReport,
  type DisplayRenameMatch,
  type DisplayRenameScope,
  type UpsertExitInput,
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
const startupParams = new URLSearchParams(window.location.search);
const EDITOR_MODES = new Set(["tiles", "entities", "triggers", "exits"]);

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
const exitPickerWrap = requireElement<HTMLElement>("exit-picker-wrap");
const exitTargetMapSelect = requireElement<HTMLSelectElement>("exit-target-map-select");
const exitTargetXInput = requireElement<HTMLInputElement>("exit-target-x-input");
const exitTargetYInput = requireElement<HTMLInputElement>("exit-target-y-input");
const deleteExitButton = requireElement<HTMLButtonElement>("delete-exit-button");
const entityDefinitionPickerWrap = requireElement<HTMLElement>("entity-definition-picker-wrap");
const entityInstanceEditorWrap = requireElement<HTMLElement>("entity-instance-editor-wrap");
const entityInstanceNameInput = requireElement<HTMLInputElement>("entity-instance-name-input");
const entityInstanceBehaviorSelect = requireElement<HTMLSelectElement>("entity-instance-behavior-select");
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
const libraryPanelTitle = requireElement<HTMLElement>("library-panel-title");
const libraryPanelNote = requireElement<HTMLElement>("library-panel-note");
const libraryObjectHeading = requireElement<HTMLElement>("library-object-heading");
const libraryCategoryHeading = requireElement<HTMLElement>("library-category-heading");
const libraryCategoryNameInput = requireElement<HTMLInputElement>("library-category-name-input");
const libraryCategoryDescriptionInput = requireElement<HTMLInputElement>("library-category-description-input");
const libraryCategoryParentSelect = requireElement<HTMLSelectElement>("library-category-parent-select");
const createLibraryCategoryButton = requireElement<HTMLButtonElement>("create-library-category-button");
const libraryCategoryEditorStatus = requireElement<HTMLElement>("library-category-editor-status");
const entityDefinitionEditor = requireElement<HTMLElement>("entity-definition-editor");
const dialogueDefinitionEditor = requireElement<HTMLElement>("dialogue-definition-editor");
const tileDefinitionEditor = requireElement<HTMLElement>("tile-definition-editor");
const questDefinitionEditor = requireElement<HTMLElement>("quest-definition-editor");
const assetAuthoringEditor = requireElement<HTMLElement>("asset-authoring-editor");
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
const questDefinitionSelect = requireElement<HTMLSelectElement>("quest-definition-select");
const questNameInput = requireElement<HTMLInputElement>("quest-name-input");
const questSummaryInput = requireElement<HTMLTextAreaElement>("quest-summary-input");
const questObjectiveSelect = requireElement<HTMLSelectElement>("quest-objective-select");
const questObjectiveKindSelect = requireElement<HTMLSelectElement>("quest-objective-kind-select");
const questObjectiveTitleInput = requireElement<HTMLInputElement>("quest-objective-title-input");
const questObjectiveDescriptionInput = requireElement<HTMLTextAreaElement>("quest-objective-description-input");
const questObjectiveMapSelect = requireElement<HTMLSelectElement>("quest-objective-map-select");
const questObjectiveItemSelect = requireElement<HTMLSelectElement>("quest-objective-item-select");
const createQuestObjectiveButton = requireElement<HTMLButtonElement>("create-quest-objective-button");
const questRewardSelect = requireElement<HTMLSelectElement>("quest-reward-select");
const questRewardKindSelect = requireElement<HTMLSelectElement>("quest-reward-kind-select");
const questRewardLabelInput = requireElement<HTMLInputElement>("quest-reward-label-input");
const questRewardItemSelect = requireElement<HTMLSelectElement>("quest-reward-item-select");
const createQuestRewardButton = requireElement<HTMLButtonElement>("create-quest-reward-button");
const questSourceInput = requireElement<HTMLInputElement>("quest-source-input");
const newQuestNameInput = requireElement<HTMLInputElement>("new-quest-name-input");
const createQuestButton = requireElement<HTMLButtonElement>("create-quest-button");
const questEditorStatus = requireElement<HTMLElement>("quest-editor-status");
const presentationSplashSelect = requireElement<HTMLSelectElement>("presentation-splash-select");
const presentationMusicSelect = requireElement<HTMLSelectElement>("presentation-music-select");
const presentationIntroInput = requireElement<HTMLTextAreaElement>("presentation-intro-input");
const pixelSpriteSelect = requireElement<HTMLSelectElement>("pixel-sprite-select");
const pixelPaletteSelect = requireElement<HTMLSelectElement>("pixel-palette-select");
const pixelEditorGrid = requireElement<HTMLElement>("pixel-editor-grid");
const pixelPreviewSmall = requireElement<HTMLCanvasElement>("pixel-preview-small");
const pixelPreviewLarge = requireElement<HTMLCanvasElement>("pixel-preview-large");
const createPixelSpriteButton = requireElement<HTMLButtonElement>("create-pixel-sprite-button");
const assetEditorStatus = requireElement<HTMLElement>("asset-editor-status");
const tileDefinitionSelect = requireElement<HTMLSelectElement>("tile-definition-select");
const tileNameInput = requireElement<HTMLInputElement>("tile-name-input");
const tilePassabilitySelect = requireElement<HTMLSelectElement>("tile-passability-select");
const tileDescriptionInput = requireElement<HTMLTextAreaElement>("tile-description-input");
const tileHintInput = requireElement<HTMLInputElement>("tile-hint-input");
const tileTagsInput = requireElement<HTMLInputElement>("tile-tags-input");
const tileClassicSpriteInput = requireElement<HTMLInputElement>("tile-classic-sprite-input");
const newTileNameInput = requireElement<HTMLInputElement>("new-tile-name-input");
const createTileButton = requireElement<HTMLButtonElement>("create-tile-button");
const tileEditorStatus = requireElement<HTMLElement>("tile-editor-status");
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
const actionQuestFields = requireElement<HTMLElement>("action-quest-fields");
const actionMediaFields = requireElement<HTMLElement>("action-media-fields");
const actionSoundFields = requireElement<HTMLElement>("action-sound-fields");
const actionDialogueSelect = requireElement<HTMLSelectElement>("action-dialogue-select");
const actionFlagSelect = requireElement<HTMLSelectElement>("action-flag-select");
const actionValueInput = requireElement<HTMLInputElement>("action-value-input");
const actionItemSelect = requireElement<HTMLSelectElement>("action-item-select");
const actionQuantityInput = requireElement<HTMLInputElement>("action-quantity-input");
const actionMapSelect = requireElement<HTMLSelectElement>("action-map-select");
const actionXInput = requireElement<HTMLInputElement>("action-x-input");
const actionYInput = requireElement<HTMLInputElement>("action-y-input");
const actionTileInput = requireElement<HTMLInputElement>("action-tile-input");
const actionQuestSelect = requireElement<HTMLSelectElement>("action-quest-select");
const actionStageInput = requireElement<HTMLInputElement>("action-stage-input");
const actionMediaSelect = requireElement<HTMLSelectElement>("action-media-select");
const actionSoundSelect = requireElement<HTMLSelectElement>("action-sound-select");
const addActionButton = requireElement<HTMLButtonElement>("add-action-button");
const actionBuilderList = requireElement<HTMLElement>("action-builder-list");
const triggerEditorStatus = requireElement<HTMLElement>("trigger-editor-status");
const triggerReferenceList = requireElement<HTMLElement>("trigger-reference-list");
const draftStatus = requireElement<HTMLElement>("draft-status");
const validationSummary = requireElement<HTMLElement>("validation-summary");
const validationList = requireElement<HTMLElement>("validation-list");
const diagnosticsSummary = requireElement<HTMLElement>("diagnostics-summary");
const diagnosticsList = requireElement<HTMLElement>("diagnostics-list");
const scenarioList = requireElement<HTMLElement>("scenario-list");
const entitySummary = requireElement<HTMLElement>("entity-summary");
const exitSummary = requireElement<HTMLElement>("exit-summary");
const mapGraphSummary = requireElement<HTMLElement>("map-graph-summary");
const selectedCellSummary = requireElement<HTMLElement>("selected-cell-summary");
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
const renameSearchInput = requireElement<HTMLInputElement>("rename-search-input");
const renameReplacementInput = requireElement<HTMLInputElement>("rename-replacement-input");
const renameScopeSelect = requireElement<HTMLSelectElement>("rename-scope-select");
const renamePreviewButton = requireElement<HTMLButtonElement>("rename-preview-button");
const renameApplyButton = requireElement<HTMLButtonElement>("rename-apply-button");
const renameSummary = requireElement<HTMLElement>("rename-summary");
const renamePreviewList = requireElement<HTMLElement>("rename-preview-list");
const editorAreaLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-editor-area]"));
const editorAreaSections = Array.from(document.querySelectorAll<HTMLElement>("[data-editor-areas]"));

let draft: AdventurePackage = cloneAdventurePackage(sampleAdventure);
const libraryRowBuilders: Record<string, () => string[]> = {
  entities: () => listEntityDefinitions(draft).map((definition) => {
    const placement = definition.placement ?? "multiple";
    const profile = summarizeDefinitionProfile(definition);
    return `${definition.name} - ${definition.kind}; ${placement}; ${categoryName(definition.categoryId)}; profile ${profile}`;
  }),
  items: () => listItemDefinitions(draft).map((item) => `${item.name} - ${item.useKind ?? "passive"}; ${categoryName(item.categoryId)}; ${item.description}`),
  skills: () => listSkillDefinitions(draft).map((skill) => `${skill.name} - ${categoryName(skill.categoryId)}; ${skill.description}`),
  traits: () => (draft.traitDefinitions ?? []).map((trait) => `${trait.name} - ${categoryName(trait.categoryId)}; ${trait.description}`),
  spells: () => (draft.spellDefinitions ?? []).map((spell) => `${spell.name} - cost ${String(spell.powerCost ?? "n/a")}; ${categoryName(spell.categoryId)}; ${spell.description}`),
  dialogue: () => listDialogueDefinitions(draft).map((dialogue) => {
    const node = dialogue.nodes[0];
    const speaker = node?.speaker ? `${node.speaker}: ` : "";
    return `${dialogue.id} - ${categoryName(dialogue.categoryId)}; ${speaker}${node?.text ?? "No text."}`;
  }),
  flags: () => listFlagDefinitions(draft).map((flag) => `${flag.name} - default ${String(flag.defaultValue ?? "unset")}; ${categoryName(flag.categoryId)}; ${flag.description}`),
  quests: () => listQuestDefinitions(draft).map((quest) => `${quest.name} - ${quest.objectives.length} objective object(s); ${categoryName(quest.categoryId)}; rewards ${(quest.rewards ?? []).map((reward) => reward.label).join(", ") || "none"}; ${quest.summary}`),
  tiles: () => listTileDefinitions(draft).map((tile) => `${tile.name} (${tile.id}) - ${tile.passability}; ${categoryName(tile.categoryId)}; tags ${tile.tags.join(", ") || "none"}; sprite ${tile.classicSpriteId ?? tile.id}`),
  assets: () => [
    ...draft.assets.map((asset) => `${asset.id} - ${asset.kind}; ${asset.storageKey}`),
    ...draft.visualManifests.map((manifest) => `${manifest.id} - visual manifest; ${manifest.name}`)
  ],
  custom: () => (draft.customLibraryObjects ?? []).map((object) => `${object.name} - ${object.kind}; ${categoryName(object.categoryId)}; ${object.description}`)
};
let currentMapId = DEFAULT_MAP_ID;
let apiSession: ApiSession | null = null;
let currentProject: ProjectRecord | null = null;
let currentReleases: ReleaseSummary[] = [];
let selectedTileId = FALLBACK_TILES[0] ?? "grass";
let authoringDiagnosticsReport: AuthoringDiagnosticsReport = createAuthoringDiagnostics(draft);
let selectedEntityId: EntityInstance["id"] | "" = "";
let selectedEntityDefinitionId: EntityDefId | "" = "";
let pendingEntityInstanceName = "";
let pendingEntityBehaviorOverride: EntityBehaviorMode | "" = "";
let selectedDefinitionEditorId: EntityDefId | "" = "";
let selectedDialogueEditorId: DialogueDefinition["id"] | "" = "";
let selectedQuestDefinitionId: QuestId | "" = "";
let selectedQuestObjectiveId = "";
let selectedQuestRewardId = "";
let selectedPixelSpriteId = "";
let selectedPaletteIndex = 1;
let selectedTileDefinitionId: TileDefinition["id"] | "" = "";
let selectedTriggerEditorId: TriggerDefinition["id"] | "" = "";
let selectedExitId: ExitDefinition["id"] | "" = "";
let selectedCell: { x: number; y: number } | null = null;
let renamePreviewMatches: DisplayRenameMatch[] = [];
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
exitTargetMapSelect.addEventListener("change", () => renderExitTargetDefaults());
for (const element of [exitTargetXInput, exitTargetYInput]) {
  element.addEventListener("input", () => renderEditorHint());
}
deleteExitButton.addEventListener("click", () => deleteSelectedExit());

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
  renderEntityInstanceEditor();
  renderBrushPreview();
  renderEditorHint();
  renderActiveEditorArea();
});

entityDefinitionSelect.addEventListener("change", () => {
  selectedEntityDefinitionId = (entityDefinitionSelect.value as EntityDefId | "") || "";
  entityEditIntent = "place";
  selectedEntityId = "";
  entitySelect.value = "";
  renderEntityInstanceEditor();
  renderBrushPreview();
  renderEditorHint();
  renderActiveEditorArea();
});

placeEntityButton.addEventListener("click", () => {
  entityEditIntent = "place";
  selectedEntityId = "";
  entitySelect.value = "";
  renderEntityInstanceEditor();
  renderBrushPreview();
  renderEditorHint();
  renderActiveEditorArea();
});

entityInstanceNameInput.addEventListener("input", () => {
  updateSelectedEntityInstanceMetadata();
});

entityInstanceBehaviorSelect.addEventListener("change", () => {
  updateSelectedEntityInstanceMetadata();
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

libraryViewSelect.addEventListener("change", () => {
  renderLibraryOverview();
  renderDefinitionEditor();
  renderDialogueEditor();
  renderQuestDefinitionEditor();
});

createLibraryCategoryButton.addEventListener("click", () => {
  createLibraryCategoryFromEditor();
});
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

tileDefinitionSelect.addEventListener("change", () => {
  selectedTileDefinitionId = (tileDefinitionSelect.value as TileDefinition["id"] | "") || "";
  renderTileDefinitionEditor();
});

for (const element of [tileNameInput, tilePassabilitySelect, tileDescriptionInput, tileHintInput, tileTagsInput, tileClassicSpriteInput]) {
  element.addEventListener("input", () => applyTileDefinitionEditorChanges());
  element.addEventListener("change", () => applyTileDefinitionEditorChanges());
}

createQuestButton.addEventListener("click", () => createQuestDefinitionFromEditor());
createQuestObjectiveButton.addEventListener("click", () => createObjectiveForCurrentQuest());
createQuestRewardButton.addEventListener("click", () => createRewardForCurrentQuest());
questDefinitionSelect.addEventListener("change", () => {
  selectedQuestDefinitionId = (questDefinitionSelect.value as QuestId | "") || "";
  selectedQuestObjectiveId = "";
  selectedQuestRewardId = "";
  renderQuestDefinitionEditor();
});
questObjectiveSelect.addEventListener("change", () => {
  selectedQuestObjectiveId = questObjectiveSelect.value;
  syncQuestObjectiveFields(currentEditedQuestDefinition());
});
questRewardSelect.addEventListener("change", () => {
  selectedQuestRewardId = questRewardSelect.value;
  syncQuestRewardFields(currentEditedQuestDefinition());
});
for (const element of [questNameInput, questSummaryInput, questSourceInput]) {
  element.addEventListener("input", () => applyQuestDefinitionEditorChanges());
  element.addEventListener("change", () => applyQuestDefinitionEditorChanges());
}
for (const element of [questObjectiveKindSelect, questObjectiveTitleInput, questObjectiveDescriptionInput, questObjectiveMapSelect, questObjectiveItemSelect]) {
  element.addEventListener("input", () => applyQuestObjectiveEditorChanges());
  element.addEventListener("change", () => applyQuestObjectiveEditorChanges());
}
for (const element of [questRewardKindSelect, questRewardLabelInput, questRewardItemSelect]) {
  element.addEventListener("input", () => applyQuestRewardEditorChanges());
  element.addEventListener("change", () => applyQuestRewardEditorChanges());
}

createPixelSpriteButton.addEventListener("click", () => createPixelSpriteFromEditor());
pixelSpriteSelect.addEventListener("change", () => {
  selectedPixelSpriteId = pixelSpriteSelect.value;
  renderAssetAuthoringEditor();
});
pixelPaletteSelect.addEventListener("change", () => {
  selectedPaletteIndex = Number(pixelPaletteSelect.value) || 0;
  renderPixelPaletteSelect(currentPixelSprite());
});
for (const element of [presentationSplashSelect, presentationMusicSelect, presentationIntroInput]) {
  element.addEventListener("input", () => applyPresentationEditorChanges());
  element.addEventListener("change", () => applyPresentationEditorChanges());
}
createTileButton.addEventListener("click", () => createTileDefinitionFromEditor());

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
renamePreviewButton.addEventListener("click", () => previewDisplayRenameFromEditor());
renameApplyButton.addEventListener("click", () => applyDisplayRenameFromEditor());
for (const element of [renameSearchInput, renameReplacementInput, renameScopeSelect]) {
  element.addEventListener("input", () => {
    renamePreviewMatches = [];
    renderDisplayRenamePreview();
  });
  element.addEventListener("change", () => {
    renamePreviewMatches = [];
    renderDisplayRenamePreview();
  });
}

window.addEventListener("pointerup", () => {
  endTileBrush();
});

window.addEventListener("pointercancel", () => {
  endTileBrush();
});

queueMicrotask(() => {
  void bootstrap();
});

async function bootstrap(): Promise<void> {
  apiStatus.textContent = "Connecting to local API...";
  localValidationReport = validateAdventure(draft);
  renderEditor();

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
  applyStartupEditorSelection();
  localValidationReport = validateAdventure(draft);
  renderEditor();
  applyStartupExitTarget();
  renderBrushPreview();
  renderEditorHint();

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
        applyStartupEditorSelection();
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
  selectedExitId = "";
  selectedCell = null;
  endTileBrush();
  renderEditor();
}
function renderEditor(): void {
  renderMetadata();
  renderDefinitionEditor();
  renderLibraryOverview();
  renderQuestDefinitionEditor();
  renderDialogueEditor();
  renderTriggerEditor();
  renderMapStructureEditor();
  renderMapOptions();
  renderExitOptions();
  renderPalette();
  renderGrid();
  renderEntitySummary();
  renderExitSummary();
  renderMapGraphSummary();
  renderSelectedCellInspector();
  renderValidation();
  renderAuthoringDiagnostics();
  renderProjectPanel();
  renderDisplayRenamePreview();
  syncModeVisibility();
  renderBrushPreview();
  renderEditorHint();
  renderActiveEditorArea();
}

function readInitialEditorArea(): EditorArea {
  const area = new URLSearchParams(window.location.search).get("area");
  if (isEditorArea(area)) {
    return area;
  }

  const matchedLink = editorAreaLinks.find((link) => link.hash === window.location.hash);
  return (matchedLink?.dataset.editorArea ?? "world") as EditorArea;
}

function isEditorArea(value: string | null): value is EditorArea {
  return value === "adventure" || value === "world" || value === "map" || value === "libraries" || value === "logic" || value === "test";
}

function applyStartupEditorSelection(): void {
  const mode = startupParams.get("mode") ?? "";
  if (EDITOR_MODES.has(mode)) {
    editModeSelect.value = mode;
  }

  selectOptionIfPresent(libraryViewSelect, startupParams.get("library") ?? "");
  selectOptionIfPresent(workspaceMapSelect, startupParams.get("map") ?? "");
  if (workspaceMapSelect.value) {
    currentMapId = workspaceMapSelect.value as MapDefinition["id"];
  }
}

function applyStartupExitTarget(): void {
  if (editModeSelect.value !== "exits") {
    return;
  }

  selectOptionIfPresent(exitTargetMapSelect, startupParams.get("targetMap") ?? "");
  const target = getMapById(draft, exitTargetMapSelect.value as MapDefinition["id"]);
  if (target) {
    exitTargetXInput.value = String(clampWholeNumber(startupParams.get("targetX") ?? exitTargetXInput.value, 0, target.width - 1, 0));
    exitTargetYInput.value = String(clampWholeNumber(startupParams.get("targetY") ?? exitTargetYInput.value, 0, target.height - 1, 0));
  }
}

function selectOptionIfPresent(select: HTMLSelectElement, value: string): void {
  if (!value) {
    return;
  }

  if (Array.from(select.options).some((option) => option.value === value)) {
    select.value = value;
  }
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
  renderExitSummary();
  renderMapGraphSummary();
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
  const copy = libraryFocusCopy(focus);

  libraryPanelTitle.textContent = copy.title;
  libraryPanelNote.textContent = copy.note;
  libraryObjectHeading.textContent = copy.objectHeading;
  libraryCategoryHeading.textContent = copy.categoryHeading;
  entityDefinitionEditor.hidden = focus !== "entities";
  dialogueDefinitionEditor.hidden = focus !== "dialogue";
  tileDefinitionEditor.hidden = focus !== "tiles";
  questDefinitionEditor.hidden = focus !== "quests";
  assetAuthoringEditor.hidden = focus !== "assets";
  if (focus === "assets") {
    renderAssetAuthoringEditor();
  }

  libraryCategorySummary.innerHTML = "";
  libraryObjectSummary.innerHTML = "";
  renderLibraryCategoryCreator(copy);

  const categories = listLibraryCategories(draft).filter((category) => category.kind === copy.kind);
  if (categories.length === 0) {
    const item = document.createElement("li");
    item.textContent = `No ${copy.categoryLabel.toLowerCase()} defined yet.`;
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
    item.textContent = `No ${copy.objectLabel.toLowerCase()} defined yet.`;
    libraryObjectSummary.append(item);
    return;
  }

  for (const row of rows) {
    const item = document.createElement("li");
    item.textContent = row;
    libraryObjectSummary.append(item);
  }
}

function libraryFocusCopy(focus: string): {
  title: string;
  note: string;
  objectHeading: string;
  categoryHeading: string;
  categoryLabel: string;
  objectLabel: string;
  kind: LibraryObjectKind;
} {
  switch (focus) {
    case "items":
      return {
        title: "Game Library: Items",
        note: "Items are reusable definitions for relics, tools, treasure, quest objects, and future inventory equipment. Entity possessions and trigger rewards should point at these definitions instead of typed strings.",
        objectHeading: "Item Definitions",
        categoryHeading: "Item Categories",
        categoryLabel: "Item Categories",
        objectLabel: "Item Definitions",
        kind: "item"
      };
    case "skills":
      return {
        title: "Game Library: Skills",
        note: "Skills are reusable capabilities that can be assigned to entities and later used by rules, checks, dialogue, or combat systems.",
        objectHeading: "Skill Definitions",
        categoryHeading: "Skill Categories",
        categoryLabel: "Skill Categories",
        objectLabel: "Skill Definitions",
        kind: "skill"
      };
    case "traits":
      return {
        title: "Game Library: Traits",
        note: "Traits are reusable descriptive qualities that can be assigned to entities and later used by rules, dialogue, AI, or equipment systems.",
        objectHeading: "Trait Definitions",
        categoryHeading: "Trait Categories",
        categoryLabel: "Trait Categories",
        objectLabel: "Trait Definitions",
        kind: "trait"
      };
    case "spells":
      return {
        title: "Game Library: Spells",
        note: "Spells are reusable magical actions. They are intentionally separated from entities so future combat, items, and triggers can all reference the same spell definitions.",
        objectHeading: "Spell Definitions",
        categoryHeading: "Spell Categories",
        categoryLabel: "Spell Categories",
        objectLabel: "Spell Definitions",
        kind: "spell"
      };
    case "dialogue":
      return {
        title: "Game Library: Dialogue",
        note: "Dialogue is a reusable library object. Triggers and interactions reference dialogue records by id, while categories help designers organize speeches, clues, barks, and quest scenes.",
        objectHeading: "Dialogue Definitions",
        categoryHeading: "Dialogue Categories",
        categoryLabel: "Dialogue Categories",
        objectLabel: "Dialogue Definitions",
        kind: "dialogue"
      };
    case "flags":
      return {
        title: "Game Library: Flags",
        note: "Flags are named pieces of game state used by triggers, quests, and world logic. Selecting flags from definitions keeps rules from depending on fragile typed strings.",
        objectHeading: "Flag Definitions",
        categoryHeading: "Flag Categories",
        categoryLabel: "Flag Categories",
        objectLabel: "Flag Definitions",
        kind: "flag"
      };
    case "quests":
      return {
        title: "Game Library: Quests",
        note: "Quests organize goals, stages, rewards, and source references so runtime objectives can grow beyond hardcoded demo text.",
        objectHeading: "Quest Definitions",
        categoryHeading: "Quest Categories",
        categoryLabel: "Quest Categories",
        objectLabel: "Quest Definitions",
        kind: "quest"
      };
    case "tiles":
      return {
        title: "Game Library: Tiles",
        note: "Tiles are terrain concepts used by maps. Definitions now hold passability, interaction hints, tags, and classic sprite mappings so behavior is separate from visual style.",
        objectHeading: "Tile Definitions",
        categoryHeading: "Tile Categories",
        categoryLabel: "Tile Categories",
        objectLabel: "Tile Definitions",
        kind: "tile"
      };
    case "assets":
      return {
        title: "Game Library: Assets",
        note: "Assets and visual manifests describe presentation resources. Keeping them in their own focus preserves the split between engine data and visual style.",
        objectHeading: "Asset And Manifest Records",
        categoryHeading: "Asset Categories",
        categoryLabel: "Asset Categories",
        objectLabel: "Asset Records",
        kind: "asset"
      };
    case "custom":
      return {
        title: "Game Library: Custom Objects",
        note: "Custom objects are future-facing author-defined library records for things that do not fit the built-in classes yet.",
        objectHeading: "Custom Object Definitions",
        categoryHeading: "Custom Object Categories",
        categoryLabel: "Custom Object Categories",
        objectLabel: "Custom Object Definitions",
        kind: "custom"
      };
    case "entities":
    default:
      return {
        title: "Game Library: Entities",
        note: "Entities are reusable creature, character, player, and container definitions. Map Workspace places instances that point back to these shared definitions.",
        objectHeading: "Entity Definitions",
        categoryHeading: "Entity Categories",
        categoryLabel: "Entity Categories",
        objectLabel: "Entity Definitions",
        kind: "entity"
      };
  }
}

function focusedLibraryRows(focus: string): string[] {
  return libraryRowBuilders[focus]?.() ?? [];
}


function renderLibraryCategoryCreator(copy = libraryFocusCopy(libraryViewSelect.value || "entities")): void {
  libraryCategoryParentSelect.innerHTML = "";
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = `No parent ${copy.kind} category`;
  libraryCategoryParentSelect.append(noneOption);

  for (const category of listLibraryCategories(draft).filter((candidate) => candidate.kind === copy.kind)) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    libraryCategoryParentSelect.append(option);
  }

  libraryCategoryNameInput.placeholder = `${copy.kind.charAt(0).toUpperCase()}${copy.kind.slice(1)} category name`;
  libraryCategoryDescriptionInput.placeholder = `Describe this ${copy.kind} category`;
  libraryCategoryEditorStatus.textContent = `New categories will be created as ${copy.kind} categories.`;
}

function createLibraryCategoryFromEditor(): void {
  const copy = libraryFocusCopy(libraryViewSelect.value || "entities");
  const name = libraryCategoryNameInput.value.trim();
  if (!name) {
    libraryCategoryEditorStatus.textContent = "Enter a category name before creating it.";
    return;
  }

  const id = nextLibraryCategoryId(copy.kind, name);
  const parentId = (libraryCategoryParentSelect.value as LibraryCategoryId | "") || undefined;
  const description = libraryCategoryDescriptionInput.value.trim();
  const category = {
    id,
    kind: copy.kind,
    name,
    ...(description ? { description } : {}),
    ...(parentId ? { parentId } : {})
  };

  draft = {
    ...draft,
    libraryCategories: [...(draft.libraryCategories ?? []), category]
  };

  libraryCategoryNameInput.value = "";
  libraryCategoryDescriptionInput.value = "";
  markValidationDirty();
  renderLibraryOverview();
  renderProjectPanel();
  libraryCategoryEditorStatus.textContent = `Created ${copy.kind} category ${name}.`;
}

function nextLibraryCategoryId(kind: LibraryObjectKind, name: string): LibraryCategoryId {
  const base = `lib_${kind}_${slugifyLibraryName(name)}`;
  const existingIds = new Set((draft.libraryCategories ?? []).map((category) => category.id));
  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate as LibraryCategoryId)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  return candidate as LibraryCategoryId;
}

function slugifyLibraryName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "category";
}

function uniqueTileIds(): string[] {
  const tileIds = new Set<string>();
  for (const map of draft.maps) {
    for (const layer of map.tileLayers) {
      for (const tileId of layer.tileIds) {
        tileIds.add(tileId);
      }
    }
  }
  return [...tileIds].sort();
}

function renderQuestDefinitionEditor(): void {
  const quests = listQuestDefinitions(draft);
  selectedQuestDefinitionId = selectedQuestDefinitionIdFor(quests);
  const quest = currentEditedQuestDefinition();
  selectedQuestObjectiveId = selectedQuestObjectiveIdFor(quest);
  selectedQuestRewardId = selectedQuestRewardIdFor(quest);
  populateQuestDefinitionSelect(quests);
  syncQuestDefinitionEditorFields(quest);
  renderQuestDefinitionStatus();
}

function selectedQuestDefinitionIdFor(quests: QuestDefinition[]): QuestId | "" {
  return quests.some((quest) => quest.id === selectedQuestDefinitionId) ? selectedQuestDefinitionId : quests[0]?.id ?? "";
}

function selectedQuestObjectiveIdFor(quest: QuestDefinition | undefined): string {
  const objectives = quest?.objectives ?? [];
  return objectives.some((objective) => objective.id === selectedQuestObjectiveId) ? selectedQuestObjectiveId : objectives[0]?.id ?? "";
}

function selectedQuestRewardIdFor(quest: QuestDefinition | undefined): string {
  const rewards = quest?.rewards ?? [];
  return rewards.some((reward) => reward.id === selectedQuestRewardId) ? selectedQuestRewardId : rewards[0]?.id ?? "";
}

function populateQuestDefinitionSelect(quests: QuestDefinition[]): void {
  questDefinitionSelect.innerHTML = "";
  for (const quest of quests) {
    const option = document.createElement("option");
    option.value = quest.id;
    option.textContent = `${quest.name} (${quest.objectives.length} objective${quest.objectives.length === 1 ? "" : "s"})`;
    option.selected = quest.id === selectedQuestDefinitionId;
    questDefinitionSelect.append(option);
  }
}

function syncQuestDefinitionEditorFields(quest: QuestDefinition | undefined): void {
  const disabled = !quest;
  for (const element of [questNameInput, questSummaryInput, questSourceInput, createQuestObjectiveButton, createQuestRewardButton]) {
    element.disabled = disabled;
  }

  questNameInput.value = quest?.name ?? "";
  questSummaryInput.value = quest?.summary ?? "";
  questSourceInput.value = quest?.sourceReferences?.join(", ") ?? "";
  populateQuestObjectiveControls(quest);
  populateQuestRewardControls(quest);
}

function populateQuestObjectiveControls(quest: QuestDefinition | undefined): void {
  questObjectiveSelect.innerHTML = "";
  for (const objective of quest?.objectives ?? []) {
    const option = document.createElement("option");
    option.value = objective.id;
    option.textContent = `${objective.completionStage ?? 0}: ${objective.title}`;
    option.selected = objective.id === selectedQuestObjectiveId;
    questObjectiveSelect.append(option);
  }
  populateOptionalQuestMapSelect(questObjectiveMapSelect, currentQuestObjective(quest)?.targetMapId ?? "", "No target map");
  populateOptionalQuestItemSelect(questObjectiveItemSelect, currentQuestObjective(quest)?.targetItemId ?? "", "No target item");
  syncQuestObjectiveFields(quest);
}

function populateQuestRewardControls(quest: QuestDefinition | undefined): void {
  questRewardSelect.innerHTML = "";
  for (const reward of quest?.rewards ?? []) {
    const option = document.createElement("option");
    option.value = reward.id;
    option.textContent = reward.label;
    option.selected = reward.id === selectedQuestRewardId;
    questRewardSelect.append(option);
  }
  populateOptionalQuestItemSelect(questRewardItemSelect, currentQuestReward(quest)?.itemId ?? "", "No reward item");
  syncQuestRewardFields(quest);
}

function syncQuestObjectiveFields(quest: QuestDefinition | undefined): void {
  const objective = currentQuestObjective(quest);
  const disabled = !objective;
  for (const element of [questObjectiveSelect, questObjectiveKindSelect, questObjectiveTitleInput, questObjectiveDescriptionInput, questObjectiveMapSelect, questObjectiveItemSelect]) {
    element.disabled = disabled;
  }
  questObjectiveKindSelect.value = objective?.kind ?? "story";
  questObjectiveTitleInput.value = objective?.title ?? "";
  questObjectiveDescriptionInput.value = objective?.description ?? "";
  questObjectiveMapSelect.value = objective?.targetMapId ?? "";
  questObjectiveItemSelect.value = objective?.targetItemId ?? "";
}

function syncQuestRewardFields(quest: QuestDefinition | undefined): void {
  const reward = currentQuestReward(quest);
  const disabled = !reward;
  for (const element of [questRewardSelect, questRewardKindSelect, questRewardLabelInput, questRewardItemSelect]) {
    element.disabled = disabled;
  }
  questRewardKindSelect.value = reward?.kind ?? "story";
  questRewardLabelInput.value = reward?.label ?? "";
  questRewardItemSelect.value = reward?.itemId ?? "";
}

function applyQuestDefinitionEditorChanges(): void {
  const quest = currentEditedQuestDefinition();
  if (!quest) {
    return;
  }

  draft = updateQuestDefinition(draft, quest.id, {
    name: questNameInput.value,
    summary: questSummaryInput.value,
    sourceReferences: parseCommaSeparatedValues(questSourceInput.value)
  });
  afterQuestEditorChange();
}

function applyQuestObjectiveEditorChanges(): void {
  const quest = currentEditedQuestDefinition();
  const objective = currentQuestObjective(quest);
  if (!quest || !objective) {
    return;
  }

  draft = updateQuestDefinition(draft, quest.id, {
    objectives: quest.objectives.map((candidate) => candidate.id === objective.id ? updatedObjective(candidate) : candidate)
  });
  afterQuestEditorChange();
}

function applyQuestRewardEditorChanges(): void {
  const quest = currentEditedQuestDefinition();
  const reward = currentQuestReward(quest);
  if (!quest || !reward) {
    return;
  }

  draft = updateQuestDefinition(draft, quest.id, {
    rewards: (quest.rewards ?? []).map((candidate) => candidate.id === reward.id ? updatedReward(candidate) : candidate)
  });
  afterQuestEditorChange();
}

function updatedObjective(objective: QuestObjectiveDefinition): QuestObjectiveDefinition {
  const updated: QuestObjectiveDefinition = {
    ...objective,
    title: questObjectiveTitleInput.value,
    description: questObjectiveDescriptionInput.value,
    kind: questObjectiveKindSelect.value as QuestObjectiveDefinition["kind"]
  };
  if (questObjectiveMapSelect.value) {
    updated.targetMapId = questObjectiveMapSelect.value as MapDefinition["id"];
  } else {
    delete updated.targetMapId;
  }
  if (questObjectiveItemSelect.value) {
    updated.targetItemId = questObjectiveItemSelect.value as ItemDefId;
  } else {
    delete updated.targetItemId;
  }
  return updated;
}

function updatedReward(reward: QuestRewardDefinition): QuestRewardDefinition {
  const updated: QuestRewardDefinition = {
    ...reward,
    label: questRewardLabelInput.value,
    kind: questRewardKindSelect.value as QuestRewardDefinition["kind"]
  };
  if (questRewardItemSelect.value) {
    updated.itemId = questRewardItemSelect.value as ItemDefId;
  } else {
    delete updated.itemId;
  }
  return updated;
}

function createObjectiveForCurrentQuest(): void {
  const quest = currentEditedQuestDefinition();
  if (!quest) {
    return;
  }

  const objective = createQuestObjectiveDefinition(quest, `Objective ${quest.objectives.length + 1}`);
  selectedQuestObjectiveId = objective.id;
  draft = updateQuestDefinition(draft, quest.id, { objectives: [...quest.objectives, objective] });
  renderQuestDefinitionEditor();
  afterQuestEditorChange();
}

function createRewardForCurrentQuest(): void {
  const quest = currentEditedQuestDefinition();
  if (!quest) {
    return;
  }

  const reward = createQuestRewardDefinition(quest, `Reward ${(quest.rewards ?? []).length + 1}`);
  selectedQuestRewardId = reward.id;
  draft = updateQuestDefinition(draft, quest.id, { rewards: [...(quest.rewards ?? []), reward] });
  renderQuestDefinitionEditor();
  afterQuestEditorChange();
}

function createQuestDefinitionFromEditor(): void {
  const name = newQuestNameInput.value.trim();
  if (!name) {
    questEditorStatus.textContent = "Enter a quest name before creating it.";
    return;
  }

  const beforeIds = new Set((draft.questDefinitions ?? []).map((quest) => quest.id));
  draft = createQuestDefinition(draft, {
    idSeed: name,
    name,
    summary: "Describe the quest goal.",
    categoryId: defaultCategoryForKind("quest"),
    objectives: [{ id: "objective_1", title: "Begin the quest", description: "Begin the quest.", kind: "story", completionStage: 0 }],
    rewards: [],
    sourceReferences: []
  });
  selectedQuestDefinitionId = draft.questDefinitions.find((quest) => !beforeIds.has(quest.id))?.id ?? selectedQuestDefinitionId;
  selectedQuestObjectiveId = "objective_1";
  selectedQuestRewardId = "";
  newQuestNameInput.value = "";
  markValidationDirty();
  renderLibraryOverview();
  renderQuestDefinitionEditor();
  renderTriggerEditor();
  renderProjectPanel();
}

function currentEditedQuestDefinition(): QuestDefinition | undefined {
  return draft.questDefinitions.find((quest) => quest.id === selectedQuestDefinitionId);
}

function currentQuestObjective(quest: QuestDefinition | undefined): QuestObjectiveDefinition | undefined {
  return quest?.objectives.find((objective) => objective.id === selectedQuestObjectiveId);
}

function currentQuestReward(quest: QuestDefinition | undefined): QuestRewardDefinition | undefined {
  return quest?.rewards?.find((reward) => reward.id === selectedQuestRewardId);
}

function renderQuestDefinitionStatus(): void {
  const quest = currentEditedQuestDefinition();
  if (!quest) {
    questEditorStatus.textContent = "No quest definition selected.";
    return;
  }

  const currentStage = draft.startState.initialQuestStages?.[quest.id] ?? 0;
  const references = countQuestReferences(quest.id);
  questEditorStatus.textContent = `${quest.name} starts at stage ${currentStage}; ${quest.objectives.length} objective object(s); ${(quest.rewards ?? []).length} reward object(s); ${references} trigger reference(s).`;
}

function countQuestReferences(questId: QuestId): number {
  return draft.triggers.reduce((total, trigger) => total + trigger.conditions.filter((condition) => condition.type === "questStageAtLeast" && condition.questId === questId).length + trigger.actions.filter((action) => action.type === "setQuestStage" && action.questId === questId).length, 0);
}

function populateOptionalQuestMapSelect(select: HTMLSelectElement, selectedId: string, emptyLabel: string): void {
  select.innerHTML = "";
  select.append(createQuestOption("", emptyLabel, selectedId === ""));
  for (const map of draft.maps) {
    select.append(createQuestOption(map.id, map.name, map.id === selectedId));
  }
}

function populateOptionalQuestItemSelect(select: HTMLSelectElement, selectedId: string, emptyLabel: string): void {
  select.innerHTML = "";
  select.append(createQuestOption("", emptyLabel, selectedId === ""));
  for (const item of draft.itemDefinitions) {
    select.append(createQuestOption(item.id, item.name, item.id === selectedId));
  }
}

function createQuestOption(value: string, label: string, selected: boolean): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  return option;
}

function afterQuestEditorChange(): void {
  markValidationDirty();
  renderLibraryOverview();
  renderQuestDefinitionStatus();
  renderTriggerEditor();
  renderProjectPanel();
}
function renderAssetAuthoringEditor(): void {
  const sprites = listClassicPixelSprites(draft);
  selectedPixelSpriteId = selectedPixelSpriteIdFor(sprites);
  populateAssetSelect(presentationSplashSelect, "splash", draft.presentation.splashAssetId ?? "", "No splash screen");
  populateAssetSelect(presentationMusicSelect, "music", draft.presentation.startingMusicAssetId ?? "", "No starting music");
  presentationIntroInput.value = draft.presentation.introText ?? "";
  populatePixelSpriteSelect(sprites);
  renderPixelPaletteSelect(currentPixelSprite());
  renderPixelEditorGrid(currentPixelSprite());
  renderPixelPreviews(currentPixelSprite());
  renderAssetEditorStatus(sprites);
}

function selectedPixelSpriteIdFor(sprites: ClassicPixelSpriteDefinition[]): string {
  return sprites.some((sprite) => sprite.id === selectedPixelSpriteId) ? selectedPixelSpriteId : sprites[0]?.id ?? "";
}

function populateAssetSelect(select: HTMLSelectElement, kind: string, selectedId: string, emptyLabel: string): void {
  select.innerHTML = "";
  select.append(createQuestOption("", emptyLabel, selectedId === ""));
  for (const asset of draft.assets.filter((candidate) => candidate.kind === kind)) {
    select.append(createQuestOption(asset.id, `${asset.id} (${asset.storageKey})`, asset.id === selectedId));
  }
}

function populatePixelSpriteSelect(sprites: ClassicPixelSpriteDefinition[]): void {
  pixelSpriteSelect.innerHTML = "";
  for (const sprite of sprites) {
    pixelSpriteSelect.append(createQuestOption(sprite.id, `${sprite.name} (${sprite.usage})`, sprite.id === selectedPixelSpriteId));
  }
}

function renderPixelPaletteSelect(sprite: ClassicPixelSpriteDefinition | undefined): void {
  pixelPaletteSelect.innerHTML = "";
  for (const [index, color] of (sprite?.palette ?? []).entries()) {
    const option = createQuestOption(String(index), `${index}: ${color}`, index === selectedPaletteIndex);
    option.style.background = color;
    pixelPaletteSelect.append(option);
  }
  pixelPaletteSelect.disabled = !sprite;
}

function renderPixelEditorGrid(sprite: ClassicPixelSpriteDefinition | undefined): void {
  pixelEditorGrid.innerHTML = "";
  if (!sprite) {
    pixelEditorGrid.textContent = "No classic pixel sprites defined yet.";
    return;
  }

  pixelEditorGrid.style.gridTemplateColumns = `repeat(${sprite.width}, minmax(20px, 1fr))`;
  for (let index = 0; index < sprite.width * sprite.height; index += 1) {
    pixelEditorGrid.append(createPixelCell(sprite, index));
  }
}

function renderPixelPreviews(sprite: ClassicPixelSpriteDefinition | undefined): void {
  renderPixelPreview(pixelPreviewSmall, sprite);
  renderPixelPreview(pixelPreviewLarge, sprite);
}

function renderPixelPreview(target: HTMLCanvasElement, sprite: ClassicPixelSpriteDefinition | undefined): void {
  const context = target.getContext("2d");
  if (!context) {
    return;
  }

  const width = sprite?.width ?? 8;
  const height = sprite?.height ?? 8;
  target.width = width;
  target.height = height;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);

  if (!sprite) {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, height);
    return;
  }

  for (let index = 0; index < sprite.width * sprite.height; index += 1) {
    const x = index % sprite.width;
    const y = Math.floor(index / sprite.width);
    context.fillStyle = sprite.palette[sprite.pixels[index] ?? 0] ?? "#000000";
    context.fillRect(x, y, 1, 1);
  }
}

function createPixelCell(sprite: ClassicPixelSpriteDefinition, index: number): HTMLButtonElement {
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "pixel-editor-cell";
  cell.style.background = sprite.palette[sprite.pixels[index] ?? 0] ?? "#000000";
  cell.title = `${sprite.name} pixel ${index}`;
  cell.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    paintPixel(index);
  });
  cell.addEventListener("pointerenter", (event) => {
    if (event.buttons === 1) {
      paintPixel(index);
    }
  });
  return cell;
}

function paintPixel(index: number): void {
  const sprite = currentPixelSprite();
  if (!sprite) {
    return;
  }

  const x = index % sprite.width;
  const y = Math.floor(index / sprite.width);
  draft = setClassicPixelSpritePixel(draft, sprite.id, x, y, selectedPaletteIndex);
  markValidationDirty();
  renderLibraryOverview();
}

function applyPresentationEditorChanges(): void {
  const updates: Partial<AdventurePackage["presentation"]> = { introText: presentationIntroInput.value };
  if (presentationSplashSelect.value) {
    updates.splashAssetId = presentationSplashSelect.value as AssetId;
  }
  if (presentationMusicSelect.value) {
    updates.startingMusicAssetId = presentationMusicSelect.value as AssetId;
  }
  draft = updateAdventurePresentation(draft, updates);
  markValidationDirty();
  renderLibraryOverview();
  renderProjectPanel();
}

function createPixelSpriteFromEditor(): void {
  const beforeIds = new Set(listClassicPixelSprites(draft).map((sprite) => sprite.id));
  draft = createClassicPixelSprite(draft, "New Classic Tile");
  selectedPixelSpriteId = listClassicPixelSprites(draft).find((sprite) => !beforeIds.has(sprite.id))?.id ?? selectedPixelSpriteId;
  markValidationDirty();
  renderLibraryOverview();
}

function currentPixelSprite(): ClassicPixelSpriteDefinition | undefined {
  return listClassicPixelSprites(draft).find((sprite) => sprite.id === selectedPixelSpriteId);
}

function renderAssetEditorStatus(sprites: ClassicPixelSpriteDefinition[]): void {
  const packs = listStarterLibraryPacks(draft);
  assetEditorStatus.textContent = `${sprites.length} editable pixel sprite(s), ${packs.length} starter genre pack(s), splash ${draft.presentation.splashAssetId ?? "none"}, music ${draft.presentation.startingMusicAssetId ?? "none"}.`;
}
function renderTileDefinitionEditor(): void {
  const tiles = listTileDefinitions(draft);
  selectedTileDefinitionId = selectedTileDefinitionIdFor(tiles);
  populateTileDefinitionSelect(tiles);
  syncTileDefinitionEditorFields(currentEditedTileDefinition());
  renderTileDefinitionStatus();
}

function selectedTileDefinitionIdFor(tiles: TileDefinition[]): TileDefinition["id"] | "" {
  return tiles.some((tile) => tile.id === selectedTileDefinitionId) ? selectedTileDefinitionId : tiles[0]?.id ?? "";
}

function populateTileDefinitionSelect(tiles: TileDefinition[]): void {
  tileDefinitionSelect.innerHTML = "";
  for (const tile of tiles) {
    const option = document.createElement("option");
    option.value = tile.id;
    option.textContent = `${tile.name} (${tile.passability})`;
    option.selected = tile.id === selectedTileDefinitionId;
    tileDefinitionSelect.append(option);
  }
}

function syncTileDefinitionEditorFields(tile: TileDefinition | undefined): void {
  setTileDefinitionEditorDisabled(!tile);
  tileNameInput.value = tile?.name ?? "";
  tilePassabilitySelect.value = tile?.passability ?? "passable";
  tileDescriptionInput.value = tile?.description ?? "";
  tileHintInput.value = tile?.interactionHint ?? "";
  tileTagsInput.value = tile?.tags.join(", ") ?? "";
  tileClassicSpriteInput.value = tile?.classicSpriteId ?? String(tile?.id ?? "");
}

function setTileDefinitionEditorDisabled(disabled: boolean): void {
  for (const element of [tileNameInput, tilePassabilitySelect, tileDescriptionInput, tileHintInput, tileTagsInput, tileClassicSpriteInput]) {
    element.disabled = disabled;
  }
}

function applyTileDefinitionEditorChanges(): void {
  const tile = currentEditedTileDefinition();
  if (!tile) {
    return;
  }

  draft = updateTileDefinition(draft, tile.id, {
    name: tileNameInput.value,
    description: tileDescriptionInput.value,
    passability: tilePassabilitySelect.value as TilePassability,
    interactionHint: tileHintInput.value,
    tags: parseCommaSeparatedValues(tileTagsInput.value),
    classicSpriteId: tileClassicSpriteInput.value
  });
  markValidationDirty();
  renderPalette();
  renderLibraryOverview();
  renderTileDefinitionStatus();
  renderProjectPanel();
}

function createTileDefinitionFromEditor(): void {
  const name = newTileNameInput.value.trim();
  if (!name) {
    tileEditorStatus.textContent = "Enter a tile name before creating it.";
    return;
  }

  const beforeIds = new Set((draft.tileDefinitions ?? []).map((tile) => tile.id));
  draft = createTileDefinition(draft, {
    idSeed: name,
    name,
    description: "New terrain definition.",
    categoryId: defaultCategoryForKind("tile"),
    passability: "passable",
    tags: ["custom"],
    classicSpriteId: slugifyLibraryName(name)
  });

  selectedTileDefinitionId = draft.tileDefinitions.find((tile) => !beforeIds.has(tile.id))?.id ?? selectedTileDefinitionId;
  selectedTileId = String(selectedTileDefinitionId || selectedTileId);
  newTileNameInput.value = "";
  markValidationDirty();
  renderPalette();
  renderLibraryOverview();
  renderTileDefinitionEditor();
  renderProjectPanel();
}

function currentEditedTileDefinition(): TileDefinition | undefined {
  return draft.tileDefinitions.find((tile) => tile.id === selectedTileDefinitionId);
}

function renderTileDefinitionStatus(): void {
  const tile = currentEditedTileDefinition();
  if (!tile) {
    tileEditorStatus.textContent = "No tile definition selected.";
    return;
  }

  const usedCount = draft.maps.reduce((total, map) => total + map.tileLayers.reduce((layerTotal, layer) => layerTotal + layer.tileIds.filter((tileId) => tileId === tile.id).length, 0), 0);
  tileEditorStatus.textContent = `${tile.name} is ${tile.passability}. Used by ${usedCount} map cell(s). Hint: ${tile.interactionHint ?? "none"}.`;
}

function parseCommaSeparatedValues(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
}

function defaultCategoryForKind(kind: LibraryObjectKind): LibraryCategoryId | undefined {
  return listLibraryCategories(draft).find((category) => category.kind === kind)?.id;
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
  actionMediaSelect.disabled = disabled;
  actionSoundSelect.disabled = disabled;

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
  selectMapCell(x, y);
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
    references.push(summarizeActionReference(action));
  }

  return references;
}
function summarizeActionReference(action: Action): string {
  return ACTION_REFERENCE_SUMMARIES[action.type]?.(action) ?? `Action: ${JSON.stringify(action)}`;
}

const ACTION_REFERENCE_SUMMARIES: Record<Action["type"], (action: any) => string> = {
  showDialogue: (action) => `Action dialogue: ${action.dialogueId}`,
  setFlag: (action) => `Action flag: ${action.flag}`,
  giveItem: (action) => `Action item: ${itemName(action.itemId)}`,
  teleport: (action) => `Action teleport: ${mapNameFor(action.mapId)} (${action.x}, ${action.y})`,
  setQuestStage: (action) => `Action quest: ${questName(action.questId)} -> stage ${action.stage}`,
  changeTile: (action) => `Action tile: ${mapNameFor(action.mapId)} (${action.x}, ${action.y}) -> ${action.tileId}`,
  playMedia: (action) => `Action media: ${mediaCueName(action.cueId)}`,
  playSound: (action) => `Action sound: ${soundCueName(action.cueId)}`
};

function mapNameFor(mapId: MapDefinition["id"]): string {
  return draft.maps.find((candidate) => candidate.id === mapId)?.name ?? mapId;
}

function questName(questId: QuestId): string {
  return draft.questDefinitions.find((candidate) => candidate.id === questId)?.name ?? questId;
}

function mediaCueName(cueId: MediaCueId): string {
  return draft.mediaCues.find((candidate) => candidate.id === cueId)?.name ?? String(cueId);
}

function soundCueName(cueId: SoundCueId): string {
  return draft.soundCues.find((candidate) => candidate.id === cueId)?.name ?? String(cueId);
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
  populateConditionBuilderOptions();
  populateActionBuilderOptions();
}

function populateConditionBuilderOptions(): void {
  populateFlagSelect(conditionFlagSelect, draft.flagDefinitions[0]?.id ?? "");
  populateItemSelect(conditionItemSelect, draft.itemDefinitions[0]?.id ?? "");
  populateQuestSelect(conditionQuestSelect, draft.questDefinitions[0]?.id ?? "");
}

function populateActionBuilderOptions(): void {
  populateFlagSelect(actionFlagSelect, draft.flagDefinitions[0]?.id ?? "");
  populateItemSelect(actionItemSelect, draft.itemDefinitions[0]?.id ?? "");
  populateQuestSelect(actionQuestSelect, draft.questDefinitions[0]?.id ?? "");
  populateDialogueSelect(actionDialogueSelect, draft.dialogue[0]?.id ?? "");
  populateMapSelect(actionMapSelect, currentMapId);
  populateMediaCueSelect(actionMediaSelect, draft.mediaCues[0]?.id ?? "");
  populateSoundCueSelect(actionSoundSelect, draft.soundCues[0]?.id ?? "");
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
  actionQuestFields.classList.toggle("hidden", actionType !== "setQuestStage");
  actionMediaFields.classList.toggle("hidden", actionType !== "playMedia");
  actionSoundFields.classList.toggle("hidden", actionType !== "playSound");
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
  return actionBuilders[actionBuilderType.value]?.() ?? null;
}

const actionBuilders: Record<string, () => Action | null> = {
  showDialogue: buildShowDialogueAction,
  setFlag: buildSetFlagAction,
  giveItem: buildGiveItemAction,
  setQuestStage: buildSetQuestStageAction,
  teleport: buildTeleportAction,
  changeTile: buildChangeTileAction,
  playMedia: buildPlayMediaAction,
  playSound: buildPlaySoundAction
};

function buildShowDialogueAction(): Action | null {
  const dialogueId = actionDialogueSelect.value as DialogueDefinition["id"];
  if (!dialogueId) {
    triggerEditorStatus.textContent = "Choose dialogue before adding a show-dialogue action.";
    return null;
  }
  return { type: "showDialogue", dialogueId };
}

function buildSetFlagAction(): Action | null {
  const flag = actionFlagSelect.value.trim();
  if (!flag) {
    triggerEditorStatus.textContent = "Choose a flag name before adding a set-flag action.";
    return null;
  }
  return { type: "setFlag", flag, value: parseRuleValue(actionValueInput.value) };
}

function buildGiveItemAction(): Action | null {
  const itemId = actionItemSelect.value as ItemDefId;
  if (!itemId) {
    triggerEditorStatus.textContent = "Choose an item before adding a give-item action.";
    return null;
  }
  return { type: "giveItem", itemId, quantity: clampWholeNumber(actionQuantityInput.value, 1, 999, 1) };
}

function buildSetQuestStageAction(): Action | null {
  const questId = actionQuestSelect.value as QuestId;
  if (!questId) {
    triggerEditorStatus.textContent = "Choose a quest before adding a set-quest-stage action.";
    return null;
  }
  return { type: "setQuestStage", questId, stage: clampWholeNumber(actionStageInput.value, 0, 99, 1) };
}

function buildTeleportAction(): Action | null {
  const mapId = actionMapSelect.value as MapDefinition["id"];
  if (!mapId) {
    triggerEditorStatus.textContent = "Choose a map before adding a teleport action.";
    return null;
  }
  return { type: "teleport", mapId, x: clampWholeNumber(actionXInput.value, 0, 999, 1), y: clampWholeNumber(actionYInput.value, 0, 999, 1) };
}

function buildChangeTileAction(): Action | null {
  const mapId = actionMapSelect.value as MapDefinition["id"];
  const tileId = actionTileInput.value.trim();
  if (!mapId || !tileId) {
    triggerEditorStatus.textContent = "Choose a map and tile id before adding a tile-change action.";
    return null;
  }
  return { type: "changeTile", mapId, x: clampWholeNumber(actionXInput.value, 0, 999, 1), y: clampWholeNumber(actionYInput.value, 0, 999, 1), tileId };
}

function buildPlayMediaAction(): Action | null {
  const cueId = actionMediaSelect.value as MediaCueId;
  if (!cueId) {
    triggerEditorStatus.textContent = "Choose a media cue before adding a play-media action.";
    return null;
  }
  return { type: "playMedia", cueId };
}

function buildPlaySoundAction(): Action | null {
  const cueId = actionSoundSelect.value as SoundCueId;
  if (!cueId) {
    triggerEditorStatus.textContent = "Choose a sound cue before adding a play-sound action.";
    return null;
  }
  return { type: "playSound", cueId };
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

function populateMediaCueSelect(select: HTMLSelectElement, selectedId: MediaCueId | ""): void {
  const previousValue = select.value || selectedId;
  select.innerHTML = "";
  for (const cue of listMediaCues(draft)) {
    const option = document.createElement("option");
    option.value = cue.id;
    option.textContent = `${cue.name} (${cue.kind})`;
    option.selected = cue.id === previousValue;
    select.append(option);
  }
}

function populateSoundCueSelect(select: HTMLSelectElement, selectedId: SoundCueId | ""): void {
  const previousValue = select.value || selectedId;
  select.innerHTML = "";
  for (const cue of listSoundCues(draft)) {
    const option = document.createElement("option");
    option.value = cue.id;
    option.textContent = `${cue.name} (${cue.kind})`;
    option.selected = cue.id === previousValue;
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
  return ACTION_SUMMARIES[action.type]?.(action) ?? `Unknown action ${JSON.stringify(action)}`;
}

const ACTION_SUMMARIES: Record<Action["type"], (action: any) => string> = {
  showDialogue: (action) => `Show dialogue ${action.dialogueId}`,
  setFlag: (action) => `Set flag ${action.flag} to ${String(action.value)}`,
  giveItem: (action) => `Give ${action.quantity ?? 1} x ${action.itemId}`,
  teleport: (action) => `Teleport to ${action.mapId} at (${action.x}, ${action.y})`,
  changeTile: (action) => `Change ${action.mapId} (${action.x}, ${action.y}) to ${action.tileId}`,
  setQuestStage: (action) => `Set quest ${action.questId} to stage ${action.stage}`,
  playMedia: (action) => `Play media cue ${mediaCueName(action.cueId)}`,
  playSound: (action) => `Play sound cue ${soundCueName(action.cueId)}`
};

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

function renderExitOptions(): void {
  populateMapSelect(exitTargetMapSelect, selectedExit()?.toMapId ?? currentMapId);
  renderExitTargetDefaults();
  deleteExitButton.disabled = !selectedExitId;
}

function renderExitTargetDefaults(): void {
  const exit = selectedExit();
  const targetMap = getMapById(draft, exitTargetMapSelect.value as MapDefinition["id"]);
  exitTargetXInput.max = String(Math.max(0, (targetMap?.width ?? 1) - 1));
  exitTargetYInput.max = String(Math.max(0, (targetMap?.height ?? 1) - 1));
  if (exit) {
    exitTargetXInput.value = String(exit.toX);
    exitTargetYInput.value = String(exit.toY);
  }
}

function selectedExit(): ExitDefinition | undefined {
  return listExitsForMap(draft, currentMapId).find((exit) => exit.id === selectedExitId);
}

function exitsForCell(mapId: MapDefinition["id"], x: number, y: number): ExitDefinition[] {
  return listExitsForMap(draft, mapId).filter((exit) => exit.x === x && exit.y === y);
}

function deleteSelectedExit(): void {
  if (!selectedExitId) {
    return;
  }

  draft = deleteExitDefinition(draft, currentMapId, selectedExitId);
  selectedExitId = "";
  markValidationDirty();
  renderEditor();
}
function renderPalette(): void {
  const definitionTileIds = listTileDefinitions(draft).map((tile) => String(tile.id));
  const palette = [...new Set([...definitionTileIds, ...listTilePalette(draft, currentMapId), ...FALLBACK_TILES])];
  if (!palette.includes(selectedTileId)) {
    selectedTileId = palette[0] ?? "grass";
  }

  tileSelect.innerHTML = "";
  for (const tileId of palette) {
    const option = document.createElement("option");
    option.value = tileId;
    option.textContent = tileOptionLabel(tileId);
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
    option.textContent = `${entityDisplayName(entity, definition)} (${definition?.name ?? entity.definitionId})`;
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

  renderEntityInstanceEditor();
}

function renderEntityInstanceEditor(): void {
  const selectedEntity = listEntitiesForMap(draft, currentMapId).find((entity) => entity.id === selectedEntityId);
  const isEntityMode = editModeSelect.value === "entities";
  entityInstanceEditorWrap.classList.toggle("hidden", !isEntityMode);

  if (selectedEntity) {
    entityInstanceNameInput.disabled = false;
    entityInstanceBehaviorSelect.disabled = false;
    entityInstanceNameInput.value = selectedEntity.displayName ?? "";
    entityInstanceBehaviorSelect.value = entityBehaviorOverrideMode(selectedEntity);
    return;
  }

  const canPlace = Boolean(selectedEntityDefinitionId && canPlaceEntityDefinition(draft, selectedEntityDefinitionId));
  entityInstanceNameInput.disabled = !canPlace;
  entityInstanceBehaviorSelect.disabled = !canPlace;
  entityInstanceNameInput.value = pendingEntityInstanceName;
  entityInstanceBehaviorSelect.value = pendingEntityBehaviorOverride;
}

function updateSelectedEntityInstanceMetadata(): void {
  const behaviorOverride = readEntityBehaviorOverride();
  if (!selectedEntityId) {
    pendingEntityInstanceName = entityInstanceNameInput.value;
    pendingEntityBehaviorOverride = behaviorOverride ?? "";
    renderBrushPreview();
    renderEditorHint();
    return;
  }

  draft = updateEntityInstance(draft, selectedEntityId, {
    displayName: entityInstanceNameInput.value,
    behaviorOverride
  });
  markValidationDirty();
  renderPalette();
  renderGrid();
  renderEntitySummary();
  renderBrushPreview();
  renderEditorHint();
}

function readEntityBehaviorOverride(): EntityBehaviorMode | undefined {
  return entityInstanceBehaviorSelect.value ? (entityInstanceBehaviorSelect.value as EntityBehaviorMode) : undefined;
}

function entityBehaviorOverrideMode(entity: EntityInstance): EntityBehaviorMode | "" {
  if (!entity.behaviorOverride) {
    return "";
  }

  return typeof entity.behaviorOverride === "string" ? entity.behaviorOverride : entity.behaviorOverride.mode;
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
      button.dataset.cell = createCellKey(x, y);
      updateGridCell(button, tileId, occupant, triggersForCell(currentMapId, x, y), exitsForCell(currentMapId, x, y));
      button.classList.toggle("selected-cell", selectedCell?.x === x && selectedCell.y === y);
      wireGridCell(button, x, y);
      editorGrid.append(button);
    }
  }
}

function wireGridCell(button: HTMLButtonElement, x: number, y: number): void {
  const mode = editModeSelect.value;
  if (mode === "tiles") {
    wireTileBrushCell(button, x, y);
    return;
  }

  if (mode === "triggers") {
    button.addEventListener("click", () => attachSelectedTriggerToCell(x, y));
    return;
  }

  if (mode === "exits") {
    button.addEventListener("click", () => applyExitEdit(x, y));
    return;
  }

  button.addEventListener("click", () => applyEntityEdit(x, y));
}

function renderGridSelectionStyles(): void {
  editorGrid.querySelectorAll<HTMLButtonElement>(".editor-cell").forEach((button) => {
    button.classList.toggle("selected-cell", button.dataset.cell === (selectedCell ? createCellKey(selectedCell.x, selectedCell.y) : ""));
  });
}

function wireTileBrushCell(button: HTMLButtonElement, x: number, y: number): void {
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    beginTileBrush(x, y);
  });
  button.addEventListener("pointerenter", () => {
    if (isTileBrushActive) {
      paintTileAt(x, y);
    }
  });
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

function renderAuthoringDiagnostics(): void {
  diagnosticsList.innerHTML = "";
  scenarioList.innerHTML = "";
  authoringDiagnosticsReport = createAuthoringDiagnostics(draft);
  diagnosticsSummary.textContent = summarizeAuthoringDiagnostics(authoringDiagnosticsReport);

  const visibleDiagnostics = authoringDiagnosticsReport.diagnostics.slice(0, 16);
  for (const diagnostic of visibleDiagnostics) {
    appendListText(diagnosticsList, `[${diagnostic.severity}] ${diagnostic.area}: ${diagnostic.message}`);
  }

  if (authoringDiagnosticsReport.diagnostics.length > visibleDiagnostics.length) {
    appendListText(diagnosticsList, `${authoringDiagnosticsReport.diagnostics.length - visibleDiagnostics.length} more diagnostic note(s) available in the data model.`);
  }

  for (const scenario of authoringDiagnosticsReport.scenarios) {
    appendListText(scenarioList, `${scenario.name}: ${scenario.goal} Checks: ${scenario.checks.join("; ")}`);
  }
}

function summarizeAuthoringDiagnostics(report: AuthoringDiagnosticsReport): string {
  const summary = report.summary;
  return `${summary.triggerCount} trigger(s), ${summary.exitCount} exit(s), ${summary.entityCount} placed entit(y/ies), ${summary.questCount} quest(s), ${summary.scenarioCount} playtest scenario(s), ${summary.warningCount} warning(s).`;
}

function previewDisplayRenameFromEditor(): void {
  renamePreviewMatches = previewDisplayRename(draft, readDisplayRenameRequest());
  renderDisplayRenamePreview();
}

function applyDisplayRenameFromEditor(): void {
  const request = readDisplayRenameRequest();
  renamePreviewMatches = previewDisplayRename(draft, request);
  if (renamePreviewMatches.length === 0) {
    renderDisplayRenamePreview();
    return;
  }

  draft = applyDisplayRename(draft, request);
  renamePreviewMatches = [];
  markValidationDirty();
  renderEditor();
  renameSummary.textContent = "Applied display rename to the draft. Stable ids and structured references were not changed.";
}

function readDisplayRenameRequest(): { search: string; replacement: string; scopes: DisplayRenameScope[] } {
  return {
    search: renameSearchInput.value,
    replacement: renameReplacementInput.value,
    scopes: Array.from(renameScopeSelect.selectedOptions).map((option) => option.value as DisplayRenameScope)
  };
}

function renderDisplayRenamePreview(): void {
  renamePreviewList.innerHTML = "";
  renameApplyButton.disabled = renamePreviewMatches.length === 0;
  if (!renameSearchInput.value.trim()) {
    renameSummary.textContent = "Enter text to preview display-name changes.";
    return;
  }

  renameSummary.textContent = `${renamePreviewMatches.length} display field(s) would change. Internal ids are preserved.`;
  for (const match of renamePreviewMatches.slice(0, 20)) {
    appendListText(renamePreviewList, summarizeDisplayRenameMatch(match));
  }
  if (renamePreviewMatches.length > 20) {
    appendListText(renamePreviewList, `${renamePreviewMatches.length - 20} more match(es) not shown.`);
  }
}

function summarizeDisplayRenameMatch(match: DisplayRenameMatch): string {
  return `${match.scope}: ${match.objectType} ${match.objectId}.${match.field}: "${match.before}" -> "${match.after}"`;
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
    const behavior = entityBehaviorOverrideMode(entity) || "definition behavior";
    item.textContent = `${entityDisplayName(entity, definition)}: ${definition?.name ?? entity.definitionId} at (${entity.x}, ${entity.y}); ${behavior}`;
    entitySummary.append(item);
  }
}

function renderExitSummary(): void {
  exitSummary.innerHTML = "";
  const exits = listExitsForMap(draft, currentMapId);
  if (exits.length === 0) {
    appendListText(exitSummary, "No exits on this map.");
    return;
  }

  for (const exit of exits) {
    const target = getMapById(draft, exit.toMapId);
    appendListText(exitSummary, `${exit.id}: (${exit.x}, ${exit.y}) -> ${target?.name ?? exit.toMapId} (${exit.toX}, ${exit.toY})`);
  }
}

function renderMapGraphSummary(): void {
  mapGraphSummary.innerHTML = "";
  const graphRows = draft.maps.flatMap((map) => map.exits.map((exit) => summarizeExitEdge(map, exit)));
  if (graphRows.length === 0) {
    appendListText(mapGraphSummary, "No map links authored yet.");
    return;
  }

  for (const row of graphRows) {
    appendListText(mapGraphSummary, row);
  }
}

function summarizeExitEdge(map: MapDefinition, exit: ExitDefinition): string {
  const target = getMapById(draft, exit.toMapId);
  return `${map.name} (${exit.x}, ${exit.y}) -> ${target?.name ?? exit.toMapId} (${exit.toX}, ${exit.toY})`;
}

function renderSelectedCellInspector(): void {
  selectedCellSummary.innerHTML = "";
  const map = getMapById(draft, currentMapId);
  if (!map || !selectedCell || !isWithinSelectedMap(map, selectedCell.x, selectedCell.y)) {
    selectedCell = null;
    appendListText(selectedCellSummary, "No cell selected. Click a map cell to inspect its tile, occupant, exit, and triggers.");
    return;
  }

  appendSelectedCellBasics(map, selectedCell.x, selectedCell.y);
  appendSelectedCellOccupant(selectedCell.x, selectedCell.y);
  appendSelectedCellExits(selectedCell.x, selectedCell.y);
  appendSelectedCellTriggers(selectedCell.x, selectedCell.y);
}

function appendSelectedCellBasics(map: MapDefinition, x: number, y: number): void {
  const tileId = getTileIdAt(x, y);
  const tile = draft.tileDefinitions.find((candidate) => candidate.id === tileId);
  appendListText(selectedCellSummary, `Cell: ${map.name} (${x}, ${y}).`);
  appendListText(selectedCellSummary, `Tile: ${tile?.name ?? tileId} (${tileId}); passability ${tile?.passability ?? "unknown"}.`);
}

function appendSelectedCellOccupant(x: number, y: number): void {
  const occupant = listEntitiesForMap(draft, currentMapId).find((entity) => entity.x === x && entity.y === y);
  if (!occupant) {
    appendListText(selectedCellSummary, "Occupant: none.");
    return;
  }

  const definition = draft.entityDefinitions.find((candidate) => candidate.id === occupant.definitionId);
  const behavior = entityBehaviorOverrideMode(occupant) || "definition behavior";
  appendListText(selectedCellSummary, `Occupant: ${entityDisplayName(occupant, definition)} using ${definition?.name ?? occupant.definitionId}; ${behavior}.`);
}

function appendSelectedCellExits(x: number, y: number): void {
  const exits = exitsForCell(currentMapId, x, y);
  if (exits.length === 0) {
    appendListText(selectedCellSummary, "Exit: none.");
    return;
  }

  exits.forEach((exit) => {
    const target = getMapById(draft, exit.toMapId);
    appendListText(selectedCellSummary, `Exit: ${exit.id} -> ${target?.name ?? exit.toMapId} (${exit.toX}, ${exit.toY}).`);
  });
}

function appendSelectedCellTriggers(x: number, y: number): void {
  const triggers = triggersForCell(currentMapId, x, y);
  if (triggers.length === 0) {
    appendListText(selectedCellSummary, "Triggers: none.");
    return;
  }

  triggers.forEach((trigger) => appendListText(selectedCellSummary, `Trigger: ${trigger.id} (${trigger.type}); ${trigger.conditions.length} condition(s), ${trigger.actions.length} action(s).`));
}

function selectMapCell(x: number, y: number): void {
  selectedCell = { x, y };
  renderSelectedCellInspector();
  renderGridSelectionStyles();
}

function isWithinSelectedMap(map: MapDefinition, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

function appendListText(list: HTMLElement, text: string): void {
  const item = document.createElement("li");
  item.textContent = text;
  list.append(item);
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
  const mode = editModeSelect.value;
  const isTileMode = mode === "tiles";
  const isEntityMode = mode === "entities";
  const isExitMode = mode === "exits";
  tilePickerWrap.classList.toggle("hidden", !isTileMode);
  entityPickerWrap.classList.toggle("hidden", !isEntityMode);
  entityDefinitionPickerWrap.classList.toggle("hidden", !isEntityMode);
  entityInstanceEditorWrap.classList.toggle("hidden", !isEntityMode);
  placeEntityButton.classList.toggle("hidden", !isEntityMode);
  exitPickerWrap.classList.toggle("hidden", !isExitMode);
  brushPreview.classList.toggle("hidden", false);
}

function renderBrushPreview(): void {
  const mode = editModeSelect.value;
  if (mode === "tiles") {
    renderTileBrushPreview();
    return;
  }

  if (mode === "triggers") {
    renderTriggerBrushPreview();
    return;
  }

  if (mode === "exits") {
    renderExitBrushPreview();
    return;
  }

  renderEntityBrushPreview();
}

function renderTileBrushPreview(): void {
  brushSwatch.style.background = tileColor(selectedTileId || "void");
  brushValue.textContent = tileOptionLabel(selectedTileId) || "none";
}

function renderTriggerBrushPreview(): void {
  const trigger = currentEditedTrigger();
  brushSwatch.style.background = "#f5d547";
  brushValue.textContent = trigger ? `Attach ${trigger.id}` : "No trigger";
}

function renderExitBrushPreview(): void {
  const target = getMapById(draft, exitTargetMapSelect.value as MapDefinition["id"]);
  brushSwatch.style.background = "#70d6ff";
  brushValue.textContent = selectedExitId ? `Edit ${selectedExitId}` : `Exit to ${target?.name ?? "map"}`;
}

function renderEntityBrushPreview(): void {
  if (entityEditIntent === "place") {
    renderEntityPlacementPreview();
    return;
  }

  const entity = listEntitiesForMap(draft, currentMapId).find((candidate) => candidate.id === selectedEntityId);
  const definition = draft.entityDefinitions.find((candidate) => candidate.id === entity?.definitionId);
  brushSwatch.style.background = entityKindColor(definition?.kind);
  brushValue.textContent = entity ? entityDisplayName(entity, definition) : (selectedEntityId || "none");
  placeEntityButton.disabled = !selectedEntityDefinitionId || !canPlaceEntityDefinition(draft, selectedEntityDefinitionId);
}

function renderEntityPlacementPreview(): void {
  const definition = draft.entityDefinitions.find((candidate) => candidate.id === selectedEntityDefinitionId);
  brushSwatch.style.background = entityKindColor(definition?.kind);
  brushValue.textContent = definition ? `Place ${definition.name}` : "No definition";
  placeEntityButton.disabled = !definition || !canPlaceEntityDefinition(draft, definition.id);
}

function renderEditorHint(): void {
  const map = getMapById(draft, currentMapId);
  if (!map) {
    editorHint.textContent = "";
    return;
  }

  editorHint.textContent = editorHintForMode(map);
}

function editorHintForMode(map: MapDefinition): string {
  const mode = editModeSelect.value;
  if (mode === "tiles") {
    return `Painting tiles on ${map.name}. Brush tile: ${selectedTileId || "none"}. Click and drag to paint multiple cells.`;
  }

  if (mode === "triggers") {
    return `Attaching trigger markers on ${map.name}. Click a cell to set the selected trigger map/x/y location.`;
  }

  if (mode === "exits") {
    const target = getMapById(draft, exitTargetMapSelect.value as MapDefinition["id"]);
    return `Authoring exits on ${map.name}. Click an existing exit to inspect it, or click a cell to link it to ${target?.name ?? "the selected map"}.`;
  }

  return entityEditorHint(map);
}

function entityEditorHint(map: MapDefinition): string {
  if (entityEditIntent !== "place") {
    return `Repositioning entities on ${map.name}. Selected entity: ${selectedEntityId || "none"}.`;
  }

  const definition = draft.entityDefinitions.find((candidate) => candidate.id === selectedEntityDefinitionId);
  const placement = definition?.placement ?? "multiple";
  const availability = definition && !canPlaceEntityDefinition(draft, definition.id) ? " Already placed." : "";
  return `Placing ${definition?.name ?? "an entity"} on ${map.name}. Placement: ${placement}.${availability} Click a cell to add an instance.`;
}
function beginTileBrush(x: number, y: number): void {
  isTileBrushActive = true;
  lastPaintedCellKey = null;
  selectMapCell(x, y);
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
  selectMapCell(x, y);
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
  renderSelectedCellInspector();
  renderGridSelectionStyles();
}

function applyEntityEdit(x: number, y: number): void {
  selectMapCell(x, y);
  if (entityEditIntent === "place" || !selectedEntityId) {
    placeEntityInstanceAt(x, y);
    return;
  }

  moveSelectedEntityTo(x, y);
}

function placeEntityInstanceAt(x: number, y: number): void {
  const definitionId = selectedEntityDefinitionId || (entityDefinitionSelect.value as EntityDefId | "");
  if (!definitionId || !canPlaceEntityDefinition(draft, definitionId)) {
    renderEditorHint();
    return;
  }

  const previousIds = new Set(draft.entityInstances.map((entity) => entity.id));
  draft = addEntityInstance(draft, definitionId, currentMapId, x, y, {
    displayName: pendingEntityInstanceName,
    behaviorOverride: pendingEntityBehaviorOverride || undefined
  });
  selectedEntityId = findNewEntityInstanceId(previousIds);
  pendingEntityInstanceName = "";
  pendingEntityBehaviorOverride = "";
  entityEditIntent = selectedEntityId ? "move" : "place";
  markValidationDirty();
  renderEditor();
}

function moveSelectedEntityTo(x: number, y: number): void {
  const entityId = selectedEntityId || (entitySelect.value as EntityInstance["id"] | "");
  if (!entityId) {
    return;
  }
  draft = moveEntityInstance(draft, entityId, currentMapId, x, y);
  markValidationDirty();
  renderEditor();
}

function findNewEntityInstanceId(previousIds: ReadonlySet<EntityInstance["id"]>): EntityInstance["id"] | "" {
  return draft.entityInstances.find((entity) => !previousIds.has(entity.id))?.id ?? "";
}
function applyExitEdit(x: number, y: number): void {
  selectMapCell(x, y);
  const existing = exitsForCell(currentMapId, x, y)[0];
  if (selectExistingExit(existing)) {
    return;
  }

  const id = selectedExitId || existing?.id;
  draft = upsertExitDefinition(draft, currentMapId, buildExitInput(x, y, id));
  selectedExitId = exitsForCell(currentMapId, x, y)[0]?.id ?? "";
  markValidationDirty();
  renderEditor();
}

function selectExistingExit(existing: ExitDefinition | undefined): boolean {
  if (!existing || selectedExitId === existing.id) {
    return false;
  }

  selectedExitId = existing.id;
  renderEditor();
  return true;
}

function buildExitInput(x: number, y: number, id: ExitDefinition["id"] | undefined): UpsertExitInput {
  const targetMapId = (exitTargetMapSelect.value || currentMapId) as MapDefinition["id"];
  const targetMap = getMapById(draft, targetMapId);
  const maxX = Math.max(0, (targetMap?.width ?? 1) - 1);
  const maxY = Math.max(0, (targetMap?.height ?? 1) - 1);
  const input: UpsertExitInput = {
    x,
    y,
    toMapId: targetMapId,
    toX: clampWholeNumber(exitTargetXInput.value, 0, maxX, 0),
    toY: clampWholeNumber(exitTargetYInput.value, 0, maxY, 0)
  };
  if (id) {
    input.id = id;
  }
  return input;
}
function refreshGridCell(x: number, y: number): void {
  const button = editorGrid.querySelector<HTMLButtonElement>(`button[data-cell="${createCellKey(x, y)}"]`);
  if (!button) {
    return;
  }

  const tileId = getTileIdAt(x, y);
  const occupant = listEntitiesForMap(draft, currentMapId).find((entity) => entity.x === x && entity.y === y);
  updateGridCell(button, tileId, occupant, triggersForCell(currentMapId, x, y), exitsForCell(currentMapId, x, y));
}

function updateGridCell(
  button: HTMLButtonElement,
  tileId: string,
  occupant: EntityInstance | undefined,
  cellTriggers: TriggerDefinition[] = [],
  cellExits: ExitDefinition[] = []
): void {
  button.style.background = tileColor(tileId);
  const triggerLabel = cellTriggers.length > 0 ? `\nTriggers: ${cellTriggers.map((trigger) => trigger.id).join(", ")}` : "";
  const exitLabel = cellExits.length > 0 ? `\nExits: ${cellExits.map((exit) => exit.id).join(", ")}` : "";
  const occupantDefinition = draft.entityDefinitions.find((candidate) => candidate.id === occupant?.definitionId);
  const occupantLabel = occupant ? entityDisplayName(occupant, occupantDefinition) : "";
  button.title = occupant ? `${tileId}\n${occupantLabel}${triggerLabel}${exitLabel}` : `${tileId}${triggerLabel}${exitLabel}`;
  const entityMarkup = occupant ? `<span class="entity-chip">${shortEntityLabel(occupant)}</span>` : `<span>${tileId}</span>`;
  const triggerMarkup = cellTriggers.length > 0 ? `<span class="trigger-chip">${cellTriggers.length}</span>` : "";
  const exitMarkup = cellExits.length > 0 ? `<span class="trigger-chip">EX</span>` : "";
  button.innerHTML = `${entityMarkup}${triggerMarkup}${exitMarkup}`;
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
  selectedCell = null;
  renamePreviewMatches = [];
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
  return (entity.displayName ?? entity.id.replace(/^entity_/, "")).slice(0, 4).toUpperCase();
}

function entityDisplayName(entity: EntityInstance, definition: EntityDefinition | undefined): string {
  return entity.displayName?.trim() || definition?.name || entity.id;
}

function tileOptionLabel(tileId: string): string {
  const definition = tileDefinitionById(tileId);
  if (!definition) {
    return tileId;
  }

  const marker = definition.passability === "blocked" ? "blocked" : definition.passability;
  return `${definition.name} (${tileId}, ${marker})`;
}

function tileDefinitionById(tileId: string): TileDefinition | undefined {
  return draft.tileDefinitions.find((definition) => definition.id === tileId);
}
function getTileColors(): Record<string, string> {
  return {
  grass: "#497c4c",
  path: "#a58258",
  water: "#2e5b88",
  stone: "#68737d",
  altar: "#c4a85a",
  "altar-lit": "#e1c66f",
  shrub: "#2d5132",
  door: "#704b2e",
  floor: "#8b8f94"
  };
}

function tileColor(tileId: string): string {
  const spriteId = tileDefinitionById(tileId)?.classicSpriteId ?? tileId;
  const colors = getTileColors();
  return colors[spriteId] ?? fallbackTileColor(tileId);
}

function fallbackTileColor(tileId: string): string {
  return tileDefinitionById(tileId)?.passability === "blocked" ? "#26313b" : "#1f2329";
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
