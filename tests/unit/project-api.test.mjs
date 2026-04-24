import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { createProjectApiClient } from "../../packages/project-api/dist/index.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("project-api export artifact client", () => {
  it("posts publish release requests with label and release notes", async () => {
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        text: async () => JSON.stringify({
          id: "rel_0001",
          projectId: "proj_0001",
          version: 1,
          label: "v1.0 candidate",
          releaseNotes: "Adds standalone packaging preview.",
          createdAt: "2026-04-23T00:00:00.000Z",
          publishedByUserId: "user_local_designer",
          validationIssues: [],
          validationReport: {
            blocking: false,
            issues: [],
            summary: { errorCount: 0, warningCount: 0 }
          },
          metadata: {
            adventureId: "adv_sample",
            slug: "sample",
            title: "Sample",
            description: "Sample release"
          },
          package: { metadata: { id: "adv_sample", slug: "sample", title: "Sample", description: "Sample release" } }
        })
      };
    };

    const client = createProjectApiClient("http://localhost:4318/api");
    const result = await client.publishRelease("proj_0001", {
      label: "v1.0 candidate",
      releaseNotes: "Adds standalone packaging preview."
    });

    assert.equal(result.label, "v1.0 candidate");
    assert.equal(result.releaseNotes, "Adds standalone packaging preview.");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://localhost:4318/api/projects/proj_0001/releases");
    assert.equal(calls[0].init.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      label: "v1.0 candidate",
      releaseNotes: "Adds standalone packaging preview."
    });
  });

  it("posts release artifact export requests to the release artifact endpoint", async () => {
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        text: async () => JSON.stringify({ artifactKind: "forkableProject", schemaVersion: "1.0.0" })
      };
    };

    const client = createProjectApiClient("http://localhost:4318/api");
    const result = await client.exportReleaseArtifact("rel_0001", { artifactKind: "forkableProject" });

    assert.equal(result.artifactKind, "forkableProject");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://localhost:4318/api/releases/rel_0001/artifacts");
    assert.equal(calls[0].init.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].init.body), { artifactKind: "forkableProject" });
  });
});
