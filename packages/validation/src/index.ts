import { validateAdventurePackage, type ValidationIssue } from "@acs/content-schema";
import type { AdventurePackage, DialogueDefinition, MapDefinition, TriggerDefinition } from "@acs/domain";

export type { ValidationIssue } from "@acs/content-schema";

export interface ValidationSummary {
  errorCount: number;
  warningCount: number;
}

export interface ValidationReport {
  valid: boolean;
  blocking: boolean;
  issues: ValidationIssue[];
  summary: ValidationSummary;
}

export function validateAdventure(pkg: AdventurePackage): ValidationReport {
  const issues = [...validateAdventurePackage(pkg)];

  issues.push(...validateMapRegions(pkg));
  issues.push(...validateMapGeometry(pkg));
  issues.push(...validateLibraryClassifications(pkg));
  issues.push(...validateVisualManifests(pkg));
  issues.push(...validateStartState(pkg));
  issues.push(...validateExits(pkg));
  issues.push(...validateEntities(pkg));
  issues.push(...validateDialogue(pkg));
  issues.push(...validateTriggers(pkg));

  const dedupedIssues = dedupeIssues(issues);
  const summary = summarizeIssues(dedupedIssues);

  return {
    valid: summary.errorCount === 0,
    blocking: summary.errorCount > 0,
    issues: dedupedIssues,
    summary
  };
}

function validateMapRegions(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const regionIds = new Set(pkg.regions.map((region) => region.id));

  for (const [index, map] of pkg.maps.entries()) {
    if (map.regionId && !regionIds.has(map.regionId)) {
      issues.push({
        severity: "error",
        code: "unknown_map_region",
        message: `Map '${map.id}' references missing region '${map.regionId}'.`,
        path: `maps[${index}].regionId`
      });
    }
  }

  return issues;
}

function validateTileReference(pkg: AdventurePackage, tileId: string, path: string, issues: ValidationIssue[]): void {
  if (!tileId || tileId === "void") {
    return;
  }

  const tileIds = new Set((pkg.tileDefinitions ?? []).map((tile) => tile.id));
  if (!tileIds.has(tileId as AdventurePackage["tileDefinitions"][number]["id"])) {
    issues.push({
      severity: "warning",
      code: "unknown_tile_definition",
      message: `Tile '${tileId}' is used but has no tile definition.`,
      path
    });
  }
}

