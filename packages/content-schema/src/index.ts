import {
  CURRENT_ADVENTURE_SCHEMA_VERSION,
  type AdventurePackage,
  type ClassicPixelSpriteDefinition,
  type DialogueDefinition,
  type EntityDefinition,
  type ItemDefinition,
  type MapDefinition,
  type QuestDefinition,
  type QuestObjectiveDefinition,
  type QuestRewardDefinition,
  type RegionDefinition,
  type TileDefinition,
  type TriggerDefinition
} from "@acs/domain";

export type RawMapDefinition = Omit<MapDefinition, "tileLayers"> & {
  tileIds: readonly string[];
  layerId?: string;
  layerName?: string;
};

export type RawQuestDefinition = Omit<QuestDefinition, "objectives" | "rewards"> & {
  objectives?: QuestObjectiveDefinition[];
  stages?: string[];
  rewards?: Array<QuestRewardDefinition | string>;
};
export type RawDialogueDefinition = {
  id: DialogueDefinition["id"];
  categoryId?: DialogueDefinition["categoryId"];
  speaker: string;
  text: string;
  continueLabel?: string;
};

export type RawAdventurePackage = Omit<AdventurePackage, "maps" | "dialogue" | "entityDefinitions" | "questDefinitions"> & {
  maps: Array<MapDefinition | RawMapDefinition>;
  dialogue: Array<DialogueDefinition | RawDialogueDefinition>;
  entityDefinitions: EntityDefinition[];
  questDefinitions: RawQuestDefinition[];
};

export type ValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  path?: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export function createEmptyAdventurePackage(): AdventurePackage {
  return {
    schemaVersion: CURRENT_ADVENTURE_SCHEMA_VERSION,
    metadata: {
      id: "adv_root" as AdventurePackage["metadata"]["id"],
      slug: "untitled-adventure",
      title: "Untitled Adventure",
      description: "",
      author: "",
      tags: []
    },
    assets: [],
    visualManifests: [],
    rules: {
      simulationMode: "turn-based",
      movementModel: "grid-step",
      combatModel: "simple-tactical",
      inventoryModel: "slotless"
    },
    presentation: {},
    starterLibraryPacks: [],
    regions: [],
    maps: [],
    libraryCategories: [],
    entityDefinitions: [],
    entityInstances: [],
    itemDefinitions: [],
    tileDefinitions: [],
    skillDefinitions: [],
    traitDefinitions: [],
    spellDefinitions: [],
    flagDefinitions: [],
    customLibraryObjects: [],
    questDefinitions: [],
    dialogue: [],
    triggers: [],
    startState: {
      mapId: "map_start" as AdventurePackage["startState"]["mapId"],
      x: 0,
      y: 0,
      party: []
    }
  };
}

export function readAdventurePackage(input: unknown): AdventurePackage {
  return migrateAdventurePackage(input);
}

export function parseAdventurePackage(input: unknown): ValidationResult & { data?: AdventurePackage } {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: [{ severity: "error", code: "invalid_type", message: "Adventure package must be an object." }]
    };
  }

  const candidate = normalizeAdventurePackage(input);
  const issues = validateAdventurePackage(candidate);
  const valid = issues.every((issue) => issue.severity !== "error");

  if (valid) {
    return {
      valid,
      issues,
      data: candidate
    };
  }

  return {
    valid,
    issues
  };
}

