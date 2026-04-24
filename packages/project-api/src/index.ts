import type { AdventurePackage } from "@acs/domain";
import type { PublishArtifact, PublishArtifactKind } from "@acs/publishing";
import type { ValidationIssue, ValidationReport } from "@acs/validation";

export const DEFAULT_API_PORT = 4318;

export interface ApiSession {
  userId: string;
  displayName: string;
  mode: "local-dev";
}

export interface ProjectRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  latestReleaseId?: string;
  releaseCount: number;
  draft: AdventurePackage;
}

export type ProjectSummary = Omit<ProjectRecord, "draft">;

export interface ReleaseRecord {
  id: string;
  projectId: string;
  version: number;
  label: string;
  releaseNotes: string;
  createdAt: string;
  publishedByUserId: string;
  validationIssues: ValidationIssue[];
  validationReport: ValidationReport;
  metadata: {
    adventureId: AdventurePackage["metadata"]["id"];
    slug: string;
    title: string;
    description: string;
  };
  package: AdventurePackage;
}

export type ReleaseSummary = Omit<ReleaseRecord, "package">;

export interface AssetMetadataRecord {
  id: string;
  kind: string;
  name: string;
  contentType?: string;
  notes?: string;
  createdAt: string;
  createdByUserId: string;
}

export interface CreateProjectRequest {
  title?: string;
  description?: string;
  draft: AdventurePackage;
}

export interface SaveProjectDraftRequest {
  title?: string;
  description?: string;
  draft: AdventurePackage;
}

export interface PublishReleaseRequest {
  label?: string;
  releaseNotes?: string;
}

export interface CreateAssetMetadataRequest {
  kind: string;
  name: string;
  contentType?: string;
  notes?: string;
}

export interface ValidateAdventureRequest {
  draft: AdventurePackage;
}

export interface ExportReleaseArtifactRequest {
  artifactKind: PublishArtifactKind;
}

export interface ListResponse<T> {
  items: T[];
}

export interface ProjectApiClient {
  getSession(): Promise<ApiSession>;
  validateAdventure(input: ValidateAdventureRequest): Promise<ValidationReport>;
  listProjects(): Promise<ProjectSummary[]>;
  createProject(input: CreateProjectRequest): Promise<ProjectRecord>;
  getProject(projectId: string): Promise<ProjectRecord>;
  saveProjectDraft(projectId: string, input: SaveProjectDraftRequest): Promise<ProjectRecord>;
  listProjectReleases(projectId: string): Promise<ReleaseSummary[]>;
  publishRelease(projectId: string, input?: PublishReleaseRequest): Promise<ReleaseRecord>;
  listReleases(): Promise<ReleaseSummary[]>;
  getRelease(releaseId: string): Promise<ReleaseRecord>;
  exportReleaseArtifact(releaseId: string, input: ExportReleaseArtifactRequest): Promise<PublishArtifact>;
  createAssetMetadata(input: CreateAssetMetadataRequest): Promise<AssetMetadataRecord>;
}

export function defaultApiBase(): string {
  if (typeof window !== "undefined" && window.location) {
    return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}/api`;
  }

  return `http://localhost:${DEFAULT_API_PORT}/api`;
}

export function createProjectApiClient(baseUrl = defaultApiBase()): ProjectApiClient {
  return {
    getSession() {
      return request<ApiSession>(baseUrl, "/session");
    },
    validateAdventure(input) {
      return request<ValidationReport>(baseUrl, "/validation/adventure", {
        method: "POST",
        body: JSON.stringify(input)
      });
    },
    async listProjects() {
      const response = await request<ListResponse<ProjectSummary>>(baseUrl, "/projects");
      return response.items;
    },
    createProject(input) {
      return request<ProjectRecord>(baseUrl, "/projects", {
        method: "POST",
        body: JSON.stringify(input)
      });
    },
    getProject(projectId) {
      return request<ProjectRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}`);
    },
    saveProjectDraft(projectId, input) {
      return request<ProjectRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/draft`, {
        method: "PUT",
        body: JSON.stringify(input)
      });
    },
    async listProjectReleases(projectId) {
      const response = await request<ListResponse<ReleaseSummary>>(baseUrl, `/projects/${encodeURIComponent(projectId)}/releases`);
      return response.items;
    },
    publishRelease(projectId, input) {
      return request<ReleaseRecord>(baseUrl, `/projects/${encodeURIComponent(projectId)}/releases`, {
        method: "POST",
        body: JSON.stringify(input ?? {})
      });
    },
    async listReleases() {
      const response = await request<ListResponse<ReleaseSummary>>(baseUrl, "/releases");
      return response.items;
    },
    getRelease(releaseId) {
      return request<ReleaseRecord>(baseUrl, `/releases/${encodeURIComponent(releaseId)}`);
    },
    exportReleaseArtifact(releaseId, input) {
      return request<PublishArtifact>(baseUrl, `/releases/${encodeURIComponent(releaseId)}/artifacts`, {
        method: "POST",
        body: JSON.stringify(input)
      });
    },
    createAssetMetadata(input) {
      return request<AssetMetadataRecord>(baseUrl, "/assets/metadata", {
        method: "POST",
        body: JSON.stringify(input)
      });
    }
  };
}

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as unknown) : undefined;

  if (!response.ok) {
    const errorMessage =
      typeof payload === "object" && payload !== null && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
        ? ((payload as { error: string }).error)
        : `Request failed with ${response.status}.`;
    throw new Error(errorMessage);
  }

  return payload as T;
}
