export const CURRENT_ADVENTURE_SCHEMA_VERSION = "1.0.0";

export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type AdventureId = Brand<string, "AdventureId">;
export type AssetId = Brand<string, "AssetId">;
export type DialogueId = Brand<string, "DialogueId">;
export type EntityDefId = Brand<string, "EntityDefId">;
export type EntityId = Brand<string, "EntityId">;
export type ItemDefId = Brand<string, "ItemDefId">;
export type LibraryCategoryId = Brand<string, "LibraryCategoryId">;
export type SkillDefId = Brand<string, "SkillDefId">;
export type TraitDefId = Brand<string, "TraitDefId">;
export type SpellDefId = Brand<string, "SpellDefId">;
export type TileDefId = Brand<string, "TileDefId">;
export type FlagDefId = Brand<string, "FlagDefId">;
export type CustomLibraryObjectId = Brand<string, "CustomLibraryObjectId">;
export type MapId = Brand<string, "MapId">;
export type QuestId = Brand<string, "QuestId">;
export type RegionId = Brand<string, "RegionId">;
export type TriggerId = Brand<string, "TriggerId">;
export type MediaCueId = Brand<string, "MediaCueId">;
export type SoundCueId = Brand<string, "SoundCueId">;

export type AssetKind = "image" | "tileset" | "portrait" | "audio" | "music" | "sound" | "splash" | "video" | "pixelSprite";
export type MediaCueKind = "splash" | "regionTransition" | "image" | "cutscene" | "video";
export type SoundCueKind = "effect" | "music" | "ambient";

export type ClassicSpritePattern = "solid" | "dither" | "floor" | "shrub" | "altar" | "door" | "hero" | "oracle" | "wolf" | "seal" | "pixel";

export interface ClassicSpriteStyle {
  pattern: ClassicSpritePattern;
  fill: string;
  shadow?: string;
  accent?: string;
  line?: string;
}

export type ClassicPixelSpriteUsage = "tile" | "entity" | "item" | "portrait" | "ui" | "splash";
export type StarterGenre = "fantasy" | "scienceFiction" | "modernSpy" | "superhero" | "scienceFantasy" | "supernatural" | "urbanFantasy" | "classicAcs";

export interface ClassicPixelSpriteDefinition {
  id: string;
  name: string;
  usage: ClassicPixelSpriteUsage;
  width: number;
  height: number;
  palette: string[];
  pixels: number[];
  tags?: string[];
  genreTags?: StarterGenre[];
}

