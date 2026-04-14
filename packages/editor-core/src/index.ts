import type { AdventurePackage, EntityInstance, MapDefinition } from "@acs/domain";

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