export function validateAdventurePackage(pkg: Partial<AdventurePackage>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (pkg.schemaVersion !== CURRENT_ADVENTURE_SCHEMA_VERSION) {
    issues.push({
      severity: "error",
      code: "schema_version_mismatch",
      message: `Expected schemaVersion ${CURRENT_ADVENTURE_SCHEMA_VERSION}.`,
      path: "schemaVersion"
    });
  }

  if (!pkg.metadata?.title) {
    issues.push({
      severity: "error",
      code: "missing_title",
      message: "Adventure title is required.",
      path: "metadata.title"
    });
  }

  if (!Array.isArray(pkg.maps) || pkg.maps.length === 0) {
    issues.push({
      severity: "error",
      code: "missing_maps",
      message: "At least one map is required.",
      path: "maps"
    });
  }

  if (!pkg.startState?.mapId) {
    issues.push({
      severity: "error",
      code: "missing_start_map",
      message: "A startState.mapId is required.",
      path: "startState.mapId"
    });
  }

  pushDuplicateIdIssues("regions", pkg.regions, issues);
  pushDuplicateIdIssues("maps", pkg.maps, issues);
  pushDuplicateIdIssues("libraryCategories", pkg.libraryCategories, issues);
  pushDuplicateIdIssues("entityDefinitions", pkg.entityDefinitions, issues);
  pushDuplicateIdIssues("itemDefinitions", pkg.itemDefinitions, issues);
  pushDuplicateIdIssues("tileDefinitions", pkg.tileDefinitions, issues);
  pushDuplicateIdIssues("skillDefinitions", pkg.skillDefinitions, issues);
  pushDuplicateIdIssues("traitDefinitions", pkg.traitDefinitions, issues);
  pushDuplicateIdIssues("spellDefinitions", pkg.spellDefinitions, issues);
  pushDuplicateIdIssues("flagDefinitions", pkg.flagDefinitions, issues);
  pushDuplicateIdIssues("customLibraryObjects", pkg.customLibraryObjects, issues);
  pushDuplicateIdIssues("questDefinitions", pkg.questDefinitions, issues);
  pushDuplicateIdIssues("dialogue", pkg.dialogue, issues);
  pushDuplicateIdIssues("triggers", pkg.triggers, issues);

  const mapIds = new Set((pkg.maps ?? []).map((map) => map.id));
  if (pkg.startState?.mapId && !mapIds.has(pkg.startState.mapId)) {
    issues.push({
      severity: "error",
      code: "unknown_start_map",
      message: `startState.mapId '${pkg.startState.mapId}' does not exist in maps.`,
      path: "startState.mapId"
    });
  }

  const entityDefinitionIds = new Set((pkg.entityDefinitions ?? []).map((definition) => definition.id));
  for (const [index, instance] of (pkg.entityInstances ?? []).entries()) {
    if (!entityDefinitionIds.has(instance.definitionId)) {
      issues.push({
        severity: "error",
        code: "unknown_entity_definition",
        message: `Entity instance '${instance.id}' references missing definition '${instance.definitionId}'.`,
        path: `entityInstances[${index}].definitionId`
      });
    }

    if (!mapIds.has(instance.mapId)) {
      issues.push({
        severity: "error",
        code: "unknown_entity_map",
        message: `Entity instance '${instance.id}' references missing map '${instance.mapId}'.`,
        path: `entityInstances[${index}].mapId`
      });
    }
  }

  for (const [index, trigger] of (pkg.triggers ?? []).entries()) {
    if (trigger.mapId && !mapIds.has(trigger.mapId)) {
      issues.push({
        severity: "error",
        code: "unknown_trigger_map",
        message: `Trigger '${trigger.id}' references missing map '${trigger.mapId}'.`,
        path: `triggers[${index}].mapId`
      });
    }
  }

  return issues;
}

export function migrateAdventurePackage(input: unknown): AdventurePackage {
  const parsed = parseAdventurePackage(input);

  if (!parsed.valid || !parsed.data) {
    const messages = parsed.issues.map((issue) => `${issue.code}: ${issue.message}`).join("; ");
    throw new Error(`Adventure package migration failed: ${messages}`);
  }

  return parsed.data;
}

function normalizeAdventurePackage(input: unknown): AdventurePackage {
  const candidate = input as Partial<RawAdventurePackage>;

  return {
    ...(candidate as Omit<AdventurePackage, "maps" | "dialogue" | "entityDefinitions">),
    ...normalizePresentationCollections(candidate),
    ...normalizeLibraryCollections(candidate),
    ...normalizeAuthoredCollections(candidate)
  } as AdventurePackage;
}

function normalizePresentationCollections(candidate: Partial<RawAdventurePackage>): Pick<AdventurePackage, "visualManifests" | "presentation" | "starterLibraryPacks"> {
  return {
    visualManifests: normalizeVisualManifests(candidate.visualManifests),
    presentation: candidate.presentation ?? {},
    starterLibraryPacks: candidate.starterLibraryPacks ?? []
  };
}

