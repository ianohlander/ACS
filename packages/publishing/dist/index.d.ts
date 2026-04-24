import type { AdventurePackage, AssetId } from "@acs/domain";
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
export declare function createForkableProjectExport(adventure: AdventurePackage, options?: PublishArtifactOptions): ForkableProjectArtifact;
export declare function createStandaloneRuntimeExport(adventure: AdventurePackage, options?: PublishArtifactOptions): StandalonePlayableArtifact;
export declare function collectRuntimeAssets(adventure: AdventurePackage): RuntimeAssetDependencyManifest;
export declare function pruneUnusedAuthoringData(adventure: AdventurePackage, runtimeAssets?: RuntimeAssetDependencyManifest): AdventurePackage;
export declare function validatePublishArtifact(artifact: PublishArtifact): PublishArtifactValidationIssue[];
//# sourceMappingURL=index.d.ts.map