function validateMapGeometry(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [mapIndex, map] of pkg.maps.entries()) {
    if (map.tileLayers.length === 0) {
      issues.push({
        severity: "error",
        code: "missing_tile_layers",
        message: `Map '${map.id}' must define at least one tile layer.`,
        path: `maps[${mapIndex}].tileLayers`
      });
      continue;
    }

    for (const [layerIndex, layer] of map.tileLayers.entries()) {
      if (layer.width !== map.width || layer.height !== map.height) {
        issues.push({
          severity: "error",
          code: "tile_layer_size_mismatch",
          message: `Layer '${layer.id}' on map '${map.id}' must match the map dimensions ${map.width}x${map.height}.`,
          path: `maps[${mapIndex}].tileLayers[${layerIndex}]`
        });
      }

      for (const [tileIndex, tileId] of layer.tileIds.entries()) {
        validateTileReference(pkg, tileId, `maps[${mapIndex}].tileLayers[${layerIndex}].tileIds[${tileIndex}]`, issues);
      }

      const expectedTileCount = map.width * map.height;
      if (layer.tileIds.length !== expectedTileCount) {
        issues.push({
          severity: "error",
          code: "tile_count_mismatch",
          message: `Layer '${layer.id}' on map '${map.id}' must contain ${expectedTileCount} tile ids, but has ${layer.tileIds.length}.`,
          path: `maps[${mapIndex}].tileLayers[${layerIndex}].tileIds`
        });
      }
    }
  }

  return issues;
}
function validateLibraryClassifications(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const categoriesById = new Map((pkg.libraryCategories ?? []).map((category) => [category.id, category]));
  const categoryIds = new Set(categoriesById.keys());
  const skillIds = new Set((pkg.skillDefinitions ?? []).map((skill) => skill.id));
  const traitIds = new Set((pkg.traitDefinitions ?? []).map((trait) => trait.id));

  for (const [index, category] of (pkg.libraryCategories ?? []).entries()) {
    if (category.parentId && !categoryIds.has(category.parentId)) {
      issues.push({
        severity: "error",
        code: "unknown_library_category_parent",
        message: `Library category '${category.id}' references missing parent category '${category.parentId}'.`,
        path: `libraryCategories[${index}].parentId`
      });
    }

    const parent = category.parentId ? categoriesById.get(category.parentId) : undefined;
    if (parent && parent.kind !== category.kind) {
      issues.push({
        severity: "error",
        code: "library_category_parent_kind_mismatch",
        message: `Library category '${category.id}' is a ${category.kind} category but its parent '${category.parentId}' is a ${parent.kind} category.`,
        path: `libraryCategories[${index}].parentId`
      });
    }
  }

  const categorizedObjects = categorizedLibraryObjects(pkg);

  for (const object of categorizedObjects) {
    if (object.categoryId && !categoryIds.has(object.categoryId)) {
      issues.push({
        severity: "error",
        code: "unknown_library_category",
        message: `Library object '${object.id}' references missing category '${object.categoryId}'.`,
        path: object.path
      });
    }

    const category = object.categoryId ? categoriesById.get(object.categoryId) : undefined;
    if (category && category.kind !== object.expectedKind) {
      issues.push({
        severity: "error",
        code: "library_category_kind_mismatch",
        message: `Library object '${object.id}' is a ${object.expectedKind} but references ${category.kind} category '${object.categoryId}'.`,
        path: object.path
      });
    }
  }
  for (const [definitionIndex, definition] of pkg.entityDefinitions.entries()) {
    for (const [skillIndex, skillId] of (definition.profile?.skillIds ?? []).entries()) {
      if (!skillIds.has(skillId)) {
        issues.push({
          severity: "error",
          code: "unknown_entity_skill",
          message: `Entity definition '${definition.id}' references missing skill '${skillId}'.`,
          path: `entityDefinitions[${definitionIndex}].profile.skillIds[${skillIndex}]`
        });
      }
    }

    for (const [traitIndex, traitId] of (definition.profile?.traitIds ?? []).entries()) {
      if (!traitIds.has(traitId)) {
        issues.push({
          severity: "error",
          code: "unknown_entity_trait",
          message: `Entity definition '${definition.id}' references missing trait '${traitId}'.`,
          path: `entityDefinitions[${definitionIndex}].profile.traitIds[${traitIndex}]`
        });
      }
    }
  }

  return issues;
}
function categorizedLibraryObjects(pkg: AdventurePackage): Array<{
  path: string;
  id: string;
  categoryId: AdventurePackage["libraryCategories"][number]["id"] | undefined;
  expectedKind: string;
}> {
  return [
    ...pkg.entityDefinitions.map((value, index) => ({ path: `entityDefinitions[${index}].categoryId`, id: value.id, categoryId: value.categoryId, expectedKind: "entity" })),
    ...pkg.itemDefinitions.map((value, index) => ({ path: `itemDefinitions[${index}].categoryId`, id: value.id, categoryId: value.categoryId, expectedKind: "item" })),
    ...(pkg.tileDefinitions ?? []).map((value, index) => ({ path: `tileDefinitions[${index}].categoryId`, id: value.id, categoryId: value.categoryId, expectedKind: "tile" })),
    ...(pkg.skillDefinitions ?? []).map((value, index) => ({ path: `skillDefinitions[${index}].categoryId`, id: value.id, categoryId: value.categoryId, expectedKind: "skill" })),
    ...(pkg.traitDefinitions ?? []).map((value, index) => ({ path: `traitDefinitions[${index}].categoryId`, id: value.id, categoryId: value.categoryId, expectedKind: "trait" })),
    ...(pkg.spellDefinitions ?? []).map((value, index) => ({ path: `spellDefinitions[${index}].categoryId`, id: value.id, categoryId: value.categoryId, expectedKind: "spell" })),
    ...(pkg.flagDefinitions ?? []).map((value, index) => ({ path: `flagDefinitions[${index}].categoryId`, id: value.id, categoryId: value.categoryId, expectedKind: "flag" })),
    ...pkg.questDefinitions.map((value, index) => ({ path: `questDefinitions[${index}].categoryId`, id: value.id, categoryId: value.categoryId, expectedKind: "quest" })),
    ...pkg.dialogue.map((value, index) => ({ path: `dialogue[${index}].categoryId`, id: value.id, categoryId: value.categoryId, expectedKind: "dialogue" })),
    ...(pkg.customLibraryObjects ?? []).map((value, index) => ({ path: `customLibraryObjects[${index}].categoryId`, id: value.id, categoryId: value.categoryId, expectedKind: "custom" }))
  ];
}
function validateVisualManifests(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const manifests = pkg.visualManifests ?? [];
  const classicManifests = manifests.filter((manifest) => manifest.mode === "classic-acs");

  if (classicManifests.length === 0) {
    issues.push({
      severity: "warning",
      code: "missing_classic_visual_manifest",
      message: "Adventure does not define a classic-acs visual manifest; the classic renderer will use fallback sprites.",
      path: "visualManifests"
    });
    return issues;
  }

  const tileSpriteIds = new Set<string>();
  const entitySpriteIds = new Set<string>();

  for (const manifest of classicManifests) {
    for (const tileId of Object.keys(manifest.tileSprites)) {
      tileSpriteIds.add(tileId);
    }

    for (const entitySpriteId of Object.keys(manifest.entitySprites)) {
      entitySpriteIds.add(entitySpriteId);
    }
  }

  const seenTileIds = new Set<string>();
  for (const map of pkg.maps) {
    for (const layer of map.tileLayers) {
      for (const tileId of layer.tileIds) {
        if (!tileId || tileId === "void" || seenTileIds.has(tileId)) {
          continue;
        }

        seenTileIds.add(tileId);
        if (!tileSpriteIds.has(tileId)) {
          issues.push({
            severity: "warning",
            code: "missing_classic_tile_sprite",
            message: `Tile '${tileId}' has no classic sprite manifest entry; the renderer will use a fallback tile.`,
            path: "visualManifests[].tileSprites"
          });
        }
      }
    }
  }

  for (const [index, definition] of pkg.entityDefinitions.entries()) {
    if (!definition.assetId) {
      continue;
    }

    if (!entitySpriteIds.has(String(definition.assetId))) {
      issues.push({
        severity: "warning",
        code: "missing_classic_entity_sprite",
        message: `Entity definition '${definition.id}' references assetId '${definition.assetId}', but no classic entity sprite uses that key.`,
        path: `entityDefinitions[${index}].assetId`
      });
    }
  }

  return issues;
}
function validateStartState(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const startMap = pkg.maps.find((map) => map.id === pkg.startState.mapId);
  if (!startMap) {
    return issues;
  }

  if (!isWithinMap(startMap, pkg.startState.x, pkg.startState.y)) {
    issues.push({
      severity: "error",
      code: "start_position_out_of_bounds",
      message: `The start position (${pkg.startState.x}, ${pkg.startState.y}) is outside map '${startMap.id}'.`,
      path: "startState"
    });
  }

  const entityDefinitionIds = new Set(pkg.entityDefinitions.map((definition) => definition.id));
  for (const [index, partyMemberId] of pkg.startState.party.entries()) {
    if (!entityDefinitionIds.has(partyMemberId)) {
      issues.push({
        severity: "error",
        code: "unknown_start_party_member",
        message: `startState.party references missing entity definition '${partyMemberId}'.`,
        path: `startState.party[${index}]`
      });
    }
  }

  return issues;
}

