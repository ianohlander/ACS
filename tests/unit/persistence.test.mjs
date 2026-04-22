import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createGameEngine } from "../../packages/runtime-core/dist/index.js";
import { CURRENT_RUNTIME_SAVE_SCHEMA_VERSION, migrateRuntimeSaveRecord } from "../../packages/persistence/dist/index.js";
import { loadSampleAdventure } from "./helpers/sample-adventure.mjs";

describe("persistence package", () => {
  it("round-trips runtime snapshots without inventing a second state model", () => {
    const adventure = loadSampleAdventure();
    const session = createGameEngine().loadAdventure(adventure);
    const snapshot = session.serializeSnapshot();

    const record = {
      id: "unit-save",
      label: "Unit Save",
      adventureId: adventure.metadata.id,
      adventureTitle: adventure.metadata.title,
      saveSchemaVersion: CURRENT_RUNTIME_SAVE_SCHEMA_VERSION,
      savedAt: new Date(0).toISOString(),
      snapshot
    };
    const restored = migrateRuntimeSaveRecord(record);

    assert.deepEqual(restored.snapshot, snapshot);
    assert.equal(restored.snapshot.currentMapId, adventure.startState.mapId);
  });
});
