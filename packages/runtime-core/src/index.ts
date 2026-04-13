import { migrateAdventurePackage } from "@acs/content-schema";
import type {
  AdventurePackage,
  DialogueDefinition,
  EntityInstance,
  ItemDefId,
  MapDefinition,
  MapId,
  TriggerDefinition,
  TriggerId
} from "@acs/domain";

export type CardinalDirection = "north" | "south" | "east" | "west";

export type PlayerCommand =
  | { type: "move"; direction: CardinalDirection }
  | { type: "interact"; direction?: CardinalDirection }
  | { type: "inspect"; direction?: CardinalDirection }
  | { type: "openMenu"; menu: "inventory" | "quests" | "system" }
  | { type: "useItem"; itemId: ItemDefId }
  | { type: "selectDialogueChoice"; choiceId: string }
  | { type: "endTurn" };

export type InventoryState = Record<string, number>;
export type FlagState = Record<string, boolean | number | string>;
export type QuestProgressState = Record<string, number>;

export interface RuntimeEntityState {
  id: EntityInstance["id"];
  definitionId: EntityInstance["definitionId"];
  mapId: EntityInstance["mapId"];
  x: number;
  y: number;
  active: boolean;
}

export interface TileOverride {
  tileId: string;
}

export interface ActiveDialogueState {
  dialogueId: DialogueDefinition["id"];
  nodeId: string;
}

export interface RuntimeSnapshot {
  adventureId: AdventurePackage["metadata"]["id"];
  schemaVersion: AdventurePackage["schemaVersion"];
  currentMapId: MapId;
  player: {
    x: number;
    y: number;
    party: AdventurePackage["startState"]["party"];
  };
  inventory: InventoryState;
  flags: FlagState;
  questStages: QuestProgressState;
  entities: RuntimeEntityState[];
  tileOverrides: Record<string, TileOverride>;
  completedTriggers: TriggerId[];
  activeDialogue?: ActiveDialogueState | undefined;
  turn: number;
}

export interface GameSessionState extends RuntimeSnapshot {
  adventureTitle: string;
}

export type EngineEvent =
  | { type: "playerMoved"; mapId: MapId; x: number; y: number }
  | { type: "movementBlocked"; reason: "bounds" | "occupied" }
  | { type: "interactionTargetFound"; entityId: RuntimeEntityState["id"] }
  | { type: "inspectResult"; message: string }
  | { type: "menuOpened"; menu: "inventory" | "quests" | "system" }
  | { type: "dialogueStarted"; dialogueId: DialogueDefinition["id"]; nodeId: string }
  | { type: "dialogueAdvanced"; dialogueId: DialogueDefinition["id"]; nodeId: string }
  | { type: "dialogueEnded"; dialogueId: DialogueDefinition["id"] }
  | { type: "triggerFired"; triggerId: TriggerId }
  | { type: "flagSet"; flag: string; value: boolean | number | string }
  | { type: "itemGranted"; itemId: ItemDefId; quantity: number }
  | { type: "teleported"; mapId: MapId; x: number; y: number }
  | { type: "tileChanged"; mapId: MapId; x: number; y: number; tileId: string }
  | { type: "turnEnded"; turn: number }
  | { type: "commandIgnored"; reason: string };

export interface EngineResult {
  state: Readonly<GameSessionState>;
  events: EngineEvent[];
}

export interface GameSession {
  dispatch(command: PlayerCommand): EngineResult;
  getState(): Readonly<GameSessionState>;
  serializeSnapshot(): RuntimeSnapshot;
}

export interface GameEngine {
  loadAdventure(pkg: AdventurePackage, snapshot?: RuntimeSnapshot): GameSession;
}

export function createGameEngine(): GameEngine {
  return {
    loadAdventure(pkg: AdventurePackage, snapshot?: RuntimeSnapshot): GameSession {
      const adventure = migrateAdventurePackage(pkg);
      return new RuntimeGameSession(adventure, snapshot);
    }
  };
}

class RuntimeGameSession implements GameSession {
  private readonly mapsById: Map<MapId, MapDefinition>;
  private readonly dialoguesById: Map<DialogueDefinition["id"], DialogueDefinition>;
  private readonly triggers: TriggerDefinition[];
  private readonly state: GameSessionState;

  constructor(pkg: AdventurePackage, snapshot?: RuntimeSnapshot) {
    this.mapsById = new Map(pkg.maps.map((map) => [map.id, map]));
    this.dialoguesById = new Map(pkg.dialogue.map((dialogue) => [dialogue.id, dialogue]));
    this.triggers = pkg.triggers;
    this.state = snapshot ? hydrateState(pkg, snapshot) : createInitialState(pkg);

    this.runMapLoadTriggers();
  }