function validateExits(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mapsById = new Map(pkg.maps.map((map) => [map.id, map]));

  for (const [mapIndex, map] of pkg.maps.entries()) {
    const seenExitCoords = new Set<string>();
    for (const [exitIndex, exit] of map.exits.entries()) {
      if (!isWithinMap(map, exit.x, exit.y)) {
        issues.push({
          severity: "error",
          code: "exit_source_out_of_bounds",
          message: `Exit '${exit.id}' is outside the bounds of map '${map.id}'.`,
          path: `maps[${mapIndex}].exits[${exitIndex}]`
        });
      }

      const coordKey = `${exit.x},${exit.y}`;
      if (seenExitCoords.has(coordKey)) {
        issues.push({
          severity: "warning",
          code: "overlapping_exits",
          message: `Map '${map.id}' contains multiple exits at (${exit.x}, ${exit.y}).`,
          path: `maps[${mapIndex}].exits[${exitIndex}]`
        });
      }
      seenExitCoords.add(coordKey);

      const targetMap = mapsById.get(exit.toMapId);
      if (!targetMap) {
        issues.push({
          severity: "error",
          code: "unknown_exit_target_map",
          message: `Exit '${exit.id}' references missing target map '${exit.toMapId}'.`,
          path: `maps[${mapIndex}].exits[${exitIndex}].toMapId`
        });
        continue;
      }

      if (!isWithinMap(targetMap, exit.toX, exit.toY)) {
        issues.push({
          severity: "error",
          code: "exit_target_out_of_bounds",
          message: `Exit '${exit.id}' targets (${exit.toX}, ${exit.toY}) outside map '${targetMap.id}'.`,
          path: `maps[${mapIndex}].exits[${exitIndex}]`
        });
      }
    }
  }

  return issues;
}

