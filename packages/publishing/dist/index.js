export { createStandaloneBundleArchive } from "./standalone-archive.js";
export { createForkableProjectPackageArchive } from "./forkable-package.js";
export const PUBLISHING_ARTIFACT_SCHEMA_VERSION = "1.0.0";
export function createForkableProjectExport(adventure, options = {}) {
    const adventureCopy = cloneAdventure(adventure);
    const createdAt = options.createdAt ?? new Date().toISOString();
    const projectManifest = createForkableProjectManifest(adventureCopy, createdAt, options.releaseMetadata);
    const runtimeAssets = collectRuntimeAssets(adventureCopy);
    const distributionManifest = createStandaloneDistributionManifest(adventureCopy, runtimeAssets, createdAt, options.releaseMetadata);
    const releaseHandoffManifest = createReleaseHandoffManifest(projectManifest, distributionManifest, createdAt);
    return {
        schemaVersion: PUBLISHING_ARTIFACT_SCHEMA_VERSION,
        artifactKind: "forkableProject",
        source: createSourceMetadata(adventure, { ...options, createdAt }),
        adventure: adventureCopy,
        projectManifest,
        releaseHandoffManifest,
        package: createForkablePackageManifest(adventureCopy, projectManifest, releaseHandoffManifest),
        authoring: {
            includedStarterLibraryPackIds: adventureCopy.starterLibraryPacks.map((pack) => pack.id),
            customLibraryObjectCount: adventureCopy.customLibraryObjects.length,
            preservesEditorMetadata: true,
            remixable: true
        }
    };
}
export function createStandaloneRuntimeExport(adventure, options = {}) {
    const runtimeAssets = collectRuntimeAssets(adventure);
    const createdAt = options.createdAt ?? new Date().toISOString();
    const projectManifest = createForkableProjectManifest(adventure, createdAt, options.releaseMetadata);
    const distributionManifest = createStandaloneDistributionManifest(adventure, runtimeAssets, createdAt, options.releaseMetadata);
    return {
        schemaVersion: PUBLISHING_ARTIFACT_SCHEMA_VERSION,
        artifactKind: "standalonePlayable",
        source: createSourceMetadata(adventure, { ...options, createdAt }),
        adventure: pruneUnusedAuthoringData(adventure, runtimeAssets),
        runtimeAssets,
        distributionManifest,
        releaseHandoffManifest: createReleaseHandoffManifest(projectManifest, distributionManifest, createdAt),
        distribution: {
            editorIncluded: false,
            authoringNotesIncluded: false,
            starterLibrariesIncluded: false
        }
    };
}
export function attachStandaloneBundle(artifact, bundle) {
    return {
        ...artifact,
        bundle
    };
}
export function collectRuntimeAssets(adventure) {
    const availableIds = new Set(adventure.assets.map((asset) => asset.id));
    const referencedIds = collectReferencedAssetIds(adventure, availableIds);
    return {
        assetIds: [...referencedIds].filter((id) => availableIds.has(id)),
        mediaCueIds: adventure.mediaCues.map((cue) => cue.id),
        soundCueIds: adventure.soundCues.map((cue) => cue.id),
        missingAssetIds: [...referencedIds].filter((id) => !availableIds.has(id))
    };
}
export function pruneUnusedAuthoringData(adventure, runtimeAssets = collectRuntimeAssets(adventure)) {
    const runtimeAssetIds = new Set(runtimeAssets.assetIds);
    return {
        ...cloneAdventure(adventure),
        assets: adventure.assets.filter((asset) => runtimeAssetIds.has(asset.id)),
        starterLibraryPacks: []
    };
}
export function validatePublishArtifact(artifact) {
    return [
        ...validateArtifactHeader(artifact),
        ...validateForkableArtifact(artifact),
        ...validateStandaloneArtifact(artifact)
    ];
}
function validateArtifactHeader(artifact) {
    if (artifact.schemaVersion !== PUBLISHING_ARTIFACT_SCHEMA_VERSION) {
        return [createIssue("schemaVersion", "Publishing artifact schema version is not supported.")];
    }
    return [];
}
function validateStandaloneArtifact(artifact) {
    if (artifact.artifactKind !== "standalonePlayable") {
        return [];
    }
    return [
        ...validateNoEditorData(artifact),
        ...validateRuntimeAssets(artifact),
        ...validateDistributionManifest(artifact),
        ...validateStandaloneBundle(artifact)
    ];
}
function validateForkableArtifact(artifact) {
    if (artifact.artifactKind !== "forkableProject") {
        return [];
    }
    const issues = [];
    if (!artifact.projectManifest.release.label.trim()) {
        issues.push(createIssue("missingForkableReleaseLabel", "Forkable project manifest is missing a release label."));
    }
    if (!artifact.projectManifest.handoff.recommendedFileName.trim()) {
        issues.push(createIssue("missingForkableFileName", "Forkable project manifest is missing a recommended file name."));
    }
    if (!artifact.projectManifest.handoff.recommendedArchiveFileName.trim()) {
        issues.push(createIssue("missingForkableArchiveName", "Forkable project manifest is missing a recommended archive file name."));
    }
    if (!artifact.projectManifest.handoff.recommendedExtractedFolderName.trim()) {
        issues.push(createIssue("missingForkableFolderName", "Forkable project manifest is missing a recommended extracted folder name."));
    }
    if (!artifact.projectManifest.handoff.packagedArtifactFileName.trim()) {
        issues.push(createIssue("missingForkablePackagedArtifactFile", "Forkable project manifest is missing its packaged artifact file name."));
    }
    if (!artifact.projectManifest.handoff.readmeHtml.trim() || !artifact.projectManifest.handoff.readmeText.trim()) {
        issues.push(createIssue("missingForkableReadme", "Forkable project manifest is missing its packaged handoff instruction files."));
    }
    if (!artifact.projectManifest.handoff.releaseNotesText.trim()) {
        issues.push(createIssue("missingForkableReleaseNotesFile", "Forkable project manifest is missing its packaged release-notes file."));
    }
    if (!artifact.projectManifest.handoff.recommendedImportArea.trim()) {
        issues.push(createIssue("missingForkableImportArea", "Forkable project manifest is missing its recommended import area."));
    }
    if (artifact.projectManifest.handoff.nextSteps.length === 0) {
        issues.push(createIssue("missingForkableNextSteps", "Forkable project manifest should describe at least one handoff next step."));
    }
    if (artifact.projectManifest.knownLimitations.length === 0) {
        issues.push(createIssue("missingForkableKnownLimitations", "Forkable project manifest should document at least one known limitation."));
    }
    if (artifact.package) {
        const packagePaths = new Set(artifact.package.files.map((file) => file.path));
        if (!packagePaths.has(artifact.projectManifest.handoff.packagedArtifactFileName)) {
            issues.push(createIssue("missingForkablePackageArtifact", `Forkable package is missing '${artifact.projectManifest.handoff.packagedArtifactFileName}'.`));
        }
        if (!packagePaths.has("project-manifest.json")) {
            issues.push(createIssue("missingForkablePackageManifest", "Forkable package is missing project-manifest.json."));
        }
        if (!packagePaths.has("RELEASE-HANDOFF.json")) {
            issues.push(createIssue("missingForkableReleaseHandoffManifest", "Forkable package is missing RELEASE-HANDOFF.json."));
        }
    }
    return issues;
}
function validateNoEditorData(artifact) {
    return artifact.adventure.starterLibraryPacks.length === 0
        ? []
        : [createIssue("starterLibrariesIncluded", "Standalone playable artifact must not include starter library packs.")];
}
function validateRuntimeAssets(artifact) {
    return artifact.runtimeAssets.missingAssetIds.map((assetId) => createIssue("missingRuntimeAsset", `Runtime asset '${assetId}' is referenced but not present in the package.`));
}
function validateDistributionManifest(artifact) {
    const issues = [];
    if (!artifact.distributionManifest.release.label.trim()) {
        issues.push(createIssue("missingReleaseLabel", "Standalone distribution manifest is missing a release label."));
    }
    if (!artifact.distributionManifest.package.entryFile.trim()) {
        issues.push(createIssue("missingPackageEntry", "Standalone distribution manifest is missing a package entry file."));
    }
    if (!artifact.distributionManifest.launcher.windowsPowerShellScript.trim()) {
        issues.push(createIssue("missingLauncherScript", "Standalone distribution manifest is missing its Windows PowerShell launcher path."));
    }
    if (!artifact.distributionManifest.handoff.readmeHtml.trim() || !artifact.distributionManifest.handoff.readmeText.trim()) {
        issues.push(createIssue("missingHandoffReadme", "Standalone distribution manifest is missing its packaged handoff instruction files."));
    }
    if (!artifact.distributionManifest.handoff.releaseNotesText.trim()) {
        issues.push(createIssue("missingReleaseNotesFile", "Standalone distribution manifest is missing its packaged release-notes file."));
    }
    if (!artifact.distributionManifest.handoff.recommendedArchiveFileName.trim()) {
        issues.push(createIssue("missingRecommendedArchiveName", "Standalone distribution manifest is missing its recommended archive file name."));
    }
    if (!artifact.distributionManifest.handoff.recommendedExtractedFolderName.trim()) {
        issues.push(createIssue("missingRecommendedFolderName", "Standalone distribution manifest is missing its recommended extracted folder name."));
    }
    if (artifact.distributionManifest.knownLimitations.length === 0) {
        issues.push(createIssue("missingKnownLimitations", "Standalone distribution manifest should document at least one known limitation."));
    }
    return issues;
}
function validateStandaloneBundle(artifact) {
    if (!artifact.bundle) {
        return [];
    }
    const bundlePaths = new Set(artifact.bundle.files.map((file) => file.path));
    const issues = [];
    if (!bundlePaths.has(artifact.bundle.entryFile)) {
        issues.push(createIssue("missingBundleEntry", `Standalone bundle is missing its entry file '${artifact.bundle.entryFile}'.`));
    }
    if (!bundlePaths.has("bundle/adventure-package.json")) {
        issues.push(createIssue("missingAdventurePackage", "Standalone bundle is missing bundle/adventure-package.json."));
    }
    if (!bundlePaths.has("RELEASE-HANDOFF.json")) {
        issues.push(createIssue("missingReleaseHandoffManifest", "Standalone bundle is missing RELEASE-HANDOFF.json."));
    }
    return issues;
}
function collectReferencedAssetIds(adventure, availableIds) {
    const assetIds = new Set();
    addOptionalAsset(assetIds, adventure.presentation.splashAssetId);
    addOptionalAsset(assetIds, adventure.presentation.startingMusicAssetId);
    adventure.mediaCues.forEach((cue) => assetIds.add(cue.assetId));
    adventure.soundCues.forEach((cue) => assetIds.add(cue.assetId));
    collectVisualAssets(adventure, assetIds, availableIds);
    return assetIds;
}
function collectVisualAssets(adventure, assetIds, availableIds) {
    adventure.entityDefinitions.forEach((definition) => {
        addKnownAsset(assetIds, availableIds, definition.assetId);
        addVisualBindingAssets(assetIds, availableIds, definition.visual);
    });
    adventure.itemDefinitions.forEach((definition) => {
        addKnownAsset(assetIds, availableIds, definition.assetId);
        addVisualBindingAssets(assetIds, availableIds, definition.visual);
    });
    adventure.tileDefinitions.forEach((definition) => addVisualBindingAssets(assetIds, availableIds, definition.visual));
    adventure.spellDefinitions.forEach((definition) => addVisualBindingAssets(assetIds, availableIds, definition.visual));
}
function addVisualBindingAssets(assetIds, availableIds, visual) {
    addKnownAsset(assetIds, availableIds, visual?.assetId);
    addKnownAsset(assetIds, availableIds, visual?.portraitAssetId);
}
function addKnownAsset(assetIds, availableIds, assetId) {
    if (assetId && availableIds.has(assetId)) {
        assetIds.add(assetId);
    }
}
function addOptionalAsset(assetIds, assetId) {
    if (assetId) {
        assetIds.add(assetId);
    }
}
function createSourceMetadata(adventure, options) {
    return {
        sourceAdventureId: adventure.metadata.id,
        sourceTitle: adventure.metadata.title,
        createdAt: options.createdAt ?? new Date().toISOString(),
        sourceSchemaVersion: adventure.schemaVersion
    };
}
function createStandaloneDistributionManifest(adventure, runtimeAssets, createdAt, releaseMetadata) {
    return {
        packageFormat: "static-web-bundle",
        generatedAt: createdAt,
        release: {
            id: releaseMetadata?.id?.trim() || "unversioned-release",
            label: releaseMetadata?.label?.trim() || "Standalone Preview",
            version: releaseMetadata?.version ?? 0,
            notes: releaseMetadata?.notes?.trim() ?? ""
        },
        package: {
            adventureId: adventure.metadata.id,
            title: adventure.metadata.title,
            slug: adventure.metadata.slug,
            entryFile: "index.html"
        },
        content: {
            runtimeAssetCount: runtimeAssets.assetIds.length,
            mediaCueCount: runtimeAssets.mediaCueIds.length,
            soundCueCount: runtimeAssets.soundCueIds.length
        },
        launcher: {
            localServerIncluded: true,
            defaultPort: 4317,
            windowsPowerShellScript: "launch/run-local.ps1",
            windowsCommandScript: "launch/run-local.cmd",
            opensBrowser: true,
            notes: [
                "The bundled launcher starts a tiny local static web server and opens the game in the default browser.",
                "The launcher is a convenience layer over the same exported static web bundle, not a separate runtime."
            ]
        },
        handoff: {
            readmeHtml: "README.html",
            readmeText: "README.txt",
            releaseNotesText: "RELEASE-NOTES.txt",
            recommendedLaunchPath: "launch/run-local.cmd",
            recommendedArchiveFileName: `${adventure.metadata.slug}-standalone-package.zip`,
            recommendedExtractedFolderName: `${adventure.metadata.slug}-standalone-package`,
            deliveryModes: [
                "bundled-local-launcher",
                "manual-static-hosting",
                "hosted-web-sharing"
            ]
        },
        knownLimitations: [
            "Standalone export is packaged for browser play. Desktop and mobile wrappers remain future work.",
            "This MVP package is distribution-focused and does not include the editor or authoring metadata."
        ]
    };
}
function createReleaseHandoffManifest(projectManifest, distributionManifest, createdAt) {
    return {
        packageFormat: "release-handoff-manifest",
        generatedAt: createdAt,
        release: {
            id: projectManifest.release.id,
            label: projectManifest.release.label,
            version: projectManifest.release.version,
            notes: projectManifest.release.notes
        },
        project: {
            adventureId: projectManifest.project.adventureId,
            title: projectManifest.project.title,
            slug: projectManifest.project.slug,
            schemaVersion: projectManifest.project.schemaVersion
        },
        artifacts: {
            forkableProject: {
                packageFormat: projectManifest.packageFormat,
                recommendedFileName: projectManifest.handoff.recommendedFileName,
                recommendedArchiveFileName: projectManifest.handoff.recommendedArchiveFileName,
                recommendedExtractedFolderName: projectManifest.handoff.recommendedExtractedFolderName,
                packagedArtifactFileName: projectManifest.handoff.packagedArtifactFileName,
                entryFile: projectManifest.handoff.readmeHtml,
                packagedFileCount: 6,
                recommendedImportArea: projectManifest.handoff.recommendedImportArea,
                releaseNotesText: projectManifest.handoff.releaseNotesText,
                handoffGuideHtml: projectManifest.handoff.readmeHtml,
                handoffGuideText: projectManifest.handoff.readmeText
            },
            standalonePlayable: {
                packageFormat: distributionManifest.packageFormat,
                recommendedArchiveFileName: distributionManifest.handoff.recommendedArchiveFileName,
                recommendedExtractedFolderName: distributionManifest.handoff.recommendedExtractedFolderName,
                entryFile: distributionManifest.package.entryFile,
                recommendedLaunchPath: distributionManifest.handoff.recommendedLaunchPath,
                launcherScript: distributionManifest.launcher.windowsPowerShellScript,
                launcherCommand: distributionManifest.launcher.windowsCommandScript,
                handoffGuideHtml: distributionManifest.handoff.readmeHtml,
                handoffGuideText: distributionManifest.handoff.readmeText,
                releaseNotesText: distributionManifest.handoff.releaseNotesText,
                deliveryModes: [...distributionManifest.handoff.deliveryModes],
                runtimeAssetCount: distributionManifest.content.runtimeAssetCount,
                mediaCueCount: distributionManifest.content.mediaCueCount,
                soundCueCount: distributionManifest.content.soundCueCount
            }
        },
        recommendedUse: {
            designers: "forkableProject",
            players: "standalonePlayable"
        },
        handoff: {
            recommendedFileName: `${projectManifest.project.slug}-release-handoff.json`,
            packagedFileName: "RELEASE-HANDOFF.json"
        },
        knownLimitations: [
            ...new Set([
                ...projectManifest.knownLimitations,
                ...distributionManifest.knownLimitations
            ])
        ]
    };
}
function createForkableProjectManifest(adventure, createdAt, releaseMetadata) {
    return {
        packageFormat: "forkable-project-json",
        generatedAt: createdAt,
        release: {
            id: releaseMetadata?.id?.trim() || "unversioned-release",
            label: releaseMetadata?.label?.trim() || "Forkable Preview",
            version: releaseMetadata?.version ?? 0,
            notes: releaseMetadata?.notes?.trim() ?? ""
        },
        project: {
            adventureId: adventure.metadata.id,
            title: adventure.metadata.title,
            slug: adventure.metadata.slug,
            schemaVersion: adventure.schemaVersion
        },
        content: {
            starterLibraryPackCount: adventure.starterLibraryPacks.length,
            customLibraryObjectCount: adventure.customLibraryObjects.length,
            mapCount: adventure.maps.length,
            questDefinitionCount: adventure.questDefinitions.length,
            triggerCount: adventure.triggers.length,
            assetCount: adventure.assets.length
        },
        import: {
            recommendedWorkflow: "create-project-from-forkable-artifact",
            editableInEditor: true,
            starterLibrariesIncluded: true,
            editorMetadataIncluded: true,
            remixable: true
        },
        handoff: {
            recommendedFileName: `${adventure.metadata.slug}-forkable-project.json`,
            recommendedArchiveFileName: `${adventure.metadata.slug}-forkable-project-package.zip`,
            recommendedExtractedFolderName: `${adventure.metadata.slug}-forkable-project-package`,
            packagedArtifactFileName: "forkable-project.json",
            readmeHtml: "README.html",
            readmeText: "README.txt",
            releaseNotesText: "RELEASE-NOTES.txt",
            recommendedImportArea: "Editor Test & Publish / future import flow",
            nextSteps: [
                "Create or open an ACS project, then import this forkable artifact into the editor workflow.",
                "Review included starter packs, custom library objects, and release notes before remixing.",
                "Save the imported draft as a new project so your edits stay separate from the source release."
            ]
        },
        knownLimitations: [
            "Forkable export is currently delivered as JSON metadata and adventure data, not as a packaged editor bundle.",
            "A dedicated import wizard and richer fork workflow remain future milestone work."
        ]
    };
}
function createForkablePackageManifest(adventure, projectManifest, releaseHandoffManifest) {
    return {
        entryFile: projectManifest.handoff.readmeHtml,
        files: [
            {
                path: projectManifest.handoff.readmeHtml,
                contentType: "text/html; charset=utf-8",
                contents: createForkableReadmeHtml(adventure, projectManifest)
            },
            {
                path: projectManifest.handoff.readmeText,
                contentType: "text/plain; charset=utf-8",
                contents: createForkableReadmeText(projectManifest)
            },
            {
                path: projectManifest.handoff.releaseNotesText,
                contentType: "text/plain; charset=utf-8",
                contents: createForkableReleaseNotesText(projectManifest)
            },
            {
                path: "RELEASE-HANDOFF.json",
                contentType: "application/json; charset=utf-8",
                contents: JSON.stringify(releaseHandoffManifest, null, 2)
            },
            {
                path: projectManifest.handoff.packagedArtifactFileName,
                contentType: "application/json; charset=utf-8",
                contents: JSON.stringify({
                    schemaVersion: PUBLISHING_ARTIFACT_SCHEMA_VERSION,
                    artifactKind: "forkableProject",
                    adventure,
                    projectManifest,
                    releaseHandoffManifest
                }, null, 2)
            },
            {
                path: "project-manifest.json",
                contentType: "application/json; charset=utf-8",
                contents: JSON.stringify(projectManifest, null, 2)
            }
        ]
    };
}
function createForkableReadmeHtml(adventure, projectManifest) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(adventure.metadata.title)} Forkable Package</title>
  </head>
  <body>
    <h1>${escapeHtml(adventure.metadata.title)}: Forkable Project Package</h1>
    <p>This package is the editable handoff for the published ACS release <strong>${escapeHtml(projectManifest.release.label)}</strong>.</p>
    <h2>Next Steps</h2>
    <ol>${projectManifest.handoff.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
    <h2>Included Files</h2>
    <ul>
      <li><code>${escapeHtml(projectManifest.handoff.packagedArtifactFileName)}</code></li>
      <li><code>project-manifest.json</code></li>
      <li><code>RELEASE-HANDOFF.json</code></li>
      <li><code>${escapeHtml(projectManifest.handoff.releaseNotesText)}</code></li>
    </ul>
  </body>
</html>`;
}
function createForkableReadmeText(projectManifest) {
    return [
        `${projectManifest.project.title} - Forkable Project Package`,
        "",
        `Source release: ${projectManifest.release.label} (${projectManifest.release.id})`,
        `Recommended import area: ${projectManifest.handoff.recommendedImportArea}`,
        "",
        "Next steps:",
        ...projectManifest.handoff.nextSteps.map((step) => `- ${step}`),
        "",
        "Included files:",
        `- ${projectManifest.handoff.packagedArtifactFileName}`,
        "- project-manifest.json",
        "- RELEASE-HANDOFF.json",
        `- ${projectManifest.handoff.releaseNotesText}`
    ].join("\n");
}
function createForkableReleaseNotesText(projectManifest) {
    return [
        `Release label: ${projectManifest.release.label}`,
        `Release id: ${projectManifest.release.id}`,
        `Release version: ${projectManifest.release.version}`,
        "",
        projectManifest.release.notes || "No release notes were provided for this published release."
    ].join("\n");
}
function cloneAdventure(adventure) {
    return JSON.parse(JSON.stringify(adventure));
}
function createIssue(code, message) {
    return { code, message };
}
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}
//# sourceMappingURL=index.js.map