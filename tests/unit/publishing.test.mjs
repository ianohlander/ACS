import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  attachStandaloneBundle,
  collectRuntimeAssets,
  createArtifactIntegrityReport,
  createForkableProjectPackageArchive,
  createForkableProjectExport,
  createReleaseReviewPackageArchive,
  createReleaseReviewPackageManifest,
  createStandaloneRuntimeExport,
  validatePublishArtifact
} from "../../packages/publishing/dist/index.js";
import { clone, loadSampleAdventure } from "./helpers/sample-adventure.mjs";

describe("publishing artifacts", () => {
  it("creates a forkable project artifact without mutating the source adventure", () => {
    const adventure = loadSampleAdventure();
    const original = clone(adventure);

    const artifact = createForkableProjectExport(adventure, {
      createdAt: "2026-04-23T00:00:00.000Z",
      releaseMetadata: {
        id: "rel_0008",
        label: "v8 forkable review",
        version: 8,
        notes: "Editable export check."
      }
    });

    assert.equal(artifact.artifactKind, "forkableProject");
    assert.equal(artifact.source.sourceTitle, adventure.metadata.title);
    assert.equal(artifact.authoring.preservesEditorMetadata, true);
    assert.equal(artifact.authoring.remixable, true);
    assert.equal(artifact.projectManifest.release.id, "rel_0008");
    assert.equal(artifact.projectManifest.release.label, "v8 forkable review");
    assert.equal(artifact.projectManifest.release.version, 8);
    assert.equal(artifact.projectManifest.release.notes, "Editable export check.");
    assert.equal(artifact.projectManifest.project.adventureId, adventure.metadata.id);
    assert.equal(artifact.projectManifest.project.schemaVersion, adventure.schemaVersion);
    assert.equal(artifact.projectManifest.content.starterLibraryPackCount, artifact.authoring.includedStarterLibraryPackIds.length);
    assert.equal(artifact.projectManifest.content.customLibraryObjectCount, artifact.authoring.customLibraryObjectCount);
    assert.equal(artifact.projectManifest.import.recommendedWorkflow, "create-project-from-forkable-artifact");
    assert.equal(artifact.projectManifest.handoff.recommendedFileName, `${adventure.metadata.slug}-forkable-project.json`);
    assert.equal(artifact.projectManifest.handoff.recommendedArchiveFileName, `${adventure.metadata.slug}-forkable-project-package.zip`);
    assert.equal(artifact.projectManifest.handoff.recommendedExtractedFolderName, `${adventure.metadata.slug}-forkable-project-package`);
    assert.equal(artifact.projectManifest.handoff.packagedArtifactFileName, "forkable-project.json");
    assert.equal(artifact.projectManifest.handoff.readmeHtml, "README.html");
    assert.equal(artifact.projectManifest.handoff.readmeText, "README.txt");
    assert.equal(artifact.projectManifest.handoff.releaseNotesText, "RELEASE-NOTES.txt");
    assert.equal(artifact.releaseHandoffManifest.packageFormat, "release-handoff-manifest");
    assert.equal(artifact.releaseHandoffManifest.release.label, "v8 forkable review");
    assert.equal(artifact.releaseHandoffManifest.artifacts.forkableProject.recommendedArchiveFileName, `${adventure.metadata.slug}-forkable-project-package.zip`);
    assert.equal(artifact.releaseHandoffManifest.artifacts.standalonePlayable.recommendedArchiveFileName, `${adventure.metadata.slug}-standalone-package.zip`);
    assert.equal(artifact.releaseHandoffManifest.handoff.recommendedFileName, `${adventure.metadata.slug}-release-handoff.json`);
    assert.equal(artifact.releaseHandoffManifest.handoff.packagedFileName, "RELEASE-HANDOFF.json");
    assert.ok(artifact.package);
    assert.equal(artifact.package.entryFile, "README.html");
    assert.ok(artifact.package.files.some((file) => file.path === "RELEASE-HANDOFF.json"));
    assert.ok(artifact.package.files.some((file) => file.path === "forkable-project.json"));
    assert.ok(artifact.package.files.some((file) => file.path === "project-manifest.json"));
    assert.ok(artifact.package.files.some((file) => file.path === "README.html"));
    assert.ok(artifact.package.files.some((file) => file.path === "README.txt"));
    assert.ok(artifact.package.files.some((file) => file.path === "RELEASE-NOTES.txt"));
    assert.ok(artifact.projectManifest.handoff.nextSteps.length > 0);
    assert.ok(artifact.projectManifest.knownLimitations.length > 0);
    assert.equal(validatePublishArtifact(artifact).length, 0);
    assert.deepEqual(adventure, original);
  });

  it("packages the forkable artifact as a handoff zip archive", () => {
    const artifact = createForkableProjectExport(loadSampleAdventure(), {
      releaseMetadata: {
        id: "rel_0009",
        label: "v9 remix handoff",
        version: 9,
        notes: "Editable package handoff review."
      }
    });

    const archive = createForkableProjectPackageArchive(artifact);
    const archiveText = Buffer.from(archive).toString("latin1");

    assert.equal(archive[0], 0x50);
    assert.equal(archive[1], 0x4b);
    assert.ok(archiveText.includes("README.html"));
    assert.ok(archiveText.includes("README.txt"));
    assert.ok(archiveText.includes("RELEASE-NOTES.txt"));
    assert.ok(archiveText.includes("RELEASE-HANDOFF.json"));
    assert.ok(archiveText.includes("forkable-project.json"));
    assert.ok(archiveText.includes("project-manifest.json"));
    assert.ok(archiveText.includes("v9 remix handoff"));
  });

  it("creates an artifact integrity report that verifies forkable and standalone parity", () => {
    const releaseMetadata = {
      id: "rel_0010",
      label: "v10 parity review",
      version: 10,
      notes: "Cross-artifact integrity review."
    };
    const forkableArtifact = createForkableProjectExport(loadSampleAdventure(), { releaseMetadata });
    const standaloneArtifact = attachStandaloneBundle(
      createStandaloneRuntimeExport(loadSampleAdventure(), { releaseMetadata }),
      {
        entryFile: "index.html",
        files: [
          { path: "index.html", contentType: "text/html; charset=utf-8", contents: "<html></html>" },
          { path: "README.html", contentType: "text/html; charset=utf-8", contents: "<html>readme</html>" },
          { path: "README.txt", contentType: "text/plain; charset=utf-8", contents: "readme" },
          { path: "RELEASE-NOTES.txt", contentType: "text/plain; charset=utf-8", contents: "notes" },
          { path: "RELEASE-HANDOFF.json", contentType: "application/json; charset=utf-8", contents: "{}" },
          { path: "bundle/adventure-package.json", contentType: "application/json; charset=utf-8", contents: "{}" },
          { path: "bundle/distribution-manifest.json", contentType: "application/json; charset=utf-8", contents: "{}" }
        ]
      }
    );

    const report = createArtifactIntegrityReport(forkableArtifact, standaloneArtifact, "2026-04-28T00:00:00.000Z");

    assert.equal(report.packageFormat, "artifact-integrity-report");
    assert.equal(report.release.id, "rel_0010");
    assert.equal(report.summary.failedCheckCount, 0);
    assert.equal(report.summary.readyForDistribution, true);
    assert.equal(report.handoff.recommendedFileName, `${forkableArtifact.adventure.metadata.slug}-artifact-integrity.json`);
    assert.ok(report.checks.every((check) => check.status === "pass"));
  });

  it("creates a release review package manifest and archive for reviewers", () => {
    const releaseMetadata = {
      id: "rel_0011",
      label: "v11 review package",
      version: 11,
      notes: "Reviewer bundle notes."
    };
    const forkableArtifact = createForkableProjectExport(loadSampleAdventure(), { releaseMetadata });
    const standaloneArtifact = attachStandaloneBundle(
      createStandaloneRuntimeExport(loadSampleAdventure(), { releaseMetadata }),
      {
        entryFile: "index.html",
        files: [
          { path: "index.html", contentType: "text/html; charset=utf-8", contents: "<html></html>" },
          { path: "RELEASE-HANDOFF.json", contentType: "application/json; charset=utf-8", contents: "{}" },
          { path: "bundle/adventure-package.json", contentType: "application/json; charset=utf-8", contents: "{}" },
          { path: "bundle/distribution-manifest.json", contentType: "application/json; charset=utf-8", contents: "{}" }
        ]
      }
    );
    const integrityReport = createArtifactIntegrityReport(forkableArtifact, standaloneArtifact, "2026-04-29T00:00:00.000Z");
    const reviewPackage = createReleaseReviewPackageManifest(forkableArtifact.releaseHandoffManifest, integrityReport);
    const archive = createReleaseReviewPackageArchive(reviewPackage);
    const archiveText = Buffer.from(archive).toString("latin1");

    assert.equal(reviewPackage.entryFile, "README.html");
    assert.equal(reviewPackage.handoff.recommendedArchiveFileName, `${forkableArtifact.adventure.metadata.slug}-release-review-package.zip`);
    assert.equal(reviewPackage.handoff.packagedIntegrityFileName, "ARTIFACT-INTEGRITY.json");
    assert.ok(reviewPackage.files.some((file) => file.path === "README.html"));
    assert.ok(reviewPackage.files.some((file) => file.path === "README.txt"));
    assert.ok(reviewPackage.files.some((file) => file.path === "RELEASE-NOTES.txt"));
    assert.ok(reviewPackage.files.some((file) => file.path === "ARTIFACT-INTEGRITY.json"));
    assert.ok(reviewPackage.files.some((file) => file.path === "RELEASE-HANDOFF.json"));
    assert.equal(archive[0], 0x50);
    assert.equal(archive[1], 0x4b);
    assert.ok(archiveText.includes("ARTIFACT-INTEGRITY.json"));
    assert.ok(archiveText.includes("RELEASE-HANDOFF.json"));
    assert.ok(archiveText.includes("v11 review package"));
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
    assert.equal(artifact.distributionManifest.handoff.readmeHtml, "README.html");
    assert.equal(artifact.distributionManifest.handoff.readmeText, "README.txt");
    assert.equal(artifact.distributionManifest.handoff.releaseNotesText, "RELEASE-NOTES.txt");
    assert.equal(artifact.distributionManifest.handoff.recommendedLaunchPath, "launch/run-local.cmd");
    assert.equal(artifact.distributionManifest.handoff.recommendedArchiveFileName, `${adventure.metadata.slug}-standalone-package.zip`);
    assert.equal(artifact.distributionManifest.handoff.recommendedExtractedFolderName, `${adventure.metadata.slug}-standalone-package`);
    assert.equal(artifact.releaseHandoffManifest.artifacts.forkableProject.packagedArtifactFileName, "forkable-project.json");
    assert.equal(artifact.releaseHandoffManifest.artifacts.standalonePlayable.recommendedLaunchPath, "launch/run-local.cmd");
    assert.equal(artifact.releaseHandoffManifest.handoff.recommendedFileName, `${adventure.metadata.slug}-release-handoff.json`);
    assert.deepEqual(artifact.distributionManifest.handoff.deliveryModes, [
      "bundled-local-launcher",
      "manual-static-hosting",
      "hosted-web-sharing"
    ]);
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
        { path: "RELEASE-HANDOFF.json", contentType: "application/json; charset=utf-8", contents: "{}" },
        { path: "bundle/adventure-package.json", contentType: "application/json; charset=utf-8", contents: "{}" }
      ]
    });

    assert.deepEqual(validatePublishArtifact(bundledArtifact), []);
  });
});
