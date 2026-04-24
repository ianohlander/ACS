import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { createProjectApiClient } from "../../packages/project-api/dist/index.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("project-api export artifact client", () => {
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
