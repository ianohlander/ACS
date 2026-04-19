import type { DialogueDefinition, ItemDefId, MapId, QuestId, TriggerDefinition } from "@acs/domain";

import { assertNever } from "./assert.js";
import type { EngineEvent, GameSessionState } from "./types.js";

interface TriggerSystemOptions {
  triggers: TriggerDefinition[];
  state: GameSessionState;
  dialoguesById: Map<DialogueDefinition["id"], DialogueDefinition>;
}

export class TriggerSystem {
  private readonly triggers: TriggerDefinition[];
  private readonly state: GameSessionState;
  private readonly dialoguesById: Map<DialogueDefinition["id"], DialogueDefinition>;

  constructor(options: TriggerSystemOptions) {
    this.triggers = options.triggers;
    this.state = options.state;
    this.dialoguesById = options.dialoguesById;
  }

  runMapLoadTriggers(): EngineEvent[] {
    return this.runTriggers("onMapLoad");
  }

  runTileTriggers(): EngineEvent[] {
    return this.runTriggers("onEnterTile", this.state.player.x, this.state.player.y);
  }

  runTriggers(type: TriggerDefinition["type"], x?: number, y?: number): EngineEvent[] {
    const events: EngineEvent[] = [];

    for (const trigger of this.triggers) {
      events.push(...this.runMatchingTrigger(trigger, type, x, y));
    }

    return events;
  }

  private runMatchingTrigger(
    trigger: TriggerDefinition,
    type: TriggerDefinition["type"],
    x?: number,
    y?: number
  ): EngineEvent[] {
    if (!this.shouldRunTrigger(trigger, type, x, y)) {
      return [];
    }

    const events: EngineEvent[] = [{ type: "triggerFired", triggerId: trigger.id }];
    events.push(...this.applyTriggerActions(trigger));

    if (trigger.runOnce) {
      this.state.completedTriggers.push(trigger.id);
    }

    return events;
  }

  private shouldRunTrigger(trigger: TriggerDefinition, type: TriggerDefinition["type"], x?: number, y?: number): boolean {
    return (
      trigger.type === type &&
      !this.hasCompletedRunOnceTrigger(trigger) &&
      this.matchesMap(trigger) &&
      this.matchesLocation(trigger, x, y) &&
      conditionsMatch(trigger, this.state)
    );
  }

  private hasCompletedRunOnceTrigger(trigger: TriggerDefinition): boolean {
    return Boolean(trigger.runOnce && this.state.completedTriggers.includes(trigger.id));
  }

  private matchesMap(trigger: TriggerDefinition): boolean {
    return !trigger.mapId || trigger.mapId === this.state.currentMapId;
  }

  private matchesLocation(trigger: TriggerDefinition, x?: number, y?: number): boolean {
    return coordinateMatches(trigger.x, x) && coordinateMatches(trigger.y, y);
  }

  private applyTriggerActions(trigger: TriggerDefinition): EngineEvent[] {
    return trigger.actions.flatMap((action) => {
      switch (action.type) {
        case "showDialogue":
          return this.showDialogue(action.dialogueId);
        case "setFlag":
          this.state.flags[action.flag] = action.value;
          return [{ type: "flagSet", flag: action.flag, value: action.value }];
        case "giveItem":
          return this.giveItem(action.itemId, action.quantity ?? 1);
        case "teleport":
          return this.teleport(action.mapId, action.x, action.y);
        case "changeTile":
          return this.changeTile(action.mapId, action.x, action.y, action.tileId);
        case "setQuestStage":
          return this.setQuestStage(action.questId, action.stage);
        default:
          return assertNever(action);
      }
    });
  }

  private showDialogue(dialogueId: DialogueDefinition["id"]): EngineEvent[] {
    const dialogue = this.dialoguesById.get(dialogueId);
    const firstNode = dialogue?.nodes[0];

    if (!dialogue || !firstNode) {
      return [{ type: "commandIgnored", reason: `Dialogue '${dialogueId}' is missing or empty.` }];
    }

    this.state.activeDialogue = { dialogueId: dialogue.id, nodeId: firstNode.id };
    return [{ type: "dialogueStarted", dialogueId: dialogue.id, nodeId: firstNode.id }];
  }

  private giveItem(itemId: ItemDefId, quantity: number): EngineEvent[] {
    this.state.inventory[itemId] = (this.state.inventory[itemId] ?? 0) + quantity;
    return [{ type: "itemGranted", itemId, quantity }];
  }

  private teleport(mapId: MapId, x: number, y: number): EngineEvent[] {
    this.state.currentMapId = mapId;
    this.state.player.x = x;
    this.state.player.y = y;
    return [{ type: "teleported", mapId, x, y }];
  }

  private changeTile(mapId: MapId, x: number, y: number, tileId: string): EngineEvent[] {
    const key = toTileOverrideKey(mapId, x, y);
    this.state.tileOverrides[key] = { tileId };
    return [{ type: "tileChanged", mapId, x, y, tileId }];
  }

  private setQuestStage(questId: QuestId, stage: number): EngineEvent[] {
    this.state.questStages[questId] = stage;
    return [{ type: "questStageSet", questId, stage }];
  }
}

function coordinateMatches(triggerCoordinate: number | undefined, commandCoordinate: number | undefined): boolean {
  return typeof commandCoordinate !== "number" || typeof triggerCoordinate !== "number" || triggerCoordinate === commandCoordinate;
}

function conditionsMatch(trigger: TriggerDefinition, state: GameSessionState): boolean {
  return trigger.conditions.every((condition) => {
    switch (condition.type) {
      case "flagEquals":
        return state.flags[condition.flag] === condition.value;
      case "hasItem": {
        const quantity = state.inventory[condition.itemId] ?? 0;
        return quantity >= (condition.quantity ?? 1);
      }
      case "questStageAtLeast": {
        const stage = state.questStages[condition.questId] ?? 0;
        return stage >= condition.stage;
      }
      default:
        return assertNever(condition);
    }
  });
}

function toTileOverrideKey(mapId: MapId, x: number, y: number): string {
  return `${mapId}:${x},${y}`;
}

