import type { AdventurePackage, DialogueDefinition, ExitDefinition, EntityDefId, EntityDefinition, EntityId, EntityInstance, FlagDefinition, ItemDefinition, LibraryCategoryDefinition, MapDefinition, MapKind, RegionDefinition, SkillDefinition, TileDefinition, TileDefId, TilePassability, TriggerDefinition, TriggerId, TriggerType } from "@acs/domain";

export * from "./quest-definitions.js";

export function cloneAdventurePackage(pkg: AdventurePackage): AdventurePackage {
  return JSON.parse(JSON.stringify(pkg)) as AdventurePackage;
}

export function getMapById(pkg: AdventurePackage, mapId: MapDefinition["id"]): MapDefinition | undefined {
  return pkg.maps.find((map) => map.id === mapId);
}

export function listExitsForMap(pkg: AdventurePackage, mapId: MapDefinition["id"]): ExitDefinition[] {
  return [...(getMapById(pkg, mapId)?.exits ?? [])].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
}

export interface UpsertExitInput {
  id?: ExitDefinition["id"];
  x: number;
  y: number;
  toMapId: MapDefinition["id"];
  toX: number;
  toY: number;
}

export function upsertExitDefinition(
  pkg: AdventurePackage,
  mapId: MapDefinition["id"],
  input: UpsertExitInput
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const map = next.maps.find((candidate) => candidate.id === mapId);
  if (!map) {
    return next;
  }

  const id = input.id || createExitId(map, input.x, input.y);
  const exit = map.exits.find((candidate) => candidate.id === id || (candidate.x === input.x && candidate.y === input.y));
  const value: ExitDefinition = { id, x: input.x, y: input.y, toMapId: input.toMapId, toX: input.toX, toY: input.toY };
  if (exit) {
    Object.assign(exit, value);
    return next;
  }

  map.exits.push(value);
  return next;
}

export function deleteExitDefinition(
  pkg: AdventurePackage,
  mapId: MapDefinition["id"],
  exitId: ExitDefinition["id"]
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const map = next.maps.find((candidate) => candidate.id === mapId);
  if (!map) {
    return next;
  }

  map.exits = map.exits.filter((exit) => exit.id !== exitId);
  return next;
}
export function listTilePalette(pkg: AdventurePackage, mapId: MapDefinition["id"]): string[] {
  const map = getMapById(pkg, mapId);
  if (!map) {
    return [];
  }

  const values = new Set<string>();
  for (const layer of map.tileLayers) {
    for (const tileId of layer.tileIds) {
      if (tileId) {
        values.add(tileId);
      }
    }
  }

  for (const definition of pkg.tileDefinitions ?? []) {
    values.add(String(definition.id));
  }

  return [...values].sort();
}

export function listLibraryCategories(pkg: AdventurePackage): LibraryCategoryDefinition[] {
  return [...(pkg.libraryCategories ?? [])].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
}

export function listTileDefinitions(pkg: AdventurePackage): TileDefinition[] {
  return [...(pkg.tileDefinitions ?? [])].sort((a, b) => a.name.localeCompare(b.name));
}

export interface CreateTileDefinitionInput {
  idSeed: string;
  name: string;
  description?: string;
  categoryId?: TileDefinition["categoryId"];
  passability?: TilePassability;
  interactionHint?: string;
  tags?: string[];
  classicSpriteId?: string;
}

export function createTileDefinition(pkg: AdventurePackage, input: CreateTileDefinitionInput): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const id = createTileDefinitionId(next, input.idSeed || input.name || "tile");
  next.tileDefinitions = [...(next.tileDefinitions ?? []), sanitizeTileDefinition(createTileDefinitionValue(id, input))];
  return next;
}

function createTileDefinitionValue(id: TileDefId, input: CreateTileDefinitionInput): TileDefinition {
  const definition: TileDefinition = {
    id,
    name: input.name,
    description: input.description ?? "",
    passability: input.passability ?? "passable",
    tags: input.tags ?? []
  };
  applyOptionalTileDefinitionFields(definition, input);
  return definition;
}

function applyOptionalTileDefinitionFields(definition: TileDefinition, input: CreateTileDefinitionInput): void {
  if (input.categoryId) {
    definition.categoryId = input.categoryId;
  }
  if (input.interactionHint) {
    definition.interactionHint = input.interactionHint;
  }
  if (input.classicSpriteId) {
    definition.classicSpriteId = input.classicSpriteId;
  }
}

