import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  attachStandaloneBundle,
  collectRuntimeAssets,
  createForkableProjectExport,
  createStandaloneRuntimeExport,
  validatePublishArtifact
} from "../../packages/publishing/dist/index.js";
import { clone, loadSampleAdventure } from "./helpers/sample-adventure.mjs";

describe("publishing artifacts", () => {
  it("creates a forkable project artifact without mutating the source adventure", () => {
    const adventure = loadSampleAdventure();
    const original = clone(adventure);

    const artifact = createForkableProjectExport(adventure, { createdAt: "2026-04-23T00:00:00.000Z" });

    assert.equal(artifact.artifactKind, "forkableProject");
    assert.equal(artifact.source.sourceTitle, adventure.metadata.title);
    assert.equal(artifact.authoring.preservesEditorMetadata, true);
    assert.equal(artifact.authoring.remixable, true);
    assert.deepEqual(adventure, original);
  });

  it("creates a standalone playable artifact that strips starter packs", () => {
    const adventure = loadSampleAdventure();

    const artifact = createStandaloneRuntimeExport(adventure, {
      createdAt: "2026-04-23T00:00:00.000Z",
      releaseMetadata: {
        id: "rel_0007",
        label: "v7",
        version: 7,
        notes: "Distribution review candidate."
      }
    });

    assert.equal(artifact.artifactKind, "standalonePlayable");
    assert.equal(artifact.distribution.editorIncluded, false);
    assert.equal(artifact.distribution.starterLibrariesIncluded, false);
    assert.equal(artifact.adventure.starterLibraryPacks.length, 0);
    assert.equal(artifact.distributionManifest.release.id, "rel_0007");
    assert.equal(artifact.distributionManifest.release.label, "v7");
    assert.equal(artifact.distributionManifest.release.version, 7);
    assert.equal(artifact.distributionManifest.release.notes, "Distribution review candidate.");
    assert.equal(artifact.distributionManifest.package.entryFile, "index.html");
    assert.equal(artifact.distributionManifest.launcher.localServerIncluded, true);
    assert.equal(artifact.distributionManifest.launcher.defaultPort, 4317);
    assert.equal(artifact.distributionManifest.launcher.windowsPowerShellScript, "launch/run-local.ps1");
    assert.equal(artifact.distributionManifest.launcher.windowsCommandScript, "launch/run-local.cmd");
    assert.ok(artifact.distributionManifest.launcher.notes.length > 0);
    assert.ok(artifact.distributionManifest.knownLimitations.length > 0);
    assert.equal(validatePublishArtifact(artifact).length, 0);
  });

  it("collects runtime asset dependencies from presentation and cue references", () => {
    const adventure = loadSampleAdventure();
    const runtimeAssets = collectRuntimeAssets(adventure);

    assert.ok(runtimeAssets.assetIds.includes(adventure.presentation.splashAssetId));
    assert.ok(runtimeAssets.assetIds.includes(adventure.presentation.startingMusicAssetId));
    assert.ok(runtimeAssets.mediaCueIds.length > 0);
    assert.ok(runtimeAssets.soundCueIds.length > 0);
    assert.deepEqual(runtimeAssets.missingAssetIds, []);
  });

  it("reports missing runtime assets before a standalone artifact is accepted", () => {
    const adventure = loadSampleAdventure();
    adventure.presentation.splashAssetId = "missing_asset";

    const artifact = createStandaloneRuntimeExport(adventure);
    const issues = validatePublishArtifact(artifact);

    assert.deepEqual(issues.map((issue) => issue.code), ["missingRuntimeAsset"]);
  });

  it("accepts a standalone artifact when a valid bundle manifest is attached", () => {
    const adventure = loadSampleAdventure();
    const artifact = createStandaloneRuntimeExport(adventure);
    const bundledArtifact = attachStandaloneBundle(artifact, {
      entryFile: "index.html",
      files: [
        { path: "index.html", contentType: "text/html; charset=utf-8", contents: "<html></html>" },
        { path: "bundle/adventure-package.json", contentType: "application/json; charset=utf-8", contents: "{}" }
      ]
    });

    assert.deepEqual(validatePublishArtifact(bundledArtifact), []);
  });
});
