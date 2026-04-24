import type { AdventurePackage } from "@acs/domain";
import { attachStandaloneBundle, createForkableProjectExport, createStandaloneRuntimeExport, type PublishArtifact } from "@acs/publishing";
import type {
  ApiSession,
  AssetMetadataRecord,
  CreateAssetMetadataRequest,
  CreateProjectRequest,
  ExportReleaseArtifactRequest,
  ProjectRecord,
  ProjectSummary,
  PublishReleaseRequest,
  ReleaseRecord,
  ReleaseSummary,
  SaveProjectDraftRequest,
  ValidateAdventureRequest
} from "@acs/project-api";
import { validateAdventure, type ValidationReport } from "@acs/validation";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStandaloneBundle } from "./standalone-bundle.js";

const DEFAULT_PORT = 4318;
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const STORE_PATH = join(DATA_DIR, "store.json");

interface Store {
  session: ApiSession;
  projects: ProjectRecord[];
  releases: ReleaseRecord[];
  assets: AssetMetadataRecord[];
  counters: {
    project: number;
    release: number;
    asset: number;
  };
}

interface RouteContext {
  method: string;
  url: URL;
  segments: string[];
}

const defaultSession: ApiSession = {
  userId: "user_local_designer",
  displayName: "Local Designer",
  mode: "local-dev"
};