function validateEntities(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mapsById = new Map(pkg.maps.map((map) => [map.id, map]));
  const itemIds = new Set(pkg.itemDefinitions.map((item) => item.id));

  const occupiedByMap = new Map<string, Set<string>>();
  const instanceCountByDefinitionId = new Map<string, number>();

  for (const [index, entity] of pkg.entityInstances.entries()) {
    instanceCountByDefinitionId.set(
      entity.definitionId,
      (instanceCountByDefinitionId.get(entity.definitionId) ?? 0) + 1
    );

    const map = mapsById.get(entity.mapId);
    if (!map) {
      continue;
    }

    if (!isWithinMap(map, entity.x, entity.y)) {
      issues.push({
        severity: "error",
        code: "entity_out_of_bounds",
        message: `Entity '${entity.id}' is placed outside the bounds of map '${map.id}'.`,
        path: `entityInstances[${index}]`
      });
      continue;
    }

    const occupied = occupiedByMap.get(entity.mapId) ?? new Set<string>();
    const coordKey = `${entity.x},${entity.y}`;
    if (occupied.has(coordKey)) {
      issues.push({
        severity: "warning",
        code: "entity_overlap",
        message: `Multiple entities are placed at (${entity.x}, ${entity.y}) on map '${map.id}'.`,
        path: `entityInstances[${index}]`
      });
    }

    occupied.add(coordKey);
    occupiedByMap.set(entity.mapId, occupied);
  }

  for (const [definitionIndex, definition] of pkg.entityDefinitions.entries()) {
    const placement = definition.placement ?? "multiple";
    if (placement !== "singleton" && placement !== "multiple") {
      issues.push({
        severity: "error",
        code: "invalid_entity_placement",
        message: `Entity definition '${definition.id}' has invalid placement '${String(placement)}'.`,
        path: `entityDefinitions[${definitionIndex}].placement`
      });
      continue;
    }

    const stats = definition.profile?.stats;
    for (const [statName, value] of Object.entries(stats ?? {})) {
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        issues.push({
          severity: "error",
          code: "invalid_entity_profile_stat",
          message: `Entity definition '${definition.id}' has invalid profile stat '${statName}' with value '${String(value)}'. Use a non-negative whole number.`,
          path: `entityDefinitions[${definitionIndex}].profile.stats.${statName}`
        });
      }
    }

    for (const [possessionIndex, possession] of (definition.startingPossessions ?? []).entries()) {
      if (!itemIds.has(possession.itemId)) {
        issues.push({
          severity: "error",
          code: "unknown_entity_starting_possession",
          message: `Entity definition '${definition.id}' starts with missing item '${possession.itemId}'.`,
          path: `entityDefinitions[${definitionIndex}].startingPossessions[${possessionIndex}].itemId`
        });
      }

      if (possession.quantity !== undefined && (!Number.isInteger(possession.quantity) || possession.quantity < 1)) {
        issues.push({
          severity: "error",
          code: "invalid_entity_starting_possession_quantity",
          message: `Entity definition '${definition.id}' has invalid starting possession quantity '${String(possession.quantity)}'. Use a positive whole number.`,
          path: `entityDefinitions[${definitionIndex}].startingPossessions[${possessionIndex}].quantity`
        });
      }
    }

    const behavior = definition.behavior;
    if (behavior && typeof behavior !== "string" && behavior.turnInterval !== undefined && (!Number.isInteger(behavior.turnInterval) || behavior.turnInterval < 1)) {
      issues.push({
        severity: "error",
        code: "invalid_behavior_turn_interval",
        message: `Entity definition '${definition.id}' has invalid behavior.turnInterval '${String(behavior.turnInterval)}'. Use a positive whole number.`,
        path: `entityDefinitions[${definitionIndex}].behavior.turnInterval`
      });
    }

    if (placement === "singleton") {
      const count = instanceCountByDefinitionId.get(definition.id) ?? 0;
      if (count > 1) {
        issues.push({
          severity: "error",
          code: "singleton_entity_duplicated",
          message: `Entity definition '${definition.id}' is singleton but has ${count} placed instances.`,
          path: `entityDefinitions[${definitionIndex}].placement`
        });
      }
    }
  }


  return issues;
}

