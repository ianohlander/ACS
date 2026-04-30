import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createAdventureGenerationPlan,
  createAiProviderRegistry,
  createProposalReviewReport,
  findAiProvider,
  listProvidersForCapability,
  validateAdventureGenerationRequest,
  validateAdventureProposal
} from "../../packages/ai-core/dist/index.js";
import { loadSampleAdventure } from "./helpers/sample-adventure.mjs";

describe("ai-core provider contracts", () => {
  it("creates a sorted provider registry and filters by capability", () => {
    const registry = createAiProviderRegistry([
      {
        id: "provider_b",
        displayName: "Beta Provider",
        description: "Second provider",
        transport: "custom",
        capabilities: ["npc-action-proposal"],
        requiresApiKey: true,
        supportsStructuredOutput: ["custom"]
      },
      {
        id: "provider_a",
        displayName: "Alpha Provider",
        description: "First provider",
        transport: "responses-api",
        capabilities: ["adventure-generation", "scene-expansion"],
        requiresApiKey: true,
        supportsStreaming: true,
        supportsStructuredOutput: ["json-schema", "tool-calls"]
      }
    ]);

    assert.deepEqual(registry.providers.map((provider) => provider.id), ["provider_a", "provider_b"]);
    assert.equal(findAiProvider(registry, "provider_a")?.displayName, "Alpha Provider");
    assert.deepEqual(
      listProvidersForCapability(registry, "adventure-generation").map((provider) => provider.id),
      ["provider_a"]
    );
  });

  it("rejects duplicate provider ids", () => {
    assert.throws(() =>
      createAiProviderRegistry([
        {
          id: "dup",
          displayName: "One",
          description: "Provider one",
          transport: "custom",
          capabilities: ["adventure-generation"],
          requiresApiKey: false,
          supportsStructuredOutput: ["custom"]
        },
        {
          id: "dup",
          displayName: "Two",
          description: "Provider two",
          transport: "custom",
          capabilities: ["scene-expansion"],
          requiresApiKey: false,
          supportsStructuredOutput: ["custom"]
        }
      ])
    );
  });

  it("validates adventure generation request essentials", () => {
    const issues = validateAdventureGenerationRequest({
      requestId: "",
      createdAt: "2026-04-29T00:00:00.000Z",
      providerId: "",
      mode: "sceneExpansion",
      prompt: { text: "   " },
      constraints: {
        maximumMapCount: 0,
        maximumQuestCount: -1
      }
    });

    assert.deepEqual(
      issues.map((issue) => issue.code),
      [
        "missingRequestId",
        "missingProviderId",
        "missingPromptText",
        "invalidMaximumMapCount",
        "invalidMaximumQuestCount",
        "missingExistingAdventure"
      ]
    );
  });

  it("validates provider proposal alignment and payload requirements", () => {
    const request = {
      requestId: "req_001",
      createdAt: "2026-04-29T00:00:00.000Z",
      providerId: "provider_a",
      mode: "gapFill",
      prompt: { text: "Fill the missing quest path." },
      existingAdventure: loadSampleAdventure()
    };

    const issues = validateAdventureProposal(request, {
      proposalId: "proposal_001",
      requestId: "req_other",
      providerId: "provider_b",
      reviewStatus: "readyForReview",
      summary: "",
      provenance: {
        providerId: "provider_c",
        generatedAt: ""
      }
    });

    assert.deepEqual(
      issues.map((issue) => issue.code),
      [
        "requestMismatch",
        "providerMismatch",
        "missingSummary",
        "missingGeneratedAt",
        "provenanceProviderMismatch",
        "missingProposalPayload",
        "reviewWithoutAdventure"
      ]
    );
  });

  it("accepts a structured adventure proposal", () => {
    const adventure = loadSampleAdventure();
    const request = {
      requestId: "req_002",
      createdAt: "2026-04-29T00:00:00.000Z",
      providerId: "provider_a",
      mode: "fullAdventure",
      prompt: { text: "Create a classic exploration adventure." }
    };

    const issues = validateAdventureProposal(request, {
      proposalId: "proposal_002",
      requestId: "req_002",
      providerId: "provider_a",
      reviewStatus: "readyForReview",
      summary: "Full structured proposal.",
      proposedAdventure: adventure,
      patchSummary: ["Added a new opening hook."],
      provenance: {
        providerId: "provider_a",
        providerLabel: "Alpha Provider",
        model: "alpha-1",
        generatedAt: "2026-04-29T01:00:00.000Z"
      }
    });

    assert.deepEqual(issues, []);
  });

  it("creates a human-review-first generation plan", () => {
    const plan = createAdventureGenerationPlan({
      requestId: "req_plan_001",
      createdAt: "2026-04-29T00:00:00.000Z",
      providerId: "provider_a",
      mode: "fullAdventure",
      prompt: { text: "Create a science-fantasy adventure." }
    });

    assert.equal(plan.reviewPolicy.requiresHumanReview, true);
    assert.equal(plan.reviewPolicy.applyMode, "manual-only");
    assert.deepEqual(
      plan.steps.map((step) => step.kind),
      [
        "collect-context",
        "prompt-provider",
        "validate-structure",
        "check-references",
        "human-review",
        "apply-approved-mutation"
      ]
    );
    assert.ok(plan.steps.every((step) => step.blocking));
  });

  it("creates a blocked review report when proposal structure is invalid", () => {
    const request = {
      requestId: "req_review_001",
      createdAt: "2026-04-29T00:00:00.000Z",
      providerId: "provider_a",
      mode: "gapFill",
      prompt: { text: "Fill in a missing quest branch." },
      existingAdventure: loadSampleAdventure()
    };

    const report = createProposalReviewReport(request, {
      proposalId: "proposal_review_001",
      requestId: "wrong_req",
      providerId: "provider_a",
      reviewStatus: "readyForReview",
      summary: "",
      provenance: {
        providerId: "provider_b",
        generatedAt: ""
      }
    });

    assert.equal(report.readiness, "blocked");
    assert.equal(report.canApply, false);
    assert.ok(report.issueSummary.errorCount > 0);
    assert.equal(report.recommendedNextStep, "Fix blocking request/proposal issues before review.");
  });

  it("creates a ready review report only after acceptance and no issues", () => {
    const adventure = loadSampleAdventure();
    const request = {
      requestId: "req_review_002",
      createdAt: "2026-04-29T00:00:00.000Z",
      providerId: "provider_a",
      mode: "fullAdventure",
      prompt: { text: "Create a classic exploration adventure." }
    };

    const report = createProposalReviewReport(request, {
      proposalId: "proposal_review_002",
      requestId: "req_review_002",
      providerId: "provider_a",
      reviewStatus: "accepted",
      summary: "Approved structured proposal.",
      proposedAdventure: adventure,
      provenance: {
        providerId: "provider_a",
        generatedAt: "2026-04-29T02:00:00.000Z"
      }
    });

    assert.equal(report.readiness, "ready");
    assert.equal(report.issueSummary.errorCount, 0);
    assert.equal(report.issueSummary.warningCount, 0);
    assert.equal(report.canApply, true);
    assert.equal(report.recommendedNextStep, "Apply the accepted proposal through normal editor mutation flow.");
  });
});
