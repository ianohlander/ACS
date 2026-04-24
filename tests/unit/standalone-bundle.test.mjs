import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createStandaloneRuntimeExport } from "../../packages/publishing/dist/index.js";
import { buildStandaloneBundle } from "../../apps/api/dist/standalone-bundle.js";
import { loadSampleAdventure } from "./helpers/sample-adventure.mjs";

describe("standalone bundle builder", () => {
  it("creates a playable bundle manifest with a runtime shell and packaged adventure", async () => {
    const artifact = createStandaloneRuntimeExport(loadSampleAdventure());

    const bundle = await buildStandaloneBundle(artifact);
    const bundlePaths = new Set(bundle.files.map((file) => file.path));
    const indexFile = bundle.files.find((file) => file.path === "index.html");
    const packageFile = bundle.files.find((file) => file.path === "bundle/adventure-package.json");

    assert.equal(bundle.entryFile, "index.html");
    assert.ok(bundlePaths.has("dist/index.js"));
    assert.ok(bundlePaths.has("styles.css"));
    assert.ok(bundlePaths.has("bundle/standalone-metadata.json"));
    assert.ok(indexFile);
    assert.ok(indexFile.contents.includes("?package=./bundle/adventure-package.json&standalone=1"));
    assert.ok(!indexFile.contents.includes("Open Editor"));
    assert.ok(packageFile);
    assert.ok(packageFile.contents.includes(artifact.adventure.metadata.title));
  });
});
