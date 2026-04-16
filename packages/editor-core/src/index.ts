import type { AdventurePackage, EntityDefId, EntityDefinition, EntityId, EntityInstance, MapDefinition } from "@acs/domain";

export function cloneAdventurePackage(pkg: AdventurePackage): AdventurePackage {
  return JSON.parse(JSON.stringify(pkg)) as AdventurePackage;
}

export function getMapById(pkg: AdventurePackage, mapId: MapDefinition["id"]): MapDefinition | undefined {
  return pkg.maps.find((map) => map.id === mapId);
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

  return [...values].sort();
}

export function listEntityDefinitions(pkg: AdventurePackage): EntityDefinition[] {
  return [...pkg.entityDefinitions].sort((a, b) => a.name.localeCompare(b.name));
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