function validateDialogue(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [dialogueIndex, dialogue] of pkg.dialogue.entries()) {
    if (dialogue.nodes.length === 0) {
      issues.push({
        severity: "error",
        code: "empty_dialogue",
        message: `Dialogue '${dialogue.id}' must contain at least one node.`,
        path: `dialogue[${dialogueIndex}].nodes`
      });
      continue;
    }

    const nodeIds = new Set<string>();
    for (const [nodeIndex, node] of dialogue.nodes.entries()) {
      if (nodeIds.has(node.id)) {
        issues.push({
          severity: "error",
          code: "duplicate_dialogue_node",
          message: `Dialogue '${dialogue.id}' contains duplicate node id '${node.id}'.`,
          path: `dialogue[${dialogueIndex}].nodes[${nodeIndex}].id`
        });
      }
      nodeIds.add(node.id);
    }

    for (const [nodeIndex, node] of dialogue.nodes.entries()) {
      for (const [choiceIndex, choice] of (node.choices ?? []).entries()) {
        if (choice.nextNodeId && !nodeIds.has(choice.nextNodeId)) {
          issues.push({
            severity: "error",
            code: "unknown_dialogue_next_node",
            message: `Dialogue '${dialogue.id}' choice '${choice.id}' references missing node '${choice.nextNodeId}'.`,
            path: `dialogue[${dialogueIndex}].nodes[${nodeIndex}].choices[${choiceIndex}].nextNodeId`
          });
        }
      }
    }
  }

  return issues;
}

