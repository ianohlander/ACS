import { validateAdventurePackage } from "@acs/content-schema";
export function validateAdventure(pkg) {
    const issues = [...validateAdventurePackage(pkg)];
    issues.push(...validateMapRegions(pkg));
    issues.push(...validateMapGeometry(pkg));
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
function validateMapRegions(pkg) {
    const issues = [];
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
function validateMapGeometry(pkg) {
    const issues = [];
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
function validateVisualManifests(pkg) {
    const issues = [];
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
    const tileSpriteIds = new Set();
    const entitySpriteIds = new Set();
    for (const manifest of classicManifests) {
        for (const tileId of Object.keys(manifest.tileSprites)) {
            tileSpriteIds.add(tileId);
        }
        for (const entitySpriteId of Object.keys(manifest.entitySprites)) {
            entitySpriteIds.add(entitySpriteId);
        }
    }
    const seenTileIds = new Set();
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
function validateStartState(pkg) {
    const issues = [];
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
function validateExits(pkg) {
    const issues = [];
    const mapsById = new Map(pkg.maps.map((map) => [map.id, map]));
    for (const [mapIndex, map] of pkg.maps.entries()) {
        const seenExitCoords = new Set();
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
function validateEntities(pkg) {
    const issues = [];
    const mapsById = new Map(pkg.maps.map((map) => [map.id, map]));
    const occupiedByMap = new Map();
    const instanceCountByDefinitionId = new Map();
    for (const [index, entity] of pkg.entityInstances.entries()) {
        instanceCountByDefinitionId.set(entity.definitionId, (instanceCountByDefinitionId.get(entity.definitionId) ?? 0) + 1);
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
        const occupied = occupiedByMap.get(entity.mapId) ?? new Set();
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
function validateDialogue(pkg) {
    const issues = [];
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
        const nodeIds = new Set();
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
function validateTriggers(pkg) {
    const issues = [];
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
            switch (action.type) {
                case "showDialogue":
                    if (!dialogueIds.has(action.dialogueId)) {
                        issues.push({
                            severity: "error",
                            code: "unknown_action_dialogue",
                            message: `Trigger '${trigger.id}' references missing dialogue '${action.dialogueId}'.`,
                            path: `triggers[${triggerIndex}].actions[${actionIndex}]`
                        });
                    }
                    break;
                case "giveItem":
                    if (!itemIds.has(action.itemId)) {
                        issues.push({
                            severity: "error",
                            code: "unknown_action_item",
                            message: `Trigger '${trigger.id}' references missing item '${action.itemId}'.`,
                            path: `triggers[${triggerIndex}].actions[${actionIndex}]`
                        });
                    }
                    break;
                case "teleport": {
                    const targetMap = mapsById.get(action.mapId);
                    if (!targetMap) {
                        issues.push({
                            severity: "error",
                            code: "unknown_action_map",
                            message: `Trigger '${trigger.id}' references missing teleport target map '${action.mapId}'.`,
                            path: `triggers[${triggerIndex}].actions[${actionIndex}]`
                        });
                        break;
                    }
                    if (!isWithinMap(targetMap, action.x, action.y)) {
                        issues.push({
                            severity: "error",
                            code: "teleport_target_out_of_bounds",
                            message: `Trigger '${trigger.id}' teleports outside the bounds of map '${targetMap.id}'.`,
                            path: `triggers[${triggerIndex}].actions[${actionIndex}]`
                        });
                    }
                    break;
                }
                case "changeTile": {
                    const targetMap = mapsById.get(action.mapId);
                    if (!targetMap) {
                        issues.push({
                            severity: "error",
                            code: "unknown_change_tile_map",
                            message: `Trigger '${trigger.id}' references missing map '${action.mapId}' for a changeTile action.`,
                            path: `triggers[${triggerIndex}].actions[${actionIndex}]`
                        });
                        break;
                    }
                    if (!isWithinMap(targetMap, action.x, action.y)) {
                        issues.push({
                            severity: "error",
                            code: "change_tile_out_of_bounds",
                            message: `Trigger '${trigger.id}' changes a tile outside the bounds of map '${targetMap.id}'.`,
                            path: `triggers[${triggerIndex}].actions[${actionIndex}]`
                        });
                    }
                    break;
                }
                default:
                    break;
            }
        }
    }
    return issues;
}
function requiresMapLocation(trigger) {
    return trigger.type === "onEnterTile" || trigger.type === "onInteractEntity";
}
function isWithinMap(map, x, y) {
    return x >= 0 && y >= 0 && x < map.width && y < map.height;
}
function dedupeIssues(issues) {
    const seen = new Set();
    const results = [];
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
function summarizeIssues(issues) {
    return issues.reduce((summary, issue) => {
        if (issue.severity === "error") {
            summary.errorCount += 1;
        }
        else {
            summary.warningCount += 1;
        }
        return summary;
    }, { errorCount: 0, warningCount: 0 });
}
//# sourceMappingURL=index.js.map