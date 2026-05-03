import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractAiAdventureProposalFromOpenAiResponses,
  submitOpenAiGameCreationRequest
} from "../../apps/api/dist/openai-responses-provider.js";

describe("api OpenAI Responses provider bridge", () => {
  it("blocks before network submission when the server API key is missing", async () => {
    let fetchCalled = false;
    const result = await submitOpenAiGameCreationRequest(
      {
        requestId: "req_openai_api_missing_key",
        createdAt: "2026-05-02T00:00:00.000Z",
        intent: "newGameFromPrompt",
        prompt: { text: "Create a short observatory mystery." },
        model: "gpt-5.2"
      },
      {
        apiKeyEnvironmentVariable: "OPENAI_API_KEY",
        model: "gpt-5.2"
      },
      {
        fetch: async () => {
          fetchCalled = true;
          throw new Error("fetch should not be called");
        }
      }
    );

    assert.equal(fetchCalled, false);
    assert.equal(result.status, "blocked");
    assert.deepEqual(result.issues.map((issue) => issue.code), ["missingOpenAiApiKey"]);
  });

  it("submits the planned Responses payload server-side and parses a proposal", async () => {
    const proposal = {
      proposalId: "proposal_openai_api_001",
      requestId: "req_openai_api_success",
      providerId: "openai_responses",
      reviewStatus: "readyForReview",
      summary: "A compact generated adventure proposal.",
      proposedAdventure: { metadata: { title: "Moonbase Mystery" } },
      patchSummary: [],
      proposedLibraryObjectCounts: null,
      warnings: [],
      provenance: {
        providerId: "openai_responses",
        providerLabel: "OpenAI Responses API",
        model: "gpt-5.2",
        generatedAt: "2026-05-02T00:00:00.000Z"
      }
    };
    const calls = [];
    const result = await submitOpenAiGameCreationRequest(
      {
        requestId: "req_openai_api_success",
        createdAt: "2026-05-02T00:00:00.000Z",
        intent: "newGameFromPrompt",
        prompt: { text: "Create a short moon-base mystery." },
        model: "gpt-5.2"
      },
      {
        apiKeyEnvironmentVariable: "OPENAI_API_KEY",
        apiKey: "sk-test-key",
        model: "gpt-5.2"
      },
      {
        fetch: async (url, init) => {
          calls.push({ url, init });
          return {
            ok: true,
            text: async () => JSON.stringify({
              id: "resp_test_001",
              output: [
                {
                  type: "message",
                  content: [
                    {
                      type: "output_text",
                      text: JSON.stringify(proposal)
                    }
                  ]
                }
              ]
            })
          };
        }
      }
    );

    assert.equal(result.status, "proposalReady");
    assert.equal(result.providerResponseId, "resp_test_001");
    assert.equal(result.proposal?.proposalId, "proposal_openai_api_001");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.openai.com/v1/responses");
    assert.equal(calls[0].init.headers.Authorization, "Bearer sk-test-key");
    assert.equal(JSON.parse(calls[0].init.body).text.format.type, "json_schema");
  });

  it("reports structured refusals and invalid output cleanly", () => {
    const refused = extractAiAdventureProposalFromOpenAiResponses({
      output: [{ content: [{ type: "refusal", refusal: "I cannot help with that request." }] }]
    });
    const missing = extractAiAdventureProposalFromOpenAiResponses({ output: [] });

    assert.deepEqual(refused.issues.map((issue) => issue.code), ["openAiRefusal"]);
    assert.deepEqual(missing.issues.map((issue) => issue.code), ["missingOpenAiOutputText"]);
  });
});