  dispatch(command: PlayerCommand): EngineResult {
    const events: EngineEvent[] = [];

    switch (command.type) {
      case "move":
        this.handleMove(command.direction, events);
        break;
      case "interact":
        this.handleInteract(command.direction, events);
        break;
      case "inspect":
        this.handleInspect(command.direction, events);
        break;
      case "openMenu":
        events.push({ type: "menuOpened", menu: command.menu });
        break;
      case "useItem":
        this.handleUseItem(command.itemId, events);
        break;
      case "selectDialogueChoice":
        this.handleDialogueChoice(command.choiceId, events);
        break;
      case "endTurn":
        this.state.turn += 1;
        events.push({ type: "turnEnded", turn: this.state.turn });
        break;
      default:
        assertNever(command);
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

  private handleMove(direction: CardinalDirection, events: EngineEvent[]): void {
    const delta = directionToDelta(direction);
    const currentMap = this.requireCurrentMap();
    const nextX = this.state.player.x + delta.x;
    const nextY = this.state.player.y + delta.y;

    if (!isWithinBounds(currentMap, nextX, nextY)) {
      events.push({ type: "movementBlocked", reason: "bounds" });
      return;
    }

    if (this.isOccupied(currentMap.id, nextX, nextY)) {
      events.push({ type: "movementBlocked", reason: "occupied" });
      return;
    }

    this.state.player.x = nextX;
    this.state.player.y = nextY;
    events.push({ type: "playerMoved", mapId: currentMap.id, x: nextX, y: nextY });

    const exit = currentMap.exits.find((candidate) => candidate.x === nextX && candidate.y === nextY);
    if (exit) {
      this.state.currentMapId = exit.toMapId;
      this.state.player.x = exit.toX;
      this.state.player.y = exit.toY;
      events.push({ type: "teleported", mapId: exit.toMapId, x: exit.toX, y: exit.toY });
      events.push(...this.runMapLoadTriggers());
      events.push(...this.runTileTriggers());
      return;
    }

    events.push(...this.runTileTriggers());
  }

  private handleInteract(direction: CardinalDirection | undefined, events: EngineEvent[]): void {
    const target = this.findEntityInDirection(direction);
    if (!target) {
      events.push({ type: "commandIgnored", reason: "No adjacent entity to interact with." });
      return;
    }

    events.push({ type: "interactionTargetFound", entityId: target.id });
    events.push(...this.runTriggers("onInteractEntity", target.x, target.y));
  }

  private handleInspect(direction: CardinalDirection | undefined, events: EngineEvent[]): void {
    const target = this.findEntityInDirection(direction);
    if (target) {
      events.push({ type: "inspectResult", message: `You inspect entity '${target.id}'.` });
      return;
    }

    events.push({
      type: "inspectResult",
      message: `You inspect (${this.state.player.x}, ${this.state.player.y}) on map '${this.state.currentMapId}'.`
    });
  }

  private handleUseItem(itemId: ItemDefId, events: EngineEvent[]): void {
    const quantity = this.state.inventory[itemId] ?? 0;
    if (quantity < 1) {
      events.push({ type: "commandIgnored", reason: `Item '${itemId}' is not in inventory.` });
      return;
    }

    events.push(...this.runTriggers("onUseItem"));
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

  private runMapLoadTriggers(): EngineEvent[] {
    return this.runTriggers("onMapLoad");
  }

  private runTileTriggers(): EngineEvent[] {
    return this.runTriggers("onEnterTile", this.state.player.x, this.state.player.y);
  }

  private runTriggers(type: TriggerDefinition["type"], x?: number, y?: number): EngineEvent[] {
    const events: EngineEvent[] = [];

    for (const trigger of this.triggers) {
      if (trigger.type !== type) {
        continue;
      }

      if (trigger.runOnce && this.state.completedTriggers.includes(trigger.id)) {
        continue;
      }

      if (trigger.mapId && trigger.mapId !== this.state.currentMapId) {
        continue;
      }

      if (typeof x === "number" && typeof trigger.x === "number" && trigger.x !== x) {
        continue;
      }

      if (typeof y === "number" && typeof trigger.y === "number" && trigger.y !== y) {
        continue;
      }

      if (!conditionsMatch(trigger, this.state)) {
        continue;
      }

      events.push({ type: "triggerFired", triggerId: trigger.id });
      events.push(...applyTriggerActions(trigger, this.state, this.dialoguesById));

      if (trigger.runOnce) {
        this.state.completedTriggers.push(trigger.id);
      }
    }

    return events;
  }

  private findEntityInDirection(direction?: CardinalDirection): RuntimeEntityState | undefined {
    if (!direction) {
      return this.state.entities.find(
        (entity) =>
          entity.active &&
          entity.mapId === this.state.currentMapId &&
          manhattanDistance(entity.x, entity.y, this.state.player.x, this.state.player.y) === 1
      );
    }

    const delta = directionToDelta(direction);
    const targetX = this.state.player.x + delta.x;
    const targetY = this.state.player.y + delta.y;

    return this.state.entities.find(
      (entity) =>
        entity.active && entity.mapId === this.state.currentMapId && entity.x === targetX && entity.y === targetY
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

function createInitialState(pkg: AdventurePackage): GameSessionState {
  return {
    adventureId: pkg.metadata.id,
    adventureTitle: pkg.metadata.title,
    schemaVersion: pkg.schemaVersion,
    currentMapId: pkg.startState.mapId,
    player: {
      x: pkg.startState.x,
      y: pkg.startState.y,
      party: [...pkg.startState.party]
    },
    inventory: {},
    flags: { ...(pkg.startState.initialFlags ?? {}) },
    questStages: { ...(pkg.startState.initialQuestStages ?? {}) },
    entities: pkg.entityInstances.map((entity) => createRuntimeEntity(entity)),
    tileOverrides: {},
    completedTriggers: [],
    activeDialogue: undefined,
    turn: 0
  };
}

function hydrateState(pkg: AdventurePackage, snapshot: RuntimeSnapshot): GameSessionState {
  return {
    ...snapshot,
    adventureTitle: pkg.metadata.title,
    player: {
      x: snapshot.player.x,
      y: snapshot.player.y,
      party: [...snapshot.player.party]
    },
    inventory: { ...snapshot.inventory },
    flags: { ...snapshot.flags },
    questStages: { ...snapshot.questStages },
    entities: snapshot.entities.map((entity) => ({ ...entity })),
    tileOverrides: { ...snapshot.tileOverrides },
    completedTriggers: [...snapshot.completedTriggers],
    activeDialogue: snapshot.activeDialogue ? { ...snapshot.activeDialogue } : undefined
  };
}

function createRuntimeEntity(entity: EntityInstance): RuntimeEntityState {
  return {
    id: entity.id,
    definitionId: entity.definitionId,
    mapId: entity.mapId,
    x: entity.x,
    y: entity.y,
    active: true
  };
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

function applyTriggerActions(
  trigger: TriggerDefinition,
  state: GameSessionState,
  dialoguesById: Map<DialogueDefinition["id"], DialogueDefinition>
): EngineEvent[] {
  const events: EngineEvent[] = [];

  for (const action of trigger.actions) {
    switch (action.type) {
      case "showDialogue": {
        const dialogue = dialoguesById.get(action.dialogueId);
        const firstNode = dialogue?.nodes[0];
        if (!dialogue || !firstNode) {
          events.push({ type: "commandIgnored", reason: `Dialogue '${action.dialogueId}' is missing or empty.` });
          break;
        }

        state.activeDialogue = { dialogueId: dialogue.id, nodeId: firstNode.id };
        events.push({ type: "dialogueStarted", dialogueId: dialogue.id, nodeId: firstNode.id });
        break;
      }
      case "setFlag":
        state.flags[action.flag] = action.value;
        events.push({ type: "flagSet", flag: action.flag, value: action.value });
        break;
      case "giveItem": {
        const quantity = action.quantity ?? 1;
        state.inventory[action.itemId] = (state.inventory[action.itemId] ?? 0) + quantity;
        events.push({ type: "itemGranted", itemId: action.itemId, quantity });
        break;
      }
      case "teleport":
        state.currentMapId = action.mapId;
        state.player.x = action.x;
        state.player.y = action.y;
        events.push({ type: "teleported", mapId: action.mapId, x: action.x, y: action.y });
        break;
      case "changeTile": {
        const key = toTileOverrideKey(action.mapId, action.x, action.y);
        state.tileOverrides[key] = { tileId: action.tileId };
        events.push({ type: "tileChanged", mapId: action.mapId, x: action.x, y: action.y, tileId: action.tileId });
        break;
      }
      default:
        assertNever(action);
    }
  }

  return events;
}

function directionToDelta(direction: CardinalDirection): { x: number; y: number } {
  switch (direction) {
    case "north":
      return { x: 0, y: -1 };
    case "south":
      return { x: 0, y: 1 };
    case "east":
      return { x: 1, y: 0 };
    case "west":
      return { x: -1, y: 0 };
    default:
      return assertNever(direction);
  }
}

function isWithinBounds(map: MapDefinition, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

function manhattanDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function toTileOverrideKey(mapId: MapId, x: number, y: number): string {
  return `${mapId}:${x},${y}`;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
