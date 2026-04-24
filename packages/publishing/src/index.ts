import type { AdventurePackage, AssetId, AssetRecord } from "@acs/domain";

export const PUBLISHING_ARTIFACT_SCHEMA_VERSION = "1.0.0";

export type PublishArtifactKind = "forkableProject" | "standalonePlayable";

export interface PublishingSourceMetadata {
  sourceAdventureId: string;
  sourceTitle: string;
  createdAt: string;
  sourceSchemaVersion: string;
}

export interface ForkableProjectArtifact {
  schemaVersion: string;
  artifactKind: "forkableProject";
  source: PublishingSourceMetadata;
  adventure: AdventurePackage;
  authoring: {
    includedStarterLibraryPackIds: string[];
    customLibraryObjectCount: number;
    preservesEditorMetadata: true;
    remixable: true;
  };
}

export interface RuntimeAssetDependencyManifest {
  assetIds: AssetId[];
  mediaCueIds: string[];
  soundCueIds: string[];
  missingAssetIds: AssetId[];
}

export interface StandalonePlayableArtifact {
  schemaVersion: string;
  artifactKind: "standalonePlayable";
  source: PublishingSourceMetadata;
  adventure: AdventurePackage;
  runtimeAssets: RuntimeAssetDependencyManifest;
  distribution: {
    editorIncluded: false;
    authoringNotesIncluded: false;
    starterLibrariesIncluded: false;
  };
}

export type PublishArtifact = ForkableProjectArtifact | StandalonePlayableArtifact;

export interface PublishArtifactOptions {
  createdAt?: string;
}

export interface PublishArtifactValidationIssue {
  code: string;
  message: string;
}

export function createForkableProjectExport(
  adventure: AdventurePackage,
  options: PublishArtifactOptions = {}
): ForkableProjectArtifact {
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

export function createStandaloneRuntimeExport(
  adventure: AdventurePackage,
  options: PublishArtifactOptions = {}
): StandalonePlayableArtifact {
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

export function collectRuntimeAssets(adventure: AdventurePackage): RuntimeAssetDependencyManifest {
  const availableIds = new Set(adventure.assets.map((asset) => asset.id));
  const referencedIds = collectReferencedAssetIds(adventure, availableIds);
  return {
    assetIds: [...referencedIds].filter((id) => availableIds.has(id)),
    mediaCueIds: adventure.mediaCues.map((cue) => cue.id),
    soundCueIds: adventure.soundCues.map((cue) => cue.id),
    missingAssetIds: [...referencedIds].filter((id) => !availableIds.has(id))
  };
}

export function pruneUnusedAuthoringData(
  adventure: AdventurePackage,
  runtimeAssets = collectRuntimeAssets(adventure)
): AdventurePackage {
  const runtimeAssetIds = new Set(runtimeAssets.assetIds);
  return {
    ...cloneAdventure(adventure),
    assets: adventure.assets.filter((asset) => runtimeAssetIds.has(asset.id)),
    starterLibraryPacks: []
  };
}

export function validatePublishArtifact(artifact: PublishArtifact): PublishArtifactValidationIssue[] {
  return [
    ...validateArtifactHeader(artifact),
    ...validateStandaloneArtifact(artifact)
  ];
}

function validateArtifactHeader(artifact: PublishArtifact): PublishArtifactValidationIssue[] {
  if (artifact.schemaVersion !== PUBLISHING_ARTIFACT_SCHEMA_VERSION) {
    return [createIssue("schemaVersion", "Publishing artifact schema version is not supported.")];
  }
  return [];
}

function validateStandaloneArtifact(artifact: PublishArtifact): PublishArtifactValidationIssue[] {
  if (artifact.artifactKind !== "standalonePlayable") {
    return [];
  }
  return [
    ...validateNoEditorData(artifact),
    ...validateRuntimeAssets(artifact)
  ];
}

function validateNoEditorData(artifact: StandalonePlayableArtifact): PublishArtifactValidationIssue[] {
  return artifact.adventure.starterLibraryPacks.length === 0
    ? []
    : [createIssue("starterLibrariesIncluded", "Standalone playable artifact must not include starter library packs.")];
}

function validateRuntimeAssets(artifact: StandalonePlayableArtifact): PublishArtifactValidationIssue[] {
  return artifact.runtimeAssets.missingAssetIds.map((assetId) =>
    createIssue("missingRuntimeAsset", `Runtime asset '${assetId}' is referenced but not present in the package.`)
  );
}

function collectReferencedAssetIds(adventure: AdventurePackage, availableIds: Set<AssetId>): Set<AssetId> {
  const assetIds = new Set<AssetId>();
  addOptionalAsset(assetIds, adventure.presentation.splashAssetId);
  addOptionalAsset(assetIds, adventure.presentation.startingMusicAssetId);
  adventure.mediaCues.forEach((cue) => assetIds.add(cue.assetId));
  adventure.soundCues.forEach((cue) => assetIds.add(cue.assetId));
  collectVisualAssets(adventure, assetIds, availableIds);
  return assetIds;
}

function collectVisualAssets(adventure: AdventurePackage, assetIds: Set<AssetId>, availableIds: Set<AssetId>) {
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

function addVisualBindingAssets(
  assetIds: Set<AssetId>,
  availableIds: Set<AssetId>,
  visual?: { assetId?: AssetId; portraitAssetId?: AssetId }
) {
  addKnownAsset(assetIds, availableIds, visual?.assetId);
  addKnownAsset(assetIds, availableIds, visual?.portraitAssetId);
}

function addKnownAsset(assetIds: Set<AssetId>, availableIds: Set<AssetId>, assetId?: AssetId) {
  if (assetId && availableIds.has(assetId)) {
    assetIds.add(assetId);
  }
}

function addOptionalAsset(assetIds: Set<AssetId>, assetId?: AssetId) {
  if (assetId) {
    assetIds.add(assetId);
  }
}

function createSourceMetadata(adventure: AdventurePackage, options: PublishArtifactOptions): PublishingSourceMetadata {
  return {
    sourceAdventureId: adventure.metadata.id,
    sourceTitle: adventure.metadata.title,
    createdAt: options.createdAt ?? new Date().toISOString(),
    sourceSchemaVersion: adventure.schemaVersion
  };
}

function cloneAdventure(adventure: AdventurePackage): AdventurePackage {
  return JSON.parse(JSON.stringify(adventure)) as AdventurePackage;
}

function createIssue(code: string, message: string): PublishArtifactValidationIssue {
  return { code, message };
}
