import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateAdventure } from "../../packages/validation/dist/index.js";
import { clone, loadSampleAdventure, mapById } from "./helpers/sample-adventure.mjs";

describe("validation package", () => {
  it("accepts the sample adventure without blocking errors", () => {
    const report = validateAdventure(loadSampleAdventure());

    assert.equal(report.blocking, false);
    assert.equal(report.summary.errorCount, 0);
  });

  it("reports an error when an exit points at a missing map", () => {
    const adventure = clone(loadSampleAdventure());
    mapById(adventure, "map_meadow").exits[0].toMapId = "missing_map";

    const report = validateAdventure(adventure);

    assert.equal(report.blocking, true);
    assert.ok(report.issues.some((issue) => issue.code === "unknown_exit_target_map"));
  });

  it("reports an error when a tile layer does not match map dimensions", () => {
    const adventure = clone(loadSampleAdventure());
    mapById(adventure, "map_meadow").tileLayers[0].tileIds.pop();

    const report = validateAdventure(adventure);

    assert.equal(report.blocking, true);
    assert.ok(report.issues.some((issue) => issue.code === "tile_count_mismatch"));
  });
});
