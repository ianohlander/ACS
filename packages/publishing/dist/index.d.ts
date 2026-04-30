import type { AdventurePackage, AssetId } from "@acs/domain";
export { createStandaloneBundleArchive } from "./standalone-archive.js";
export { createForkableProjectPackageArchive } from "./forkable-package.js";
export { createReleaseReviewPackageArchive } from "./review-package.js";
export declare const PUBLISHING_ARTIFACT_SCHEMA_VERSION = "1.0.0";
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
    releaseHandoffManifest: ReleaseHandoffManifest;
    package?: ForkablePackageManifest;
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
        recommendedArchiveFileName: string;
        recommendedExtractedFolderName: string;
        packagedArtifactFileName: string;
        readmeHtml: string;
        readmeText: string;
        releaseNotesText: string;
        recommendedImportArea: string;
        nextSteps: string[];
    };
    knownLimitations: string[];
}
export interface ForkablePackageFile {
    path: string;
    contentType: string;
    contents: string;
}
export interface ForkablePackageManifest {
    entryFile: string;
    files: ForkablePackageFile[];
}
export interface ReleaseHandoffManifest {
    packageFormat: "release-handoff-manifest";
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
    artifacts: {
        forkableProject: {
            packageFormat: ForkableProjectManifest["packageFormat"];
            recommendedFileName: string;
            recommendedArchiveFileName: string;
            recommendedExtractedFolderName: string;
            packagedArtifactFileName: string;
            entryFile: string;
            packagedFileCount: number;
            recommendedImportArea: string;
            releaseNotesText: string;
            handoffGuideHtml: string;
            handoffGuideText: string;
        };
        standalonePlayable: {
            packageFormat: StandaloneDistributionManifest["packageFormat"];
            recommendedArchiveFileName: string;
            recommendedExtractedFolderName: string;
            entryFile: string;
            recommendedLaunchPath: string;
            launcherScript: string;
            launcherCommand: string;
            handoffGuideHtml: string;
            handoffGuideText: string;
            releaseNotesText: string;
            deliveryModes: string[];
            runtimeAssetCount: number;
            mediaCueCount: number;
            soundCueCount: number;
        };
    };
    recommendedUse: {
        designers: "forkableProject";
        players: "standalonePlayable";
    };
    handoff: {
        recommendedFileName: string;
        packagedFileName: string;
    };
    knownLimitations: string[];
}
export interface ArtifactIntegrityCheck {
    name: string;
    status: "pass" | "fail";
    details: string;
}
export interface ArtifactIntegrityReport {
    packageFormat: "artifact-integrity-report";
    generatedAt: string;
    release: {
        id: string;
        label: string;
        version: number;
    };
    project: {
        adventureId: string;
        title: string;
        slug: string;
        schemaVersion: string;
    };
    summary: {
        passedCheckCount: number;
        failedCheckCount: number;
        readyForDistribution: boolean;
    };
    checks: ArtifactIntegrityCheck[];
    handoff: {
        recommendedFileName: string;
    };
}
export interface ReleaseReviewPackageFile {
    path: string;
    contentType: string;
    contents: string;
}
export interface ReleaseReviewPackageManifest {
    entryFile: string;
    files: ReleaseReviewPackageFile[];
    handoff: {
        recommendedArchiveFileName: string;
        recommendedExtractedFolderName: string;
        packagedIntegrityFileName: string;
        packagedReleaseHandoffFileName: string;
        releaseNotesText: string;
        readmeHtml: string;
        readmeText: string;
    };
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
    releaseHandoffManifest: ReleaseHandoffManifest;
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
export declare function createForkableProjectExport(adventure: AdventurePackage, options?: PublishArtifactOptions): ForkableProjectArtifact;
export declare function createStandaloneRuntimeExport(adventure: AdventurePackage, options?: PublishArtifactOptions): StandalonePlayableArtifact;
export declare function attachStandaloneBundle(artifact: StandalonePlayableArtifact, bundle: StandaloneBundleManifest): StandalonePlayableArtifact;
export declare function collectRuntimeAssets(adventure: AdventurePackage): RuntimeAssetDependencyManifest;
export declare function pruneUnusedAuthoringData(adventure: AdventurePackage, runtimeAssets?: RuntimeAssetDependencyManifest): AdventurePackage;
export declare function validatePublishArtifact(artifact: PublishArtifact): PublishArtifactValidationIssue[];
export declare function createArtifactIntegrityReport(forkableArtifact: ForkableProjectArtifact, standaloneArtifact: StandalonePlayableArtifact, createdAt?: string): ArtifactIntegrityReport;
export declare function createReleaseReviewPackageManifest(handoffManifest: ReleaseHandoffManifest, integrityReport: ArtifactIntegrityReport): ReleaseReviewPackageManifest;
//# sourceMappingURL=index.d.ts.map