export function updateTileDefinition(
  pkg: AdventurePackage,
  tileId: TileDefinition["id"],
  updates: Partial<TileDefinition>
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const definition = next.tileDefinitions.find((candidate) => candidate.id === tileId);
  if (!definition) {
    return next;
  }

  Object.assign(definition, sanitizeTileDefinition({ ...definition, ...updates }));
  return next;
}
export function listItemDefinitions(pkg: AdventurePackage): ItemDefinition[] {
  return [...(pkg.itemDefinitions ?? [])].sort((a, b) => a.name.localeCompare(b.name));
}

export function listSkillDefinitions(pkg: AdventurePackage): SkillDefinition[] {
  return [...(pkg.skillDefinitions ?? [])].sort((a, b) => a.name.localeCompare(b.name));
}

export function listFlagDefinitions(pkg: AdventurePackage): FlagDefinition[] {
  return [...(pkg.flagDefinitions ?? [])].sort((a, b) => a.name.localeCompare(b.name));
}

export function listEntityDefinitions(pkg: AdventurePackage): EntityDefinition[] {
  return [...pkg.entityDefinitions].sort((a, b) => a.name.localeCompare(b.name));
}


export function listRegions(pkg: AdventurePackage): RegionDefinition[] {
  return [...pkg.regions].sort((a, b) => a.name.localeCompare(b.name));
}

export function listDialogueDefinitions(pkg: AdventurePackage): DialogueDefinition[] {
  return [...pkg.dialogue].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export function listTriggerDefinitions(pkg: AdventurePackage): TriggerDefinition[] {
  return [...pkg.triggers].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export function getEntityDefinitionById(
  pkg: AdventurePackage,
  definitionId: EntityDefinition["id"]
): EntityDefinition | undefined {
  return pkg.entityDefinitions.find((definition) => definition.id === definitionId);
}

export function canPlaceEntityDefinition(pkg: AdventurePackage, definitionId: EntityDefinition["id"]): boolean {
  const definition = getEntityDefinitionById(pkg, definitionId);
  if (!definition) {
    return false;
  }

  if ((definition.placement ?? "multiple") === "multiple") {
    return true;
  }

  return !pkg.entityInstances.some((entity) => entity.definitionId === definitionId);
}


export interface CreateMapDefinitionInput {
  name: string;
  kind?: MapKind;
  regionId?: RegionDefinition["id"];
  width: number;
  height: number;
  fillTileId: string;
}

export function updateMapDefinition(
  pkg: AdventurePackage,
  mapId: MapDefinition["id"],
  updates: Partial<Pick<MapDefinition, "name" | "kind" | "regionId">>
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const map = next.maps.find((candidate) => candidate.id === mapId);
  if (!map) {
    return next;
  }

  Object.assign(map, sanitizeMapDefinitionUpdates(updates));
  return next;
}

export function createMapDefinition(pkg: AdventurePackage, input: CreateMapDefinitionInput): AdventurePackage {
  const width = Math.max(1, Math.floor(input.width));
  const height = Math.max(1, Math.floor(input.height));
  const id = createMapId(pkg, input.name);
  const fillTileId = input.fillTileId.trim() || "grass";
  const next = cloneAdventurePackage(pkg);
  const map: MapDefinition = {
    id,
    name: input.name.trim() || "Untitled Map",
    width,
    height,
    tileLayers: [
      {
        id: `${id}_base`,
        name: "Base",
        width,
        height,
        tileIds: Array.from({ length: width * height }, () => fillTileId)
      }
    ],
    exits: []
  };

  if (input.kind) {
    map.kind = input.kind;
  }

  if (input.regionId) {
    map.regionId = input.regionId;
  }

  next.maps.push(map);
  return next;
}
export function updateEntityDefinition(
  pkg: AdventurePackage,
  definitionId: EntityDefinition["id"],
  updates: Partial<EntityDefinition>
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const definition = next.entityDefinitions.find((candidate) => candidate.id === definitionId);
  if (!definition) {
    return next;
  }

  Object.assign(definition, sanitizeEntityDefinitionUpdates(updates));
  return next;
}
export function updateDialogueNode(
  pkg: AdventurePackage,
  dialogueId: DialogueDefinition["id"],
  nodeId: string,
  updates: Partial<DialogueDefinition["nodes"][number]>
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const dialogue = next.dialogue.find((candidate) => candidate.id === dialogueId);
  const node = dialogue?.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return next;
  }

  Object.assign(node, sanitizeDialogueNodeUpdates(updates));
  return next;
}

export type TriggerDefinitionEditorUpdate = Omit<Partial<TriggerDefinition>, "mapId" | "x" | "y" | "runOnce"> & {
  mapId?: TriggerDefinition["mapId"] | "" | undefined;
  x?: number | undefined;
  y?: number | undefined;
  runOnce?: boolean | undefined;
};

export interface CreateTriggerDefinitionInput {
  name?: string;
  type?: TriggerType;
  mapId?: MapDefinition["id"];
  x?: number;
  y?: number;
}

export function createTriggerDefinition(pkg: AdventurePackage, input: CreateTriggerDefinitionInput = {}): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const id = createTriggerId(next, input.name ?? input.type ?? "trigger");
  const trigger: TriggerDefinition = {
    id,
    type: input.type ?? "onEnterTile",
    conditions: [],
    actions: []
  };

  if (input.mapId) {
    trigger.mapId = input.mapId;
  }
  if (typeof input.x === "number") {
    trigger.x = Math.max(0, Math.floor(input.x));
  }
  if (typeof input.y === "number") {
    trigger.y = Math.max(0, Math.floor(input.y));
  }

  next.triggers.push(trigger);
  return next;
}

