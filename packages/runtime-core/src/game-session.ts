import type {
  AdventurePackage,
  DialogueDefinition,
  EntityDefinition,
  EntityInstance,
  ItemDefId,
  MapDefinition,
  MapId,
  TriggerDefinition
} from "@acs/domain";

import { assertNever } from "./assert.js";
import { EnemyTurnSystem } from "./enemy-turn-system.js";
import { directionToDelta, isWithinBounds, manhattanDistance } from "./movement.js";
import { createInitialState, hydrateState } from "./state-factory.js";
import { TriggerSystem } from "./trigger-system.js";
import type {
  CardinalDirection,
  EngineEvent,
  EngineResult,
  GameSession,
  GameSessionState,
  PlayerCommand,
  RuntimeEntityState,
  RuntimeSnapshot
} from "./types.js";

export class RuntimeGameSession implements GameSession {
  private readonly mapsById: Map<MapId, MapDefinition>;
  private readonly dialoguesById: Map<DialogueDefinition["id"], DialogueDefinition>;
  private readonly entityDefinitionsById: Map<EntityDefinition["id"], EntityDefinition>;
  private readonly entityInstancesById: Map<EntityInstance["id"], EntityInstance>;
  private readonly state: GameSessionState;
  private readonly triggerSystem: TriggerSystem;
  private readonly enemyTurnSystem: EnemyTurnSystem;

  constructor(pkg: AdventurePackage, snapshot?: RuntimeSnapshot) {
    this.mapsById = new Map(pkg.maps.map((map) => [map.id, map]));
    this.dialoguesById = new Map(pkg.dialogue.map((dialogue) => [dialogue.id, dialogue]));
    this.entityDefinitionsById = new Map(pkg.entityDefinitions.map((definition) => [definition.id, definition]));
    this.entityInstancesById = new Map(pkg.entityInstances.map((instance) => [instance.id, instance]));
    this.state = snapshot ? hydrateState(pkg, snapshot) : createInitialState(pkg);
    this.triggerSystem = this.createTriggerSystem(pkg.triggers);
    this.enemyTurnSystem = this.createEnemyTurnSystem();

    this.triggerSystem.runMapLoadTriggers();
  }

  dispatch(command: PlayerCommand): EngineResult {
    const events: EngineEvent[] = [];
    const consumesTurn = this.dispatchPlayerCommand(command, events);

    if (consumesTurn) {
      this.advanceTurn(events);
    }

    return { state: this.getState(), events };
  }

  getState(): Readonly<GameSessionState> {
    return this.state;
  }

  serializeSnapshot(): RuntimeSnapshot {
    const {
      adventureId,
      schemaVersion,
      currentMapId,
      player,
      inventory,
      flags,
      questStages,
      entities,
      tileOverrides,
      completedTriggers,
      activeDialogue,
      turn
    } = this.state;

    return {
      adventureId,
      schemaVersion,
      currentMapId,
      player: { ...player, party: [...player.party] },
      inventory: { ...inventory },
      flags: { ...flags },
      questStages: { ...questStages },
      entities: entities.map((entity) => ({ ...entity })),
      tileOverrides: { ...tileOverrides },
      completedTriggers: [...completedTriggers],
      activeDialogue: activeDialogue ? { ...activeDialogue } : undefined,
      turn
    };
  }

  private createTriggerSystem(triggers: TriggerDefinition[]): TriggerSystem {
    return new TriggerSystem({ triggers, state: this.state, dialoguesById: this.dialoguesById });
  }

  private createEnemyTurnSystem(): EnemyTurnSystem {
    return new EnemyTurnSystem({
      state: this.state,
      mapsById: this.mapsById,
      entityDefinitionsById: this.entityDefinitionsById,
      entityInstancesById: this.entityInstancesById
    });
  }

  private dispatchPlayerCommand(command: PlayerCommand, events: EngineEvent[]): boolean {
    switch (command.type) {
      case "move":
        return this.handleMove(command.direction, events);
      case "interact":
        return this.handleInteract(command.direction, events);
      case "inspect":
        return this.handleInspect(command.direction, events);
      case "openMenu":
        events.push({ type: "menuOpened", menu: command.menu });
        return false;
      case "useItem":
        return this.handleUseItem(command.itemId, events);
      case "selectDialogueChoice":
        this.handleDialogueChoice(command.choiceId, events);
        return false;
      case "endTurn":
        return true;
      default:
        return assertNever(command);
    }
  }

  private advanceTurn(events: EngineEvent[]): void {
    this.state.turn += 1;
    events.push({ type: "turnEnded", turn: this.state.turn });
    events.push(...this.enemyTurnSystem.resolveEnemyPhase());
  }

  private handleMove(direction: CardinalDirection, events: EngineEvent[]): boolean {
    const delta = directionToDelta(direction);
    const currentMap = this.requireCurrentMap();
    const nextX = this.state.player.x + delta.x;
    const nextY = this.state.player.y + delta.y;

    if (!this.canPlayerMoveTo(currentMap, nextX, nextY, events)) {
      return false;
    }

    this.movePlayer(currentMap.id, nextX, nextY, events);
    this.resolveExitIfPresent(currentMap, nextX, nextY, events);
    events.push(...this.triggerSystem.runTileTriggers());
    return true;
  }

