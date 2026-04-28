import type { AdventurePackage, AssetId } from "@acs/domain";
export { createStandaloneBundleArchive } from "./standalone-archive.js";

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
  projectManifest: ForkableProjectManifest;
  authoring: {
    includedStarterLibraryPackIds: string[];
    customLibraryObjectCount: number;
    preservesEditorMetadata: true;
    remixable: true;
  };
}

export interface ForkableProjectManifest {
  packageFormat: "forkable-project-json";
  generatedAt: string;
  release: {
    id: string;
    label: string;
    version: number;
    notes: string;
  };
  project: {
    adventureId: string;
    title: string;
    slug: string;
    schemaVersion: string;
  };
  content: {
    starterLibraryPackCount: number;
    customLibraryObjectCount: number;
    mapCount: number;
    questDefinitionCount: number;
    triggerCount: number;
    assetCount: number;
  };
  import: {
    recommendedWorkflow: "create-project-from-forkable-artifact";
    editableInEditor: true;
    starterLibrariesIncluded: true;
    editorMetadataIncluded: true;
    remixable: true;
  };
  handoff: {
    recommendedFileName: string;
    recommendedImportArea: string;
    nextSteps: string[];
  };
  knownLimitations: string[];
}

export interface RuntimeAssetDependencyManifest {
  assetIds: AssetId[];
  mediaCueIds: string[];
  soundCueIds: string[];
  missingAssetIds: AssetId[];
}

export interface StandaloneBundleFile {
  path: string;
  contentType: string;
  contents: string;
}

export interface StandaloneBundleManifest {
  entryFile: string;
  files: StandaloneBundleFile[];
}

export interface StandaloneDistributionManifest {
  packageFormat: "static-web-bundle";
  generatedAt: string;
  release: {
    id: string;
    label: string;
    version: number;
    notes: string;
  };
  package: {
    adventureId: string;
    title: string;
    slug: string;
    entryFile: string;
  };
  content: {
    runtimeAssetCount: number;
    mediaCueCount: number;
    soundCueCount: number;
  };
  launcher: {
    localServerIncluded: true;
    defaultPort: number;
    windowsPowerShellScript: string;
    windowsCommandScript: string;
    opensBrowser: true;
    notes: string[];
  };
  handoff: {
    readmeHtml: string;
    readmeText: string;
    releaseNotesText: string;
    recommendedLaunchPath: string;
    recommendedArchiveFileName: string;
    recommendedExtractedFolderName: string;
    deliveryModes: string[];
  };
  knownLimitations: string[];
}

export interface StandalonePlayableArtifact {
  schemaVersion: string;
  artifactKind: "standalonePlayable";
  source: PublishingSourceMetadata;
  adventure: AdventurePackage;
  runtimeAssets: RuntimeAssetDependencyManifest;
  distributionManifest: StandaloneDistributionManifest;
  bundle?: StandaloneBundleManifest;
  distribution: {
    editorIncluded: false;
    authoringNotesIncluded: false;
    starterLibrariesIncluded: false;
  };
}

export type PublishArtifact = ForkableProjectArtifact | StandalonePlayableArtifact;

export interface PublishArtifactOptions {
  createdAt?: string;
  releaseMetadata?: {
    id?: string;
    label?: string;
    version?: number;
    notes?: string;
  };
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
  const createdAt = options.createdAt ?? new Date().toISOString();
  return {
    schemaVersion: PUBLISHING_ARTIFACT_SCHEMA_VERSION,
    artifactKind: "forkableProject",
    source: createSourceMetadata(adventure, { ...options, createdAt }),
    adventure: adventureCopy,
    projectManifest: createForkableProjectManifest(adventureCopy, createdAt, options.releaseMetadata),
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
  const createdAt = options.createdAt ?? new Date().toISOString();
  return {
    schemaVersion: PUBLISHING_ARTIFACT_SCHEMA_VERSION,
    artifactKind: "standalonePlayable",
    source: createSourceMetadata(adventure, { ...options, createdAt }),
    adventure: pruneUnusedAuthoringData(adventure, runtimeAssets),
    runtimeAssets,
    distributionManifest: createStandaloneDistributionManifest(adventure, runtimeAssets, createdAt, options.releaseMetadata),
    distribution: {
      editorIncluded: false,
      authoringNotesIncluded: false,
      starterLibrariesIncluded: false
    }
  };
}

export function attachStandaloneBundle(
  artifact: StandalonePlayableArtifact,
  bundle: StandaloneBundleManifest
): StandalonePlayableArtifact {
  return {
    ...artifact,
    bundle
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
    ...validateForkableArtifact(artifact),
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
    ...validateRuntimeAssets(artifact),
    ...validateDistributionManifest(artifact),
    ...validateStandaloneBundle(artifact)
  ];
}

function validateForkableArtifact(artifact: PublishArtifact): PublishArtifactValidationIssue[] {
  if (artifact.artifactKind !== "forkableProject") {
    return [];
  }

  const issues: PublishArtifactValidationIssue[] = [];
  if (!artifact.projectManifest.release.label.trim()) {
    issues.push(createIssue("missingForkableReleaseLabel", "Forkable project manifest is missing a release label."));
  }
  if (!artifact.projectManifest.handoff.recommendedFileName.trim()) {
    issues.push(createIssue("missingForkableFileName", "Forkable project manifest is missing a recommended file name."));
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
  return issues;
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

function validateDistributionManifest(artifact: StandalonePlayableArtifact): PublishArtifactValidationIssue[] {
  const issues: PublishArtifactValidationIssue[] = [];
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

function validateStandaloneBundle(artifact: StandalonePlayableArtifact): PublishArtifactValidationIssue[] {
  if (!artifact.bundle) {
    return [];
  }

  const bundlePaths = new Set(artifact.bundle.files.map((file) => file.path));
  const issues: PublishArtifactValidationIssue[] = [];
  if (!bundlePaths.has(artifact.bundle.entryFile)) {
    issues.push(createIssue("missingBundleEntry", `Standalone bundle is missing its entry file '${artifact.bundle.entryFile}'.`));
  }
  if (!bundlePaths.has("bundle/adventure-package.json")) {
    issues.push(createIssue("missingAdventurePackage", "Standalone bundle is missing bundle/adventure-package.json."));
  }
  return issues;
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

function createStandaloneDistributionManifest(
  adventure: AdventurePackage,
  runtimeAssets: RuntimeAssetDependencyManifest,
  createdAt: string,
  releaseMetadata?: PublishArtifactOptions["releaseMetadata"]
): StandaloneDistributionManifest {
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

function createForkableProjectManifest(
  adventure: AdventurePackage,
  createdAt: string,
  releaseMetadata?: PublishArtifactOptions["releaseMetadata"]
): ForkableProjectManifest {
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

function cloneAdventure(adventure: AdventurePackage): AdventurePackage {
  return JSON.parse(JSON.stringify(adventure)) as AdventurePackage;
}

function createIssue(code: string, message: string): PublishArtifactValidationIssue {
  return { code, message };
}