export function duplicateTriggerDefinition(pkg: AdventurePackage, triggerId: TriggerDefinition["id"]): AdventurePackage {
  const source = pkg.triggers.find((candidate) => candidate.id === triggerId);
  const next = cloneAdventurePackage(pkg);
  if (!source) {
    return next;
  }

  const duplicate = cloneAdventurePackage({ ...pkg, triggers: [source] }).triggers[0];
  if (!duplicate) {
    return next;
  }

  duplicate.id = createTriggerId(next, `${source.id}_copy`);
  next.triggers.push(duplicate);
  return next;
}

export function deleteTriggerDefinition(pkg: AdventurePackage, triggerId: TriggerDefinition["id"]): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  next.triggers = next.triggers.filter((trigger) => trigger.id !== triggerId);
  return next;
}
export function updateTriggerDefinition(
  pkg: AdventurePackage,
  triggerId: TriggerDefinition["id"],
  updates: TriggerDefinitionEditorUpdate
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const trigger = next.triggers.find((candidate) => candidate.id === triggerId);
  if (!trigger) {
    return next;
  }

  const sanitized = sanitizeTriggerDefinitionUpdates(updates);
  Object.assign(trigger, sanitized);

  if ("mapId" in updates && sanitized.mapId === undefined) {
    delete trigger.mapId;
  }
  if ("x" in updates && sanitized.x === undefined) {
    delete trigger.x;
  }
  if ("y" in updates && sanitized.y === undefined) {
    delete trigger.y;
  }
  if ("runOnce" in updates && sanitized.runOnce === undefined) {
    delete trigger.runOnce;
  }

  return next;
}

export function setTileAt(
  pkg: AdventurePackage,
  mapId: MapDefinition["id"],
  x: number,
  y: number,
  tileId: string,
  layerId?: string
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const map = next.maps.find((candidate) => candidate.id === mapId);
  if (!map) {
    return next;
  }

  const layer = layerId
    ? map.tileLayers.find((candidate) => candidate.id === layerId)
    : map.tileLayers[0];
  if (!layer) {
    return next;
  }

  const index = y * map.width + x;
  if (index < 0 || index >= layer.tileIds.length) {
    return next;
  }

  layer.tileIds[index] = tileId;
  return next;
}

export function addEntityInstance(
  pkg: AdventurePackage,
  definitionId: EntityDefId,
  mapId: EntityInstance["mapId"],
  x: number,
  y: number
): AdventurePackage {
  const definition = getEntityDefinitionById(pkg, definitionId);
  const map = getMapById(pkg, mapId);
  if (!definition || !map || !isWithinMap(map, x, y) || !canPlaceEntityDefinition(pkg, definitionId)) {
    return cloneAdventurePackage(pkg);
  }

  const next = cloneAdventurePackage(pkg);
  next.entityInstances.push({
    id: createEntityInstanceId(next, definitionId),
    definitionId,
    mapId,
    x,
    y
  });

  return next;
}

export function moveEntityInstance(
  pkg: AdventurePackage,
  entityId: EntityInstance["id"],
  mapId: EntityInstance["mapId"],
  x: number,
  y: number
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const entity = next.entityInstances.find((candidate) => candidate.id === entityId);
  if (!entity) {
    return next;
  }

  entity.mapId = mapId;
  entity.x = x;
  entity.y = y;
  return next;
}

export function listEntitiesForMap(pkg: AdventurePackage, mapId: EntityInstance["mapId"]): EntityInstance[] {
  return pkg.entityInstances.filter((entity) => entity.mapId === mapId);
}

export function updateAdventureMetadata(
  pkg: AdventurePackage,
  updates: Partial<AdventurePackage["metadata"]>
): AdventurePackage {
  return {
    ...cloneAdventurePackage(pkg),
    metadata: {
      ...pkg.metadata,
      ...updates
    }
  };
}


