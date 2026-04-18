export const CURRENT_ADVENTURE_SCHEMA_VERSION = "1.0.0";

export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type AdventureId = Brand<string, "AdventureId">;
export type AssetId = Brand<string, "AssetId">;
export type DialogueId = Brand<string, "DialogueId">;
export type EntityDefId = Brand<string, "EntityDefId">;
export type EntityId = Brand<string, "EntityId">;
export type ItemDefId = Brand<string, "ItemDefId">;
export type MapId = Brand<string, "MapId">;
export type QuestId = Brand<string, "QuestId">;
export type RegionId = Brand<string, "RegionId">;
export type TriggerId = Brand<string, "TriggerId">;

export type AssetKind = "image" | "tileset" | "portrait" | "audio" | "music";

export type ClassicSpritePattern = "solid" | "dither" | "floor" | "shrub" | "altar" | "door" | "hero" | "oracle" | "wolf" | "seal";

export interface ClassicSpriteStyle {
  pattern: ClassicSpritePattern;
  fill: string;
  shadow?: string;
  accent?: string;
  line?: string;
}

export interface VisualManifestDefinition {
  id: string;
  name: string;
  mode: "classic-acs";
  tileSprites: Record<string, ClassicSpriteStyle>;
  entitySprites: Record<string, ClassicSpriteStyle>;
  uiSprites?: Record<string, ClassicSpriteStyle>;
}
export type TriggerType =
  | "onEnterTile"
  | "onInteractEntity"
  | "onUseItem"
  | "onQuestStageReached"
  | "onDefeatEntity"
  | "onMapLoad";

export type Condition =
  | { type: "flagEquals"; flag: string; value: boolean | number | string }
  | { type: "hasItem"; itemId: ItemDefId; quantity?: number }
  | { type: "questStageAtLeast"; questId: QuestId; stage: number };

export type Action =
  | { type: "showDialogue"; dialogueId: DialogueId }
  | { type: "setFlag"; flag: string; value: boolean | number | string }
  | { type: "giveItem"; itemId: ItemDefId; quantity?: number }
  | { type: "teleport"; mapId: MapId; x: number; y: number }
  | { type: "changeTile"; mapId: MapId; x: number; y: number; tileId: string };

export type EntityBehaviorMode = "idle" | "wander" | "guard" | "pursue";
export type MapKind = "world" | "region" | "local" | "interior" | "dungeonFloor";

export interface EntityBehaviorProfile {
  mode: EntityBehaviorMode;
  detectionRange?: number;
  leashRange?: number;
  wanderRadius?: number;
  turnInterval?: number;
}

export interface EntityStatBlock {
  life?: number;
  power?: number;
  speed?: number;
}

export interface EntityProfile {
  stats?: EntityStatBlock;
  skills?: string[];
}

export interface EntityStartingPossession {
  itemId: ItemDefId;
  quantity?: number;
}

export interface AdventureMetadata {
  id: AdventureId;
  slug: string;
  title: string;
  description: string;
  author: string;
  tags: string[];
}

export interface AssetRecord {
  id: AssetId;
  kind: AssetKind;
  storageKey: string;
  metadata?: {
    width?: number;
    height?: number;
    tileWidth?: number;
    tileHeight?: number;
    dpiClass?: "low" | "standard" | "hd";
  };
}

export interface RuleSetDefinition {
  simulationMode: "turn-based";
  movementModel: "grid-step";
  combatModel: "simple-tactical";
  inventoryModel: "slotless";
}

export interface RegionDefinition {
  id: RegionId;
  name: string;
  description: string;
  loreNotes?: string;
  sourceReferences?: string[];
}

export interface TileLayerDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  tileIds: string[];
}

export interface ExitDefinition {
  id: string;
  toMapId: MapId;
  toX: number;
  toY: number;
  x: number;
  y: number;
}

export interface MapDefinition {
  id: MapId;
  name: string;
  kind?: MapKind;
  regionId?: RegionId;
  width: number;
  height: number;
  tileLayers: TileLayerDefinition[];
  exits: ExitDefinition[];
}

export interface EntityDefinition {
  id: EntityDefId;
  name: string;
  kind: "player" | "npc" | "enemy" | "container";
  placement?: "singleton" | "multiple";
  behavior?: EntityBehaviorMode | EntityBehaviorProfile;
  profile?: EntityProfile;
  startingPossessions?: EntityStartingPossession[];
  faction?: string;
  assetId?: AssetId;
}

export interface EntityInstance {
  id: EntityId;
  definitionId: EntityDefId;
  mapId: MapId;
  x: number;
  y: number;
}

export interface ItemDefinition {
  id: ItemDefId;
  name: string;
  description: string;
}

export interface QuestDefinition {
  id: QuestId;
  name: string;
  summary: string;
  stages: string[];
  sourceReferences?: string[];
}

export interface DialogueChoice {
  id: string;
  label: string;
  nextNodeId?: string;
}

export interface DialogueNode {
  id: string;
  speaker?: string;
  text: string;
  choices?: DialogueChoice[];
}

export interface DialogueDefinition {
  id: DialogueId;
  nodes: DialogueNode[];
}

export interface TriggerDefinition {
  id: TriggerId;
  type: TriggerType;
  mapId?: MapId;
  x?: number;
  y?: number;
  conditions: Condition[];
  actions: Action[];
  runOnce?: boolean;
}

export interface StartStateDefinition {
  mapId: MapId;
  x: number;
  y: number;
  party: EntityDefId[];
  initialQuestStages?: Record<string, number>;
  initialFlags?: Record<string, boolean | number | string>;
}

export interface AdventurePackage {
  schemaVersion: string;
  metadata: AdventureMetadata;
  assets: AssetRecord[];
  visualManifests: VisualManifestDefinition[];
  rules: RuleSetDefinition;
  regions: RegionDefinition[];
  maps: MapDefinition[];
  entityDefinitions: EntityDefinition[];
  entityInstances: EntityInstance[];
  itemDefinitions: ItemDefinition[];
  questDefinitions: QuestDefinition[];
  dialogue: DialogueDefinition[];
  triggers: TriggerDefinition[];
  startState: StartStateDefinition;
}
