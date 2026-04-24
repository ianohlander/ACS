export { createStandaloneBundleArchive } from "./standalone-archive.js";
export const PUBLISHING_ARTIFACT_SCHEMA_VERSION = "1.0.0";
export function createForkableProjectExport(adventure, options = {}) {
    const adventureCopy = cloneAdventure(adventure);
    return {
        schemaVersion: PUBLISHING_ARTIFACT_SCHEMA_VERSION,
        artifactKind: "forkableProject",
        source: createSourceMetadata(adventure, options),
        adventure: adventureCopy,
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
    return {
        schemaVersion: PUBLISHING_ARTIFACT_SCHEMA_VERSION,
        artifactKind: "standalonePlayable",
        source: createSourceMetadata(adventure, options),
        adventure: pruneUnusedAuthoringData(adventure, runtimeAssets),
        runtimeAssets,
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
        ...validateStandaloneBundle(artifact)
    ];
}
function validateNoEditorData(artifact) {
    return artifact.adventure.starterLibraryPacks.length === 0
        ? []
        : [createIssue("starterLibrariesIncluded", "Standalone playable artifact must not include starter library packs.")];
}
function validateRuntimeAssets(artifact) {
    return artifact.runtimeAssets.missingAssetIds.map((assetId) => createIssue("missingRuntimeAsset", `Runtime asset '${assetId}' is referenced but not present in the package.`));
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
function cloneAdventure(adventure) {
    return JSON.parse(JSON.stringify(adventure));
}
function createIssue(code, message) {
    return { code, message };
}
//# sourceMappingURL=index.js.map