function validateTriggers(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mapsById = new Map(pkg.maps.map((map) => [map.id, map]));
  const dialogueIds = new Set(pkg.dialogue.map((dialogue) => dialogue.id));
  const itemIds = new Set(pkg.itemDefinitions.map((item) => item.id));
  const questIds = new Set(pkg.questDefinitions.map((quest) => quest.id));

  for (const [triggerIndex, trigger] of pkg.triggers.entries()) {
    const map = trigger.mapId ? mapsById.get(trigger.mapId) : undefined;

    if (requiresMapLocation(trigger) && (!trigger.mapId || typeof trigger.x !== "number" || typeof trigger.y !== "number")) {
      issues.push({
        severity: "error",
        code: "trigger_location_required",
        message: `Trigger '${trigger.id}' of type '${trigger.type}' must define mapId, x, and y.`,
        path: `triggers[${triggerIndex}]`
      });
    }

    if (map && typeof trigger.x === "number" && typeof trigger.y === "number" && !isWithinMap(map, trigger.x, trigger.y)) {
      issues.push({
        severity: "error",
        code: "trigger_out_of_bounds",
        message: `Trigger '${trigger.id}' is outside the bounds of map '${map.id}'.`,
        path: `triggers[${triggerIndex}]`
      });
    }

    for (const [conditionIndex, condition] of trigger.conditions.entries()) {
      switch (condition.type) {
        case "hasItem":
          if (!itemIds.has(condition.itemId)) {
            issues.push({
              severity: "error",
              code: "unknown_condition_item",
              message: `Trigger '${trigger.id}' references missing item '${condition.itemId}' in a hasItem condition.`,
              path: `triggers[${triggerIndex}].conditions[${conditionIndex}]`
            });
          }
          break;
        case "questStageAtLeast": {
          if (!questIds.has(condition.questId)) {
            issues.push({
              severity: "error",
              code: "unknown_condition_quest",
              message: `Trigger '${trigger.id}' references missing quest '${condition.questId}' in a questStageAtLeast condition.`,
              path: `triggers[${triggerIndex}].conditions[${conditionIndex}]`
            });
            break;
          }

          const quest = pkg.questDefinitions.find((candidate) => candidate.id === condition.questId);
          if (quest && condition.stage >= quest.stages.length) {
            issues.push({
              severity: "warning",
              code: "quest_stage_condition_out_of_range",
              message: `Trigger '${trigger.id}' checks stage ${condition.stage} for quest '${condition.questId}', which only defines ${quest.stages.length} stages.`,
              path: `triggers[${triggerIndex}].conditions[${conditionIndex}].stage`
            });
          }
          break;
        }
        default:
          break;
      }
    }

    for (const [actionIndex, action] of trigger.actions.entries()) {
      issues.push(...validateTriggerAction(pkg, mapsById, dialogueIds, itemIds, questIds, trigger, triggerIndex, action, actionIndex));
    }
  }

  return issues;
}


function validateTriggerAction(
  pkg: AdventurePackage,
  mapsById: Map<MapDefinition["id"], MapDefinition>,
  dialogueIds: Set<AdventurePackage["dialogue"][number]["id"]>,
  itemIds: Set<AdventurePackage["itemDefinitions"][number]["id"]>,
  questIds: Set<AdventurePackage["questDefinitions"][number]["id"]>,
  trigger: TriggerDefinition,
  triggerIndex: number,
  action: TriggerDefinition["actions"][number],
  actionIndex: number
): ValidationIssue[] {
  switch (action.type) {
    case "showDialogue":
      return dialogueIds.has(action.dialogueId) ? [] : [unknownActionIssue("unknown_action_dialogue", trigger, triggerIndex, actionIndex, `Trigger '${trigger.id}' references missing dialogue '${action.dialogueId}'.`)];
    case "giveItem":
      return itemIds.has(action.itemId) ? [] : [unknownActionIssue("unknown_action_item", trigger, triggerIndex, actionIndex, `Trigger '${trigger.id}' references missing item '${action.itemId}'.`)];
    case "teleport":
      return validateTeleportAction(mapsById, trigger, triggerIndex, action, actionIndex);
    case "setQuestStage":
      return validateQuestStageAction(pkg, questIds, trigger, triggerIndex, action, actionIndex);
    case "changeTile":
      return validateChangeTileAction(pkg, mapsById, trigger, triggerIndex, action, actionIndex);
    default:
      return [];
  }
}