function normalizeLibraryCollections(candidate: Partial<RawAdventurePackage>): Pick<AdventurePackage, "libraryCategories" | "tileDefinitions" | "skillDefinitions" | "traitDefinitions" | "spellDefinitions" | "flagDefinitions" | "customLibraryObjects" | "questDefinitions"> {
  return {
    libraryCategories: candidate.libraryCategories ?? [],
    tileDefinitions: normalizeTileDefinitions(candidate.tileDefinitions),
    skillDefinitions: candidate.skillDefinitions ?? [],
    traitDefinitions: candidate.traitDefinitions ?? [],
    spellDefinitions: candidate.spellDefinitions ?? [],
    flagDefinitions: candidate.flagDefinitions ?? [],
    customLibraryObjects: candidate.customLibraryObjects ?? [],
    questDefinitions: normalizeQuestDefinitions(candidate.questDefinitions)
  };
}

function normalizeAuthoredCollections(candidate: Partial<RawAdventurePackage>): Pick<AdventurePackage, "maps" | "entityDefinitions" | "dialogue"> {
  return {
    maps: (candidate.maps ?? []).map((map) => normalizeMapDefinition(map)),
    entityDefinitions: (candidate.entityDefinitions ?? []).map((definition) => normalizeEntityDefinition(definition)),
    dialogue: (candidate.dialogue ?? []).map((dialogue) => normalizeDialogueDefinition(dialogue))
  };
}

function normalizeVisualManifests(definitions: AdventurePackage["visualManifests"] | undefined): AdventurePackage["visualManifests"] {
  return (definitions ?? []).map((definition) => ({
    ...definition,
    pixelSprites: (definition.pixelSprites ?? []).map((sprite) => normalizePixelSprite(sprite))
  }));
}

function normalizePixelSprite(sprite: ClassicPixelSpriteDefinition): ClassicPixelSpriteDefinition {
  const width = Math.max(1, Math.floor(sprite.width || 8));
  const height = Math.max(1, Math.floor(sprite.height || 8));
  const palette = sprite.palette.length > 0 ? sprite.palette : ["#000000", "#ffffff"];
  return {
    ...sprite,
    width,
    height,
    palette,
    pixels: normalizePixelIndexes(sprite.pixels, width * height, palette.length),
    tags: sprite.tags ?? [],
    genreTags: sprite.genreTags ?? []
  };
}

function normalizePixelIndexes(values: number[], length: number, paletteLength: number): number[] {
  return Array.from({ length }, (_, index) => clampPaletteIndex(values[index] ?? 0, paletteLength));
}

function clampPaletteIndex(value: number, paletteLength: number): number {
  return Math.max(0, Math.min(Math.floor(value), Math.max(0, paletteLength - 1)));
}
function normalizeQuestDefinitions(definitions: RawQuestDefinition[] | undefined): QuestDefinition[] {
  return (definitions ?? []).map((definition) => {
    const normalized: QuestDefinition = {
      ...definition,
      objectives: normalizeQuestObjectives(definition),
      rewards: normalizeQuestRewards(definition.rewards),
      sourceReferences: definition.sourceReferences ?? []
    };
    if (definition.stages) {
      normalized.stages = definition.stages;
    }
    return normalized;
  });
}

function normalizeQuestObjectives(definition: RawQuestDefinition): QuestObjectiveDefinition[] {
  if (definition.objectives && definition.objectives.length > 0) {
    return definition.objectives.map((objective, index) => normalizeQuestObjective(objective, index));
  }

  return (definition.stages ?? []).map((stage, index) => ({
    id: `objective_${index + 1}`,
    title: stage,
    description: stage,
    kind: objectiveKindForIndex(index, definition.stages?.length ?? 0),
    completionStage: index
  }));
}

function normalizeQuestObjective(objective: QuestObjectiveDefinition, index: number): QuestObjectiveDefinition {
  return {
    ...objective,
    id: objective.id || `objective_${index + 1}`,
    title: objective.title || objective.description || `Objective ${index + 1}`,
    description: objective.description ?? objective.title ?? "",
    kind: objective.kind ?? "story",
    completionStage: objective.completionStage ?? index
  };
}

function objectiveKindForIndex(index: number, total: number): QuestObjectiveDefinition["kind"] {
  if (index === 0) {
    return "story";
  }
  if (index === total - 1) {
    return "return";
  }
  return "travel";
}

function normalizeQuestRewards(rewards: RawQuestDefinition["rewards"]): QuestRewardDefinition[] {
  return (rewards ?? []).map((reward, index) => normalizeQuestReward(reward, index));
}

