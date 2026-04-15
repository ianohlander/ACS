import type { AdventurePackage } from "@acs/domain";
import type {
  ApiSession,
  AssetMetadataRecord,
  CreateAssetMetadataRequest,
  CreateProjectRequest,
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
    const url = new URL(request.url ?? "/", "http://localhost");
    const method = request.method ?? "GET";
    const segments = url.pathname.replace(/^\/+|\/+$/g, "").split("/");

    if (url.pathname === "/api/session" && method === "GET") {
      respondJson(response, 200, defaultSession);
      return;
    }

    if (url.pathname === "/api/validation/adventure" && method === "POST") {
      const body = (await readJsonBody(request)) as ValidateAdventureRequest;
      if (!body?.draft) {
        respondJson(response, 400, { error: "Validation requires a draft adventure package." });
        return;
      }

      respondJson(response, 200, validateAdventure(body.draft));
      return;
    }

    if (url.pathname === "/api/projects" && method === "GET") {
      const store = await loadStore();
      respondJson(response, 200, { items: store.projects.map(toProjectSummary) });
      return;
    }

    if (url.pathname === "/api/projects" && method === "POST") {
      const body = (await readJsonBody(request)) as CreateProjectRequest;
      if (!body?.draft) {
        respondJson(response, 400, { error: "Project creation requires a draft adventure package." });
        return;
      }

      const report = validateAdventure(body.draft);
      if (report.blocking) {
        respondValidationFailure(response, "Project draft is invalid.", report);
        return;
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
      return;
    }

    if (segments[0] === "api" && segments[1] === "projects" && segments[2] && segments.length === 3 && method === "GET") {
      const store = await loadStore();
      const project = store.projects.find((candidate) => candidate.id === segments[2]);
      if (!project) {
        respondJson(response, 404, { error: `Project '${segments[2]}' was not found.` });
        return;
      }

      respondJson(response, 200, project);
      return;
    }

    if (segments[0] === "api" && segments[1] === "projects" && segments[2] && segments[3] === "draft" && method === "PUT") {
      const body = (await readJsonBody(request)) as SaveProjectDraftRequest;
      if (!body?.draft) {
        respondJson(response, 400, { error: "Draft update requires a draft adventure package." });
        return;
      }

      const report = validateAdventure(body.draft);
      if (report.blocking) {
        respondValidationFailure(response, "Project draft is invalid.", report);
        return;
      }

      const store = await loadStore();
      const project = store.projects.find((candidate) => candidate.id === segments[2]);
      if (!project) {
        respondJson(response, 404, { error: `Project '${segments[2]}' was not found.` });
        return;
      }

      project.draft = body.draft;
      project.title = body.title?.trim() || body.draft.metadata.title;
      project.description = body.description ?? body.draft.metadata.description;
      project.slug = slugify(project.title);
      project.updatedAt = new Date().toISOString();

      await saveStore(store);
      respondJson(response, 200, project);
      return;
    }

    if (segments[0] === "api" && segments[1] === "projects" && segments[2] && segments[3] === "releases" && segments.length === 4 && method === "GET") {
      const store = await loadStore();
      const releases = store.releases
        .filter((candidate) => candidate.projectId === segments[2])
        .map(toReleaseSummary);
      respondJson(response, 200, { items: releases });
      return;
    }

    if (segments[0] === "api" && segments[1] === "projects" && segments[2] && segments[3] === "releases" && segments.length === 4 && method === "POST") {
      const body = ((await readJsonBody(request)) ?? {}) as PublishReleaseRequest;
      const store = await loadStore();
      const project = store.projects.find((candidate) => candidate.id === segments[2]);
      if (!project) {
        respondJson(response, 404, { error: `Project '${segments[2]}' was not found.` });
        return;
      }

      const report = validateAdventure(project.draft);
      if (report.blocking) {
        respondValidationFailure(response, "Project draft is invalid and cannot be published.", report);
        return;
      }

      store.counters.release += 1;
      const version = project.releaseCount + 1;
      const release: ReleaseRecord = {
        id: `rel_${String(store.counters.release).padStart(4, "0")}`,
        projectId: project.id,
        version,
        label: body.label?.trim() || `v${version}`,
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
      return;
    }

    if (url.pathname === "/api/releases" && method === "GET") {
      const store = await loadStore();
      respondJson(response, 200, { items: store.releases.map(toReleaseSummary) });
      return;
    }

    if (segments[0] === "api" && segments[1] === "releases" && segments[2] && segments.length === 3 && method === "GET") {
      const store = await loadStore();
      const release = store.releases.find((candidate) => candidate.id === segments[2]);
      if (!release) {
        respondJson(response, 404, { error: `Release '${segments[2]}' was not found.` });
        return;
      }

      respondJson(response, 200, release);
      return;
    }

    if (url.pathname === "/api/assets/metadata" && method === "POST") {
      const body = (await readJsonBody(request)) as CreateAssetMetadataRequest;
      if (!body?.kind || !body?.name) {
        respondJson(response, 400, { error: "Asset metadata requires kind and name." });
        return;
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
      return;
    }

    respondJson(response, 404, { error: `Route not found: ${method} ${url.pathname}` });
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
