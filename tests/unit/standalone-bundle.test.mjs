import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createStandaloneBundleArchive, createStandaloneRuntimeExport } from "../../packages/publishing/dist/index.js";
import { buildStandaloneBundle } from "../../apps/api/dist/standalone-bundle.js";
import { loadSampleAdventure } from "./helpers/sample-adventure.mjs";

describe("standalone bundle builder", () => {
  it("creates a playable bundle manifest with a runtime shell and packaged adventure", async () => {
    const artifact = createStandaloneRuntimeExport(loadSampleAdventure(), {
      releaseMetadata: {
        id: "rel_0042",
        label: "v42 distribution review",
        version: 42,
        notes: "Validates bundle metadata output."
      }
    });

    const bundle = await buildStandaloneBundle(artifact);
    const bundlePaths = new Set(bundle.files.map((file) => file.path));
    const indexFile = bundle.files.find((file) => file.path === "index.html");
    const packageFile = bundle.files.find((file) => file.path === "bundle/adventure-package.json");
    const distributionManifestFile = bundle.files.find((file) => file.path === "bundle/distribution-manifest.json");

    assert.equal(bundle.entryFile, "index.html");
    assert.ok(bundlePaths.has("dist/index.js"));
    assert.ok(bundlePaths.has("styles.css"));
    assert.ok(bundlePaths.has("bundle/standalone-metadata.json"));
    assert.ok(bundlePaths.has("bundle/distribution-manifest.json"));
    assert.ok(indexFile);
    assert.ok(indexFile.contents.includes("?package=./bundle/adventure-package.json&standalone=1"));
    assert.ok(!indexFile.contents.includes("Open Editor"));
    assert.ok(packageFile);
    assert.ok(packageFile.contents.includes(artifact.adventure.metadata.title));
    assert.ok(distributionManifestFile);
    assert.ok(distributionManifestFile.contents.includes("v42 distribution review"));
    assert.ok(distributionManifestFile.contents.includes("Validates bundle metadata output."));
  });

  it("packages the standalone bundle manifest as a zip archive", async () => {
    const artifact = createStandaloneRuntimeExport(loadSampleAdventure());
    const bundle = await buildStandaloneBundle(artifact);
    const archive = createStandaloneBundleArchive(bundle);
    const archiveText = Buffer.from(archive).toString("latin1");

    assert.equal(archive[0], 0x50);
    assert.equal(archive[1], 0x4b);
    assert.ok(archiveText.includes("index.html"));
    assert.ok(archiveText.includes("bundle/adventure-package.json"));
    assert.ok(archiveText.includes("bundle/distribution-manifest.json"));
    assert.ok(archiveText.includes("styles.css"));
  });
});