function normalizeQuestReward(reward: QuestRewardDefinition | string, index: number): QuestRewardDefinition {
  if (typeof reward !== "string") {
    return {
      ...reward,
      id: reward.id || `reward_${index + 1}`,
      label: reward.label || reward.description || `Reward ${index + 1}`,
      kind: reward.kind ?? "story"
    };
  }

  return {
    id: `reward_${index + 1}`,
    label: reward,
    kind: "story",
    description: reward
  };
}
function normalizeTileDefinitions(definitions: TileDefinition[] | undefined): TileDefinition[] {
  return (definitions ?? []).map((definition) => normalizeTileDefinition(definition));
}

function normalizeTileDefinition(definition: TileDefinition): TileDefinition {
  return {
    ...definition,
    passability: definition.passability ?? "passable",
    tags: definition.tags ?? []
  };
}

function normalizeEntityDefinition(definition: EntityDefinition): EntityDefinition {
  const legacyProfile = definition.profile as (EntityDefinition["profile"] & { skills?: string[] }) | undefined;
  const profile: NonNullable<EntityDefinition["profile"]> = {};
  if (legacyProfile?.stats) {
    profile.stats = legacyProfile.stats;
  }

  const skillIds = legacyProfile?.skillIds ?? (legacyProfile?.skills as NonNullable<EntityDefinition["profile"]>["skillIds"] | undefined);
  if (skillIds && skillIds.length > 0) {
    profile.skillIds = skillIds;
  }

  if (legacyProfile?.traitIds && legacyProfile.traitIds.length > 0) {
    profile.traitIds = legacyProfile.traitIds;
  }

  const normalized: EntityDefinition = {
    ...definition,
    placement: definition.placement ?? "multiple"
  };
  if (Object.keys(profile).length > 0) {
    normalized.profile = profile;
  } else {
    delete normalized.profile;
  }

  return normalized;
}
function normalizeMapDefinition(map: MapDefinition | RawMapDefinition): MapDefinition {
  if ("tileLayers" in map) {
    return map;
  }

  const { tileIds, layerId, layerName, ...rest } = map;

  return {
    ...rest,
    tileLayers: [
      createTileLayer(
        map.id,
        map.width,
        map.height,
        tileIds,
        layerId,
        layerName
      )
    ]
  };
}

function normalizeDialogueDefinition(dialogue: DialogueDefinition | RawDialogueDefinition): DialogueDefinition {
  if ("nodes" in dialogue) {
    return dialogue;
  }

  return createSingleNodeDialogue(dialogue.id, dialogue.speaker, dialogue.text, dialogue.continueLabel, dialogue.categoryId);
}

function createTileLayer(
  mapId: MapDefinition["id"],
  width: number,
  height: number,
  tileIds: readonly string[],
  layerId?: string,
  layerName?: string
): MapDefinition["tileLayers"][number] {
  return {
    id: layerId ?? `${mapId}_base`,
    name: layerName ?? "Base",
    width,
    height,
    tileIds: [...tileIds]
  };
}

function createSingleNodeDialogue(
  id: DialogueDefinition["id"],
  speaker: string,
  text: string,
  continueLabel = "Continue",
  categoryId?: DialogueDefinition["categoryId"]
): DialogueDefinition {
  return {
    id,
    ...(categoryId ? { categoryId } : {}),
    nodes: [
      {
        id: `${id}_node_1`,
        speaker,
        text,
        choices: [{ id: `${id}_close`, label: continueLabel }]
      }
    ]
  };
}

function pushDuplicateIdIssues(
  path: string,
  values:
    | RegionDefinition[]
    | AdventurePackage["libraryCategories"]
    | AdventurePackage["skillDefinitions"]
    | AdventurePackage["traitDefinitions"]
    | AdventurePackage["spellDefinitions"]
    | AdventurePackage["flagDefinitions"]
    | AdventurePackage["customLibraryObjects"]
    | MapDefinition[]
    | EntityDefinition[]
    | ItemDefinition[]
    | TileDefinition[]
    | QuestDefinition[]
    | DialogueDefinition[]
    | TriggerDefinition[]
    | undefined,
  issues: ValidationIssue[]
): void {
  const seen = new Set<string>();

  for (const [index, value] of (values ?? []).entries()) {
    if (seen.has(value.id)) {
      issues.push({
        severity: "error",
        code: "duplicate_id",
        message: `Duplicate id '${value.id}' found in ${path}.`,
        path: `${path}[${index}].id`
      });
      continue;
    }

    seen.add(value.id);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