function validateTeleportAction(
  mapsById: Map<MapDefinition["id"], MapDefinition>,
  trigger: TriggerDefinition,
  triggerIndex: number,
  action: Extract<TriggerDefinition["actions"][number], { type: "teleport" }>,
  actionIndex: number
): ValidationIssue[] {
  const targetMap = mapsById.get(action.mapId);
  if (!targetMap) {
    return [unknownActionIssue("unknown_action_map", trigger, triggerIndex, actionIndex, `Trigger '${trigger.id}' references missing teleport target map '${action.mapId}'.`)];
  }
  return isWithinMap(targetMap, action.x, action.y) ? [] : [unknownActionIssue("teleport_target_out_of_bounds", trigger, triggerIndex, actionIndex, `Trigger '${trigger.id}' teleports outside the bounds of map '${targetMap.id}'.`)];
}

function validateQuestStageAction(
  pkg: AdventurePackage,
  questIds: Set<AdventurePackage["questDefinitions"][number]["id"]>,
  trigger: TriggerDefinition,
  triggerIndex: number,
  action: Extract<TriggerDefinition["actions"][number], { type: "setQuestStage" }>,
  actionIndex: number
): ValidationIssue[] {
  if (!questIds.has(action.questId)) {
    return [unknownActionIssue("unknown_action_quest", trigger, triggerIndex, actionIndex, `Trigger '${trigger.id}' references missing quest '${action.questId}' in a setQuestStage action.`)];
  }
  const quest = pkg.questDefinitions.find((candidate) => candidate.id === action.questId);
  return quest && action.stage >= quest.stages.length ? [{ severity: "warning", code: "quest_stage_action_out_of_range", message: `Trigger '${trigger.id}' sets stage ${action.stage} for quest '${action.questId}', which only defines ${quest.stages.length} stages.`, path: `triggers[${triggerIndex}].actions[${actionIndex}].stage` }] : [];
}

function validateChangeTileAction(
  pkg: AdventurePackage,
  mapsById: Map<MapDefinition["id"], MapDefinition>,
  trigger: TriggerDefinition,
  triggerIndex: number,
  action: Extract<TriggerDefinition["actions"][number], { type: "changeTile" }>,
  actionIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  validateTileReference(pkg, action.tileId, `triggers[${triggerIndex}].actions[${actionIndex}].tileId`, issues);
  const targetMap = mapsById.get(action.mapId);
  if (!targetMap) {
    issues.push(unknownActionIssue("unknown_change_tile_map", trigger, triggerIndex, actionIndex, `Trigger '${trigger.id}' references missing map '${action.mapId}' for a changeTile action.`));
    return issues;
  }
  if (!isWithinMap(targetMap, action.x, action.y)) {
    issues.push(unknownActionIssue("change_tile_out_of_bounds", trigger, triggerIndex, actionIndex, `Trigger '${trigger.id}' changes a tile outside the bounds of map '${targetMap.id}'.`));
  }
  return issues;
}

function unknownActionIssue(code: string, trigger: TriggerDefinition, triggerIndex: number, actionIndex: number, message: string): ValidationIssue {
  return { severity: "error", code, message, path: `triggers[${triggerIndex}].actions[${actionIndex}]` };
}
function requiresMapLocation(trigger: TriggerDefinition): boolean {
  return trigger.type === "onEnterTile" || trigger.type === "onInteractEntity";
}

function isWithinMap(map: MapDefinition, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

function dedupeIssues(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();
  const results: ValidationIssue[] = [];

  for (const issue of issues) {
    const key = `${issue.severity}|${issue.code}|${issue.path ?? ""}|${issue.message}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push(issue);
  }

  return results;
}

function summarizeIssues(issues: ValidationIssue[]): ValidationSummary {
  return issues.reduce<ValidationSummary>(
    (summary, issue) => {
      if (issue.severity === "error") {
        summary.errorCount += 1;
      } else {
        summary.warningCount += 1;
      }

      return summary;
    },
    { errorCount: 0, warningCount: 0 }
  );
}
