import {
  CURRENT_ADVENTURE_SCHEMA_VERSION,
  type AdventurePackage,
  type DialogueDefinition,
  type EntityDefinition,
  type ItemDefinition,
  type MapDefinition,
  type QuestDefinition,
  type RegionDefinition,
  type TriggerDefinition
} from "@acs/domain";

export type RawMapDefinition = Omit<MapDefinition, "tileLayers"> & {
  tileIds: readonly string[];
  layerId?: string;
  layerName?: string;
};

export type RawDialogueDefinition = {
  id: DialogueDefinition["id"];
  speaker: string;
  text: string;
  continueLabel?: string;
};

export type RawAdventurePackage = Omit<AdventurePackage, "maps" | "dialogue" | "entityDefinitions"> & {
  maps: Array<MapDefinition | RawMapDefinition>;
  dialogue: Array<DialogueDefinition | RawDialogueDefinition>;
  entityDefinitions: EntityDefinition[];
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
    rules: {
      simulationMode: "turn-based",
      movementModel: "grid-step",
      combatModel: "simple-tactical",
      inventoryModel: "slotless"
    },
    regions: [],
    maps: [],
    entityDefinitions: [],
    entityInstances: [],
    itemDefinitions: [],
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
  pushDuplicateIdIssues("entityDefinitions", pkg.entityDefinitions, issues);
  pushDuplicateIdIssues("itemDefinitions", pkg.itemDefinitions, issues);
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
    maps: (candidate.maps ?? []).map((map) => normalizeMapDefinition(map)),
    entityDefinitions: (candidate.entityDefinitions ?? []).map((definition) => normalizeEntityDefinition(definition)),
    dialogue: (candidate.dialogue ?? []).map((dialogue) => normalizeDialogueDefinition(dialogue))
  } as AdventurePackage;
}

function normalizeEntityDefinition(definition: EntityDefinition): EntityDefinition {
  return {
    ...definition,
    placement: definition.placement ?? "multiple"
  };
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

  return createSingleNodeDialogue(dialogue.id, dialogue.speaker, dialogue.text, dialogue.continueLabel);
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
  continueLabel = "Continue"
): DialogueDefinition {
  return {
    id,
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
    | MapDefinition[]
    | EntityDefinition[]
    | ItemDefinition[]
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