  private canPlayerMoveTo(currentMap: MapDefinition, nextX: number, nextY: number, events: EngineEvent[]): boolean {
    if (!isWithinBounds(currentMap, nextX, nextY)) {
      events.push({ type: "movementBlocked", reason: "bounds" });
      return false;
    }

    if (this.isOccupied(currentMap.id, nextX, nextY)) {
      events.push({ type: "movementBlocked", reason: "occupied" });
      return false;
    }

    return true;
  }

  private movePlayer(mapId: MapId, x: number, y: number, events: EngineEvent[]): void {
    this.state.player.x = x;
    this.state.player.y = y;
    events.push({ type: "playerMoved", mapId, x, y });
  }

  private resolveExitIfPresent(currentMap: MapDefinition, x: number, y: number, events: EngineEvent[]): void {
    const exit = currentMap.exits.find((candidate) => candidate.x === x && candidate.y === y);
    if (!exit) {
      return;
    }

    this.state.currentMapId = exit.toMapId;
    this.state.player.x = exit.toX;
    this.state.player.y = exit.toY;
    events.push({ type: "teleported", mapId: exit.toMapId, x: exit.toX, y: exit.toY });
    events.push(...this.triggerSystem.runMapLoadTriggers());
  }

  private handleInteract(direction: CardinalDirection | undefined, events: EngineEvent[]): boolean {
    const target = this.findEntityInDirection(direction);
    if (!target) {
      events.push({ type: "commandIgnored", reason: "No adjacent entity to interact with." });
      return false;
    }

    events.push({ type: "interactionTargetFound", entityId: target.id });
    events.push(...this.triggerSystem.runTriggers("onInteractEntity", target.x, target.y));
    return true;
  }

  private handleInspect(direction: CardinalDirection | undefined, events: EngineEvent[]): boolean {
    const target = this.findEntityInDirection(direction);
    const message = target ? `You inspect entity '${target.id}'.` : this.currentPositionInspectMessage();
    events.push({ type: "inspectResult", message });
    return true;
  }

  private currentPositionInspectMessage(): string {
    return `You inspect (${this.state.player.x}, ${this.state.player.y}) on map '${this.state.currentMapId}'.`;
  }

  private handleUseItem(itemId: ItemDefId, events: EngineEvent[]): boolean {
    const quantity = this.state.inventory[itemId] ?? 0;
    if (quantity < 1) {
      events.push({ type: "commandIgnored", reason: `Item '${itemId}' is not in inventory.` });
      return false;
    }

    events.push(...this.triggerSystem.runTriggers("onUseItem"));
    return true;
  }

  private handleDialogueChoice(choiceId: string, events: EngineEvent[]): void {
    const activeDialogue = this.state.activeDialogue;
    if (!activeDialogue) {
      events.push({ type: "commandIgnored", reason: "No active dialogue." });
      return;
    }

    const dialogue = this.dialoguesById.get(activeDialogue.dialogueId);
    const node = dialogue?.nodes.find((candidate) => candidate.id === activeDialogue.nodeId);
    const choice = node?.choices?.find((candidate) => candidate.id === choiceId);

    if (!dialogue || !node || !choice) {
      events.push({ type: "commandIgnored", reason: "Dialogue choice is invalid." });
      return;
    }

    if (!choice.nextNodeId) {
      this.state.activeDialogue = undefined;
      events.push({ type: "dialogueEnded", dialogueId: dialogue.id });
      return;
    }

    this.state.activeDialogue = { dialogueId: dialogue.id, nodeId: choice.nextNodeId };
    events.push({ type: "dialogueAdvanced", dialogueId: dialogue.id, nodeId: choice.nextNodeId });
  }

  private findEntityInDirection(direction?: CardinalDirection): RuntimeEntityState | undefined {
    if (!direction) {
      return this.findAdjacentEntity();
    }

    const delta = directionToDelta(direction);
    const targetX = this.state.player.x + delta.x;
    const targetY = this.state.player.y + delta.y;
    return this.findEntityAt(targetX, targetY);
  }

  private findAdjacentEntity(): RuntimeEntityState | undefined {
    return this.state.entities.find(
      (entity) =>
        entity.active &&
        entity.mapId === this.state.currentMapId &&
        manhattanDistance(entity.x, entity.y, this.state.player.x, this.state.player.y) === 1
    );
  }

  private findEntityAt(x: number, y: number): RuntimeEntityState | undefined {
    return this.state.entities.find(
      (entity) => entity.active && entity.mapId === this.state.currentMapId && entity.x === x && entity.y === y
    );
  }

  private isOccupied(mapId: MapId, x: number, y: number): boolean {
    return this.state.entities.some(
      (entity) => entity.active && entity.mapId === mapId && entity.x === x && entity.y === y
    );
  }

  private requireCurrentMap(): MapDefinition {
    const map = this.mapsById.get(this.state.currentMapId);
    if (!map) {
      throw new Error(`Runtime map '${this.state.currentMapId}' is not available.`);
    }

    return map;
  }
}