export interface VisualManifestDefinition {
  id: string;
  name: string;
  mode: "classic-acs";
  tileSprites: Record<string, ClassicSpriteStyle>;
  entitySprites: Record<string, ClassicSpriteStyle>;
  uiSprites?: Record<string, ClassicSpriteStyle>;
  pixelSprites?: ClassicPixelSpriteDefinition[];
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
  | { type: "playMedia"; cueId: MediaCueId }
  | { type: "playSound"; cueId: SoundCueId }
  | { type: "teleport"; mapId: MapId; x: number; y: number }
  | { type: "changeTile"; mapId: MapId; x: number; y: number; tileId: string }
  | { type: "setQuestStage"; questId: QuestId; stage: number };

export type EntityBehaviorMode = "idle" | "wander" | "guard" | "pursue";
export type ActorKind = "player" | "npc" | "enemy" | "support" | "informational" | "random" | "antagonist";
export type ActorActionKind = "move" | "inspect" | "interact" | "useItem" | "activateTrigger" | "traverseExit" | "pickUpItem" | "dropItem" | "giveItem" | "attack" | "support" | "speak";
export type ActorPermissionMode = "all" | "playersOnly" | "npcsOnly" | "explicit" | "blocked";
export type LibraryObjectKind = "entity" | "item" | "skill" | "trait" | "spell" | "quest" | "flag" | "tile" | "dialogue" | "asset" | "custom";
export type ItemUseKind = "passive" | "usable" | "consumable" | "equipment" | "quest";
export type TilePassability = "passable" | "blocked" | "conditional";
export type MapKind = "world" | "region" | "local" | "interior" | "dungeonFloor";
export type QuestObjectiveKind = "story" | "travel" | "collect" | "return" | "survive" | "custom";
export type QuestRewardKind = "item" | "story" | "flag" | "custom";

export interface EntityBehaviorProfile {
  mode: EntityBehaviorMode;
  detectionRange?: number;
  leashRange?: number;
  wanderRadius?: number;
  turnInterval?: number;
}

export interface VisualPresentationBinding {
  assetId?: AssetId;
  classicSpriteId?: string;
  pixelSpriteId?: string;
  portraitAssetId?: AssetId;
}

export interface ActorUsePolicy {
  mode: ActorPermissionMode;
  allowedActorKinds?: ActorKind[];
  allowedEntityDefinitionIds?: EntityDefId[];
  deniedEntityDefinitionIds?: EntityDefId[];
  requiredSkillIds?: SkillDefId[];
  requiredTraitIds?: TraitDefId[];
}

export interface ActorCapabilityProfile {
  id: string;
  name: string;
  role: ActorKind;
  allowedActions: ActorActionKind[];
  itemPolicy?: ActorUsePolicy;
  triggerPolicy?: ActorUsePolicy;
  exitPolicy?: ActorUsePolicy;
  mapPolicy?: ActorUsePolicy;
}

export interface RuntimeActionProposal {
  actorId: "player" | EntityId;
  action: ActorActionKind;
  targetItemId?: ItemDefId;
  targetTriggerId?: TriggerId;
  targetExitId?: string;
  targetMapId?: MapId;
  direction?: "north" | "south" | "east" | "west";
}

export interface EntityStatBlock {
  life?: number;
  power?: number;
  speed?: number;
}

export interface EntityProfile {
  stats?: EntityStatBlock;
  skillIds?: SkillDefId[];
  traitIds?: TraitDefId[];
}

export interface EntityStartingPossession {
  itemId: ItemDefId;
  quantity?: number;
}

export interface LibraryCategoryDefinition {
  id: LibraryCategoryId;
  name: string;
  kind: LibraryObjectKind;
  description?: string;
  parentId?: LibraryCategoryId;
}

export interface SkillDefinition {
  id: SkillDefId;
  name: string;
  description: string;
  categoryId?: LibraryCategoryId;
}

export interface TraitDefinition {
  id: TraitDefId;
  name: string;
  description: string;
  categoryId?: LibraryCategoryId;
}

export interface SpellDefinition {
  id: SpellDefId;
  name: string;
  description: string;
  categoryId?: LibraryCategoryId;
  powerCost?: number;
  visual?: VisualPresentationBinding;
  usePolicy?: ActorUsePolicy;
}

export interface TileDefinition {
  id: TileDefId;
  name: string;
  description: string;
  categoryId?: LibraryCategoryId;
  passability: TilePassability;
  interactionHint?: string;
  tags: string[];
  classicSpriteId?: string;
  visual?: VisualPresentationBinding;
  usePolicy?: ActorUsePolicy;
}
export interface FlagDefinition {
  id: FlagDefId;
  name: string;
  description: string;
  categoryId?: LibraryCategoryId;
  defaultValue?: boolean | number | string;
}

export interface CustomLibraryObjectDefinition {
  id: CustomLibraryObjectId;
  name: string;
  kind: string;
  description: string;
  categoryId?: LibraryCategoryId;
  fields?: Record<string, boolean | number | string>;
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

export interface MediaCueDefinition {
  id: MediaCueId;
  name: string;
  kind: MediaCueKind;
  assetId: AssetId;
  description?: string;
  skippable?: boolean;
  durationMs?: number;
}

export interface SoundCueDefinition {
  id: SoundCueId;
  name: string;
  kind: SoundCueKind;
  assetId: AssetId;
  description?: string;
  volume?: number;
  loop?: boolean;
}

export interface RuleSetDefinition {
  simulationMode: "turn-based";
  movementModel: "grid-step";
  combatModel: "simple-tactical";
  inventoryModel: "slotless";
}
export interface AdventurePresentationDefinition {
  splashAssetId?: AssetId;
  startingMusicAssetId?: AssetId;
  introText?: string;
}

export interface StarterLibraryPackDefinition {
  id: string;
  name: string;
  genre: StarterGenre;
  description: string;
  tileIds: TileDefId[];
  entityDefinitionIds: EntityDefId[];
  itemDefinitionIds: ItemDefId[];
  skillDefinitionIds?: SkillDefId[];
  spellDefinitionIds?: SpellDefId[];
  traitDefinitionIds?: TraitDefId[];
  assetIds?: AssetId[];
  questIds?: QuestId[];
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
  usePolicy?: ActorUsePolicy;
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
  categoryId?: LibraryCategoryId;
  name: string;
  kind: "player" | "npc" | "enemy" | "container";
  placement?: "singleton" | "multiple";
  behavior?: EntityBehaviorMode | EntityBehaviorProfile;
  profile?: EntityProfile;
  startingPossessions?: EntityStartingPossession[];
  faction?: string;
  assetId?: AssetId;
  visual?: VisualPresentationBinding;
  capabilityProfileId?: string;
}

export interface EntityInstance {
  id: EntityId;
  definitionId: EntityDefId;
  displayName?: string;
  behaviorOverride?: EntityBehaviorMode | EntityBehaviorProfile;
  mapId: MapId;
  x: number;
  y: number;
}

export interface ItemDefinition {
  id: ItemDefId;
  name: string;
  description: string;
  categoryId?: LibraryCategoryId;
  useKind?: ItemUseKind;
  assetId?: AssetId;
  classicSpriteId?: string;
  visual?: VisualPresentationBinding;
  usePolicy?: ActorUsePolicy;
}

export interface QuestObjectiveDefinition {
  id: string;
  title: string;
  description: string;
  kind: QuestObjectiveKind;
  categoryId?: LibraryCategoryId;
  targetMapId?: MapId;
  targetItemId?: ItemDefId;
  completionStage?: number;
}

export interface QuestRewardDefinition {
  id: string;
  label: string;
  kind: QuestRewardKind;
  description?: string;
  itemId?: ItemDefId;
  quantity?: number;
}

export interface QuestDefinition {
  id: QuestId;
  categoryId?: LibraryCategoryId;
  name: string;
  summary: string;
  objectives: QuestObjectiveDefinition[];
  rewards?: QuestRewardDefinition[];
  /**
   * Legacy migration support only. New editor and runtime code should use objectives.
   */
  stages?: string[];
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
  categoryId?: LibraryCategoryId;
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
  usePolicy?: ActorUsePolicy;
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
  mediaCues: MediaCueDefinition[];
  soundCues: SoundCueDefinition[];
  visualManifests: VisualManifestDefinition[];
  rules: RuleSetDefinition;
  presentation: AdventurePresentationDefinition;
  starterLibraryPacks: StarterLibraryPackDefinition[];
  actorCapabilityProfiles?: ActorCapabilityProfile[];
  regions: RegionDefinition[];
  maps: MapDefinition[];
  libraryCategories: LibraryCategoryDefinition[];
  entityDefinitions: EntityDefinition[];
  entityInstances: EntityInstance[];
  itemDefinitions: ItemDefinition[];
  tileDefinitions: TileDefinition[];
  skillDefinitions: SkillDefinition[];
  traitDefinitions: TraitDefinition[];
  spellDefinitions: SpellDefinition[];
  flagDefinitions: FlagDefinition[];
  customLibraryObjects: CustomLibraryObjectDefinition[];
  questDefinitions: QuestDefinition[];
  dialogue: DialogueDefinition[];
  triggers: TriggerDefinition[];
  startState: StartStateDefinition;
}
