import type { AdventurePackage, EntityInstance } from "@acs/domain";

import type { GameSessionState, InventoryState, RuntimeEntityState, RuntimeSnapshot } from "./types.js";

export function createInitialState(pkg: AdventurePackage): GameSessionState {
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
    inventory: createInitialInventory(pkg),
    flags: { ...(pkg.startState.initialFlags ?? {}) },
    questStages: { ...(pkg.startState.initialQuestStages ?? {}) },
    entities: pkg.entityInstances.map((entity) => createRuntimeEntity(entity)),
    tileOverrides: {},
    completedTriggers: [],
    activeDialogue: undefined,
    turn: 0
  };
}

export function hydrateState(pkg: AdventurePackage, snapshot: RuntimeSnapshot): GameSessionState {
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

function createInitialInventory(pkg: AdventurePackage): InventoryState {
  const inventory: InventoryState = {};
  const definitionsById = new Map(pkg.entityDefinitions.map((definition) => [definition.id, definition]));

  for (const partyMemberId of pkg.startState.party) {
    const definition = definitionsById.get(partyMemberId);
    for (const possession of definition?.startingPossessions ?? []) {
      const quantity = possession.quantity ?? 1;
      inventory[possession.itemId] = (inventory[possession.itemId] ?? 0) + quantity;
    }
  }

  return inventory;
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
