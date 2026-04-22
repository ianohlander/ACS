import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addEntityInstance,
  createMapDefinition,
  createTileDefinition,
  listTilePalette,
  moveEntityInstance,
  setClassicPixelSpritePixel,
  setTileAt,
  upsertExitDefinition
} from "../../packages/editor-core/dist/index.js";
import { loadSampleAdventure, mapById } from "./helpers/sample-adventure.mjs";

describe("editor-core operations", () => {
  it("creates maps as cloned package data with a filled base layer", () => {
    const adventure = loadSampleAdventure();
    const next = createMapDefinition(adventure, {
      name: "Test Lab",
      kind: "interior",
      width: 3,
      height: 2,
      fillTileId: "steel_deck"
    });

    assert.equal(adventure.maps.some((map) => map.name === "Test Lab"), false);
    const created = next.maps.find((map) => map.name === "Test Lab");
    assert.ok(created);
    assert.equal(created.tileLayers[0].tileIds.length, 6);
    assert.ok(created.tileLayers[0].tileIds.every((tileId) => tileId === "steel_deck"));
  });

  it("paints a tile by coordinate without mutating the source package", () => {
    const adventure = loadSampleAdventure();
    const next = setTileAt(adventure, "map_meadow", 1, 1, "force_field");

    assert.equal(mapById(adventure, "map_meadow").tileLayers[0].tileIds[9], "path");
    assert.equal(mapById(next, "map_meadow").tileLayers[0].tileIds[9], "force_field");
  });

  it("adds tile definitions into the reusable tile palette", () => {
    const next = createTileDefinition(loadSampleAdventure(), {
      idSeed: "Quantum Floor",
      name: "Quantum Floor",
      passability: "conditional",
      tags: ["test", "sci-fi"]
    });

    assert.ok(next.tileDefinitions.some((tile) => tile.id === "quantum_floor"));
    assert.ok(listTilePalette(next, "map_meadow").includes("quantum_floor"));
  });

  it("places and moves named entity instances from reusable definitions", () => {
    const added = addEntityInstance(loadSampleAdventure(), "def_security_drone", "map_meadow", 2, 2, {
      displayName: "Test Drone",
      behaviorOverride: "guard"
    });
    const instance = added.entityInstances.find((entity) => entity.displayName === "Test Drone");

    assert.ok(instance);
    assert.equal(instance.behaviorOverride, "guard");

    const moved = moveEntityInstance(added, instance.id, "map_shrine", 2, 3);
    const movedInstance = moved.entityInstances.find((entity) => entity.id === instance.id);

    assert.equal(movedInstance.mapId, "map_shrine");
    assert.equal(movedInstance.x, 2);
    assert.equal(movedInstance.y, 3);
  });

  it("creates or updates exits as structured map link records", () => {
    const next = upsertExitDefinition(loadSampleAdventure(), "map_meadow", {
      x: 0,
      y: 0,
      toMapId: "map_shrine",
      toX: 1,
      toY: 4
    });

    const exit = mapById(next, "map_meadow").exits.find((candidate) => candidate.x === 0 && candidate.y === 0);

    assert.ok(exit);
    assert.equal(exit.toMapId, "map_shrine");
    assert.equal(exit.toX, 1);
    assert.equal(exit.toY, 4);
  });

  it("updates classic pixel sprite pixels while clamping palette indexes", () => {
    const adventure = loadSampleAdventure();
    const next = setClassicPixelSpritePixel(adventure, "pixel_solar_gate", 0, 0, 999);
    const sprite = next.visualManifests[0].pixelSprites.find((candidate) => candidate.id === "pixel_solar_gate");

    assert.equal(sprite.pixels[0], sprite.palette.length - 1);
  });
});