const server = createServer(async (request: any, response: any) => {
  applyCors(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const context = createRouteContext(request);
    const handled =
      (await handleSessionRoute(context, response)) ||
      (await handleValidationRoute(context, request, response)) ||
      (await handleProjectRoutes(context, request, response)) ||
      (await handleReleaseRoutes(context, request, response)) ||
      (await handleAssetRoutes(context, request, response));

    if (!handled) {
      respondJson(response, 404, { error: `Route not found: ${context.method} ${context.url.pathname}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    respondJson(response, 500, { error: message });
  }
});

const port = Number(process.env.PORT ?? String(DEFAULT_PORT));
server.listen(port, () => {
  console.log(`ACS API listening on http://localhost:${port}`);
});

async function loadStore(): Promise<Store> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    const initial = createInitialStore();
    await saveStore(initial);
    return initial;
  }
}

async function saveStore(store: Store): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function createInitialStore(): Store {
  return {
    session: defaultSession,
    projects: [],
    releases: [],
    assets: [],
    counters: {
      project: 0,
      release: 0,
      asset: 0
    }
  };
}

function createRouteContext(request: any): RouteContext {
  const url = new URL(request.url ?? "/", "http://localhost");
  return {
    method: request.method ?? "GET",
    url,
    segments: url.pathname.replace(/^\/+|\/+$/g, "").split("/")
  };
}

async function handleSessionRoute(context: RouteContext, response: any): Promise<boolean> {
  if (context.url.pathname !== "/api/session" || context.method !== "GET") {
    return false;
  }

  respondJson(response, 200, defaultSession);
  return true;
}

async function handleValidationRoute(context: RouteContext, request: any, response: any): Promise<boolean> {
  if (context.url.pathname !== "/api/validation/adventure" || context.method !== "POST") {
    return false;
  }

  const body = (await readJsonBody(request)) as ValidateAdventureRequest;
  if (!body?.draft) {
    respondJson(response, 400, { error: "Validation requires a draft adventure package." });
    return true;
  }

  respondJson(response, 200, validateAdventure(body.draft));
  return true;
}

async function handleProjectRoutes(context: RouteContext, request: any, response: any): Promise<boolean> {
  return (
    (await handleProjectsCollectionRoute(context, request, response)) ||
    (await handleProjectRecordRoute(context, request, response)) ||
    (await handleProjectDraftRoute(context, request, response)) ||
    (await handleProjectReleaseCollectionRoute(context, request, response))
  );
}

async function handleProjectsCollectionRoute(context: RouteContext, request: any, response: any): Promise<boolean> {
  if (context.url.pathname !== "/api/projects") {
    return false;
  }

  if (context.method === "GET") {
    return handleProjectsList(response);
  }

  if (context.method !== "POST") {
    return false;
  }

  return handleProjectCreate(request, response);
}

async function handleProjectsList(response: any): Promise<boolean> {
  const store = await loadStore();
  respondJson(response, 200, { items: store.projects.map(toProjectSummary) });
  return true;
}

async function handleProjectCreate(request: any, response: any): Promise<boolean> {
  const body = (await readJsonBody(request)) as CreateProjectRequest;
  if (!body?.draft) {
    respondJson(response, 400, { error: "Project creation requires a draft adventure package." });
    return true;
  }

  const report = validateAdventure(body.draft);
  if (report.blocking) {
    respondValidationFailure(response, "Project draft is invalid.", report);
    return true;
  }

  const store = await loadStore();
  store.counters.project += 1;
  const now = new Date().toISOString();
  const title = body.title?.trim() || body.draft.metadata.title;
  const description = body.description ?? body.draft.metadata.description;
  const project: ProjectRecord = {
    id: `proj_${String(store.counters.project).padStart(4, "0")}`,
    slug: slugify(title),
    title,
    description,
    ownerUserId: store.session.userId,
    createdAt: now,
    updatedAt: now,
    releaseCount: 0,
    draft: body.draft
  };

  store.projects.push(project);
  await saveStore(store);
  respondJson(response, 201, project);
  return true;
}

async function handleProjectRecordRoute(context: RouteContext, _request: any, response: any): Promise<boolean> {
  if (!(context.segments[0] === "api" && context.segments[1] === "projects" && context.segments[2] && context.segments.length === 3 && context.method === "GET")) {
    return false;
  }

  const store = await loadStore();
  const project = store.projects.find((candidate) => candidate.id === context.segments[2]);
  if (!project) {
    respondJson(response, 404, { error: `Project '${context.segments[2]}' was not found.` });
    return true;
  }

  respondJson(response, 200, project);
  return true;
}

async function handleProjectDraftRoute(context: RouteContext, request: any, response: any): Promise<boolean> {
  if (!isProjectDraftRoute(context)) {
    return false;
  }

  const body = (await readJsonBody(request)) as SaveProjectDraftRequest;
  if (respondIfMissingDraft(body?.draft, "Draft update requires a draft adventure package.", response)) {
    return true;
  }

  if (respondIfBlockingValidation(body.draft, "Project draft is invalid.", response)) {
    return true;
  }

  const store = await loadStore();
  const project = store.projects.find((candidate) => candidate.id === context.segments[2]);
  if (!project) {
    respondJson(response, 404, { error: `Project '${context.segments[2]}' was not found.` });
    return true;
  }

  applyProjectDraftUpdate(project, body);

  await saveStore(store);
  respondJson(response, 200, project);
  return true;
}

async function handleProjectReleaseCollectionRoute(context: RouteContext, request: any, response: any): Promise<boolean> {
  if (!(context.segments[0] === "api" && context.segments[1] === "projects" && context.segments[2] && context.segments[3] === "releases" && context.segments.length === 4)) {
    return false;
  }

  if (context.method === "GET") {
    return handleProjectReleaseList(context.segments[2], response);
  }

  if (context.method !== "POST") {
    return false;
  }

  return handleProjectReleasePublish(context.segments[2], request, response);
}

async function handleProjectReleaseList(projectId: string, response: any): Promise<boolean> {
  const store = await loadStore();
  const releases = store.releases
    .filter((candidate) => candidate.projectId === projectId)
    .map(toReleaseSummary);
  respondJson(response, 200, { items: releases });
  return true;
}

async function handleProjectReleasePublish(projectId: string, request: any, response: any): Promise<boolean> {
  const body = ((await readJsonBody(request)) ?? {}) as PublishReleaseRequest;
  const store = await loadStore();
  const project = store.projects.find((candidate) => candidate.id === projectId);
  if (!project) {
    respondJson(response, 404, { error: `Project '${projectId}' was not found.` });
    return true;
  }

  const report = validateAdventure(project.draft);
  if (report.blocking) {
    respondValidationFailure(response, "Project draft is invalid and cannot be published.", report);
    return true;
  }

  store.counters.release += 1;
  const version = project.releaseCount + 1;
  const release: ReleaseRecord = {
    id: `rel_${String(store.counters.release).padStart(4, "0")}`,
    projectId: project.id,
    version,
    label: body.label?.trim() || `v${version}`,
    releaseNotes: normalizeReleaseNotes(body.releaseNotes),
    createdAt: new Date().toISOString(),
    publishedByUserId: store.session.userId,
    validationIssues: report.issues,
    validationReport: report,
    metadata: {
      adventureId: project.draft.metadata.id,
      slug: project.draft.metadata.slug,
      title: project.draft.metadata.title,
      description: project.draft.metadata.description
    },
    package: JSON.parse(JSON.stringify(project.draft)) as AdventurePackage
  };

  store.releases.push(release);
  project.latestReleaseId = release.id;
  project.releaseCount = version;
  project.updatedAt = release.createdAt;

  await saveStore(store);
  respondJson(response, 201, release);
  return true;
}

async function handleReleaseRoutes(context: RouteContext, request: any, response: any): Promise<boolean> {
  return (
    (await handleReleaseCollectionRoute(context, response)) ||
    (await handleReleaseRecordRoute(context, response)) ||
    (await handleReleaseArtifactRoute(context, request, response))
  );
}

async function handleReleaseCollectionRoute(context: RouteContext, response: any): Promise<boolean> {
  if (context.url.pathname !== "/api/releases" || context.method !== "GET") {
    return false;
  }

  const store = await loadStore();
  respondJson(response, 200, { items: store.releases.map(toReleaseSummary) });
  return true;
}

async function handleReleaseRecordRoute(context: RouteContext, response: any): Promise<boolean> {
  if (!(context.segments[0] === "api" && context.segments[1] === "releases" && context.segments[2] && context.segments.length === 3 && context.method === "GET")) {
    return false;
  }

  const store = await loadStore();
  const release = store.releases.find((candidate) => candidate.id === context.segments[2]);
  if (!release) {
    respondJson(response, 404, { error: `Release '${context.segments[2]}' was not found.` });
    return true;
  }

  respondJson(response, 200, release);
  return true;
}

async function handleReleaseArtifactRoute(context: RouteContext, request: any, response: any): Promise<boolean> {
  if (!isReleaseArtifactRoute(context)) {
    return false;
  }

  const releaseId = context.segments[2] ?? "";
  const body = ((await readJsonBody(request)) ?? {}) as ExportReleaseArtifactRequest;
  const release = await findReleaseById(releaseId);
  if (!release) {
    respondJson(response, 404, { error: `Release '${releaseId}' was not found.` });
    return true;
  }

  respondJson(response, 200, await createReleaseArtifact(release, body));
  return true;
}

async function handleAssetRoutes(context: RouteContext, request: any, response: any): Promise<boolean> {
  if (context.url.pathname !== "/api/assets/metadata" || context.method !== "POST") {
    return false;
  }

  const body = (await readJsonBody(request)) as CreateAssetMetadataRequest;
  if (!body?.kind || !body?.name) {
    respondJson(response, 400, { error: "Asset metadata requires kind and name." });
    return true;
  }

  const store = await loadStore();
  store.counters.asset += 1;
  const record: AssetMetadataRecord = {
    id: `asset_${String(store.counters.asset).padStart(4, "0")}`,
    kind: body.kind,
    name: body.name,
    createdAt: new Date().toISOString(),
    createdByUserId: store.session.userId,
    ...(body.contentType ? { contentType: body.contentType } : {}),
    ...(body.notes ? { notes: body.notes } : {})
  };

  store.assets.push(record);
  await saveStore(store);
  respondJson(response, 201, record);
  return true;
}

function respondIfMissingDraft(draft: AdventurePackage | undefined, message: string, response: any): boolean {
  if (draft) {
    return false;
  }

  respondJson(response, 400, { error: message });
  return true;
}

function respondIfBlockingValidation(draft: AdventurePackage, message: string, response: any): boolean {
  const report = validateAdventure(draft);
  if (!report.blocking) {
    return false;
  }

  respondValidationFailure(response, message, report);
  return true;
}

function applyProjectDraftUpdate(project: ProjectRecord, body: SaveProjectDraftRequest): void {
  project.draft = body.draft;
  project.title = body.title?.trim() || body.draft.metadata.title;
  project.description = body.description ?? body.draft.metadata.description;
  project.slug = slugify(project.title);
  project.updatedAt = new Date().toISOString();
}

async function findReleaseById(releaseId: string): Promise<ReleaseRecord | undefined> {
  const store = await loadStore();
  return store.releases.find((candidate) => candidate.id === releaseId);
}

function isProjectDraftRoute(context: RouteContext): boolean {
  return context.segments[0] === "api"
    && context.segments[1] === "projects"
    && Boolean(context.segments[2])
    && context.segments[3] === "draft"
    && context.method === "PUT";
}

function isReleaseArtifactRoute(context: RouteContext): boolean {
  return context.segments[0] === "api"
    && context.segments[1] === "releases"
    && Boolean(context.segments[2])
    && context.segments[3] === "artifacts"
    && context.segments.length === 4
    && context.method === "POST";
}

function toProjectSummary(project: ProjectRecord): ProjectSummary {
  const { draft, ...summary } = project;
  void draft;
  return summary;
}

function toReleaseSummary(release: ReleaseRecord): ReleaseSummary {
  const { package: adventurePackage, ...summary } = release;
  void adventurePackage;
  return summary;
}

async function readJsonBody(request: any): Promise<unknown> {
  const decoder = new TextDecoder();
  let body = "";

  for await (const chunk of request) {
    if (typeof chunk === "string") {
      body += chunk;
      continue;
    }

    body += decoder.decode(chunk, { stream: true });
  }

  body += decoder.decode();
  return body ? JSON.parse(body) : undefined;
}

function respondJson(response: any, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function respondValidationFailure(response: any, message: string, report: ValidationReport): void {
  respondJson(response, 400, {
    error: message,
    issues: report.issues,
    validationReport: report
  });
}

function applyCors(response: any): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,PUT,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || "untitled-project";
}

function normalizeReleaseNotes(value: string | undefined): string {
  return value?.trim() ?? "";
}

async function createReleaseArtifact(release: ReleaseRecord, request: ExportReleaseArtifactRequest): Promise<PublishArtifact> {
  if (request.artifactKind === "standalonePlayable") {
    const artifact = createStandaloneRuntimeExport(release.package, {
      releaseMetadata: {
        id: release.id,
        label: release.label,
        version: release.version,
        notes: release.releaseNotes
      }
    });
    const bundle = await buildStandaloneBundle(artifact);
    return attachStandaloneBundle(artifact, bundle);
  }

  return createForkableProjectExport(release.package, {
    releaseMetadata: {
      id: release.id,
      label: release.label,
      version: release.version,
      notes: release.releaseNotes
    }
  });
}
