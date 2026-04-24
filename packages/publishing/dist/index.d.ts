import type { AdventurePackage, AssetId } from "@acs/domain";
export { createStandaloneBundleArchive } from "./standalone-archive.js";
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
export declare function createForkableProjectExport(adventure: AdventurePackage, options?: PublishArtifactOptions): ForkableProjectArtifact;
export declare function createStandaloneRuntimeExport(adventure: AdventurePackage, options?: PublishArtifactOptions): StandalonePlayableArtifact;
export declare function attachStandaloneBundle(artifact: StandalonePlayableArtifact, bundle: StandaloneBundleManifest): StandalonePlayableArtifact;
export declare function collectRuntimeAssets(adventure: AdventurePackage): RuntimeAssetDependencyManifest;
export declare function pruneUnusedAuthoringData(adventure: AdventurePackage, runtimeAssets?: RuntimeAssetDependencyManifest): AdventurePackage;
export declare function validatePublishArtifact(artifact: PublishArtifact): PublishArtifactValidationIssue[];
//# sourceMappingURL=index.d.ts.map