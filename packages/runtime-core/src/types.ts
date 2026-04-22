import type {
  AdventurePackage,
  DialogueDefinition,
  EntityBehaviorMode,
  EntityInstance,
  ItemDefId,
  MapId,
  MediaCueId,
  SoundCueId,
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
  | { type: "movementBlocked"; reason: "bounds" | "occupied" | "terrain" }
  | { type: "interactionTargetFound"; entityId: RuntimeEntityState["id"] }
  | { type: "inspectResult"; message: string }
  | { type: "menuOpened"; menu: "inventory" | "quests" | "system" }
  | { type: "dialogueStarted"; dialogueId: DialogueDefinition["id"]; nodeId: string }
  | { type: "dialogueAdvanced"; dialogueId: DialogueDefinition["id"]; nodeId: string }
  | { type: "dialogueEnded"; dialogueId: DialogueDefinition["id"] }
  | { type: "triggerFired"; triggerId: TriggerId }
  | { type: "flagSet"; flag: string; value: boolean | number | string }
  | { type: "itemGranted"; itemId: ItemDefId; quantity: number }
  | { type: "mediaCuePlayed"; cueId: MediaCueId }
  | { type: "soundCuePlayed"; cueId: SoundCueId }
  | { type: "teleported"; mapId: MapId; x: number; y: number }
  | { type: "tileChanged"; mapId: MapId; x: number; y: number; tileId: string }
  | { type: "questStageSet"; questId: string; stage: number }
  | { type: "turnEnded"; turn: number }
  | { type: "commandIgnored"; reason: string }
  | { type: "enemyIntentChosen"; entityId: RuntimeEntityState["id"]; mode: EntityBehaviorMode; action: string }
  | { type: "enemyMoved"; entityId: RuntimeEntityState["id"]; mapId: MapId; x: number; y: number }
  | { type: "enemyWaited"; entityId: RuntimeEntityState["id"]; reason: string }
  | { type: "enemyThreatened"; entityId: RuntimeEntityState["id"]; distance: number };

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