function sanitizeTileDefinition(definition: TileDefinition): TileDefinition {
  const sanitized: TileDefinition = {
    ...definition,
    name: definition.name.trim() || String(definition.id),
    description: definition.description.trim(),
    passability: definition.passability ?? "passable",
    tags: [...new Set((definition.tags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0))]
  };

  if (!sanitized.categoryId) {
    delete sanitized.categoryId;
  }
  if (!sanitized.interactionHint?.trim()) {
    delete sanitized.interactionHint;
  } else {
    sanitized.interactionHint = sanitized.interactionHint.trim();
  }
  if (!sanitized.classicSpriteId?.trim()) {
    delete sanitized.classicSpriteId;
  } else {
    sanitized.classicSpriteId = sanitized.classicSpriteId.trim();
  }

  return sanitized;
}

function createTileDefinitionId(pkg: AdventurePackage, seed: string): TileDefId {
  const baseSlug = slugify(seed || "tile");
  const existingIds = new Set((pkg.tileDefinitions ?? []).map((definition) => definition.id));
  let index = 1;
  let candidate = baseSlug as TileDefId;

  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `${baseSlug}_${index}` as TileDefId;
  }

  return candidate;
}
function sanitizeMapDefinitionUpdates(
  updates: Partial<Pick<MapDefinition, "name" | "kind" | "regionId">>
): Partial<Pick<MapDefinition, "name" | "kind" | "regionId">> {
  const sanitized: Partial<Pick<MapDefinition, "name" | "kind" | "regionId">> = { ...updates };
  if (sanitized.name !== undefined) {
    sanitized.name = sanitized.name.trim() || "Untitled Map";
  }

  if (sanitized.regionId === "") {
    delete sanitized.regionId;
  }

  if (sanitized.kind === undefined) {
    delete sanitized.kind;
  }

  return sanitized;
}
function sanitizeDialogueNodeUpdates(
  updates: Partial<DialogueDefinition["nodes"][number]>
): Partial<DialogueDefinition["nodes"][number]> {
  const sanitized: Partial<DialogueDefinition["nodes"][number]> = { ...updates };
  if (sanitized.speaker === "") {
    delete sanitized.speaker;
  }

  return sanitized;
}

function sanitizeTriggerDefinitionUpdates(updates: TriggerDefinitionEditorUpdate): Partial<TriggerDefinition> {
  const sanitized: TriggerDefinitionEditorUpdate = { ...updates };
  if (sanitized.mapId === "") {
    delete sanitized.mapId;
  }

  if (sanitized.x === undefined) {
    delete sanitized.x;
  }

  if (sanitized.y === undefined) {
    delete sanitized.y;
  }

  if (sanitized.runOnce === false) {
    delete sanitized.runOnce;
  }

  return sanitized as Partial<TriggerDefinition>;
}

function sanitizeEntityDefinitionUpdates(updates: Partial<EntityDefinition>): Partial<EntityDefinition> {
  const sanitized: Partial<EntityDefinition> = { ...updates };

  if (sanitized.assetId === "") {
    delete sanitized.assetId;
  }

  if (sanitized.faction === "") {
    delete sanitized.faction;
  }

  return sanitized;
}
function createTriggerId(pkg: AdventurePackage, seed: string): TriggerId {
  const baseSlug = slugify(seed || "trigger");
  const existingIds = new Set(pkg.triggers.map((trigger) => trigger.id));
  let index = 1;
  let candidate = `trigger_${baseSlug}` as TriggerId;

  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `trigger_${baseSlug}_${index}` as TriggerId;
  }

  return candidate;
}
function createExitId(map: MapDefinition, x: number, y: number): ExitDefinition["id"] {
  const base = `exit_${map.id}_${x}_${y}`;
  const existingIds = new Set(map.exits.map((exit) => exit.id));
  let candidate = base;
  let index = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}_${index}`;
    index += 1;
  }
  return candidate;
}
function createMapId(pkg: AdventurePackage, name: string): MapDefinition["id"] {
  const baseSlug = slugify(name.trim() || "untitled_map");
  const existingIds = new Set(pkg.maps.map((map) => map.id));
  let index = 1;
  let candidate = `map_${baseSlug}` as MapDefinition["id"];

  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `map_${baseSlug}_${index}` as MapDefinition["id"];
  }

  return candidate;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "map";
}
function createEntityInstanceId(pkg: AdventurePackage, definitionId: EntityDefId): EntityId {
  const base = `entity_${String(definitionId).replace(/^def_/, "").replace(/[^a-zA-Z0-9]+/g, "_")}`;
  const existingIds = new Set(pkg.entityInstances.map((entity) => entity.id));
  let index = 1;
  let candidate = `${base}_${index}` as EntityId;

  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `${base}_${index}` as EntityId;
  }

  return candidate;
}

function isWithinMap(map: MapDefinition, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}
