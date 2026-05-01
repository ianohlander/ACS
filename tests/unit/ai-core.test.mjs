import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createAdventureGenerationPlan,
  createGenerationSessionPackage,
  createProposalApplicationPlan,
  createAiProviderRegistry,
  createProposalChangeSummary,
  createGenerationSessionRecord,
  createProposalReviewReport,
  findAiProvider,
  listProvidersForCapability,
  validateGenerationSessionRecord,
  validateGenerationSessionPackage,
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

  it("creates a portable generation session record", () => {
    const adventure = loadSampleAdventure();
    const request = {
      requestId: "req_session_001",
      createdAt: "2026-04-29T00:00:00.000Z",
      providerId: "provider_a",
      mode: "fullAdventure",
      prompt: { text: "Create a classic exploration adventure." }
    };
    const proposal = {
      proposalId: "proposal_session_001",
      requestId: "req_session_001",
      providerId: "provider_a",
      reviewStatus: "accepted",
      summary: "Approved structured proposal.",
      proposedAdventure: adventure,
      provenance: {
        providerId: "provider_a",
        generatedAt: "2026-04-29T03:00:00.000Z"
      }
    };

    const session = createGenerationSessionRecord(request, proposal);

    assert.equal(session.sessionId, "req_session_001:proposal_session_001");
    assert.equal(session.providerId, "provider_a");
    assert.equal(session.summary.mode, "fullAdventure");
    assert.equal(session.summary.readiness, "ready");
    assert.equal(session.summary.canApply, true);
    assert.deepEqual(validateGenerationSessionRecord(session), []);
  });

  it("reports mismatched generation session summary and linkage", () => {
    const adventure = loadSampleAdventure();
    const session = createGenerationSessionRecord(
      {
        requestId: "req_session_002",
        createdAt: "2026-04-29T00:00:00.000Z",
        providerId: "provider_a",
        mode: "gapFill",
        prompt: { text: "Fill a missing quest branch." },
        existingAdventure: adventure
      },
      {
        proposalId: "proposal_session_002",
        requestId: "req_session_002",
        providerId: "provider_a",
        reviewStatus: "readyForReview",
        summary: "Proposal needs review.",
        patchSummary: ["Add a mid-quest branch."],
        provenance: {
          providerId: "provider_a",
          generatedAt: "2026-04-29T04:00:00.000Z"
        }
      }
    );

    session.providerId = "provider_b";
    session.summary.readiness = "ready";
    session.summary.canApply = true;
    session.reviewReport.proposalId = "wrong_proposal";

    assert.deepEqual(
      validateGenerationSessionRecord(session).map((issue) => issue.code),
      [
        "sessionProviderMismatch",
        "sessionReviewProposalMismatch",
        "sessionReadinessMismatch",
        "sessionApplyMismatch"
      ]
    );
  });

  it("creates a proposal change summary from an existing adventure baseline", () => {
    const existingAdventure = loadSampleAdventure();
    const proposedAdventure = loadSampleAdventure();
    proposedAdventure.maps.push(structuredClone(proposedAdventure.maps[0]));
    proposedAdventure.dialogue.push({
      id: "dlg_added",
      speaker: "Archivist",
      lines: ["A new warning echoes through the relay."]
    });
    proposedAdventure.assets.push({
      id: "asset_added",
      kind: "image",
      storageKey: "generated/asset-added.png"
    });

    const summary = createProposalChangeSummary(
      {
        requestId: "req_changes_001",
        createdAt: "2026-04-29T00:00:00.000Z",
        providerId: "provider_a",
        mode: "sceneExpansion",
        prompt: { text: "Expand the opening region." },
        existingAdventure
      },
      {
        proposalId: "proposal_changes_001",
        requestId: "req_changes_001",
        providerId: "provider_a",
        reviewStatus: "readyForReview",
        summary: "Expanded proposal.",
        proposedAdventure,
        provenance: {
          providerId: "provider_a",
          generatedAt: "2026-04-29T05:00:00.000Z"
        }
      }
    );

    assert.equal(summary.hasStructuredAdventure, true);
    assert.equal(summary.counts.maps.delta, 1);
    assert.equal(summary.counts.dialogue.delta, 1);
    assert.equal(summary.counts.assets.delta, 1);
    assert.ok(summary.summaryLines.includes(`maps: +1 (${existingAdventure.maps.length} -> ${proposedAdventure.maps.length})`));
  });

  it("reports missing structured payload in a proposal change summary", () => {
    const summary = createProposalChangeSummary(
      {
        requestId: "req_changes_002",
        createdAt: "2026-04-29T00:00:00.000Z",
        providerId: "provider_a",
        mode: "gapFill",
        prompt: { text: "Fill a missing branch." },
        existingAdventure: loadSampleAdventure()
      },
      {
        proposalId: "proposal_changes_002",
        requestId: "req_changes_002",
        providerId: "provider_a",
        reviewStatus: "readyForReview",
        summary: "Patch-only proposal.",
        patchSummary: ["Add a missing branch."],
        provenance: {
          providerId: "provider_a",
          generatedAt: "2026-04-29T06:00:00.000Z"
        }
      }
    );

    assert.equal(summary.hasStructuredAdventure, false);
    assert.deepEqual(summary.summaryLines, [
      "No structured adventure payload was supplied, so object-count changes cannot be summarized yet."
    ]);
  });

  it("creates an application plan for an accepted structured proposal", () => {
    const existingAdventure = loadSampleAdventure();
    const proposedAdventure = loadSampleAdventure();
    proposedAdventure.maps.push(structuredClone(proposedAdventure.maps[0]));
    proposedAdventure.questDefinitions.push({
      id: "quest_added",
      name: "Secondary Signal",
      description: "Trace a new relay pulse.",
      stages: [],
      rewards: []
    });

    const session = createGenerationSessionRecord(
      {
        requestId: "req_apply_001",
        createdAt: "2026-04-29T00:00:00.000Z",
        providerId: "provider_a",
        mode: "sceneExpansion",
        prompt: { text: "Expand the relay map." },
        existingAdventure
      },
      {
        proposalId: "proposal_apply_001",
        requestId: "req_apply_001",
        providerId: "provider_a",
        reviewStatus: "accepted",
        summary: "Accepted expansion proposal.",
        proposedAdventure,
        provenance: {
          providerId: "provider_a",
          generatedAt: "2026-04-29T07:00:00.000Z"
        }
      }
    );
    const changeSummary = createProposalChangeSummary(session.request, session.proposal);
    const plan = createProposalApplicationPlan(session, changeSummary);

    assert.equal(plan.canApply, true);
    assert.equal(plan.applyMode, "manual-only");
    assert.equal(plan.requiresHumanReview, true);
    assert.equal(plan.blockers.length, 0);
    assert.ok(plan.targets.some((target) => target.section === "maps" && target.delta === 1));
    assert.ok(plan.targets.some((target) => target.section === "questDefinitions" && target.delta === 1));
    assert.equal(plan.nextStep, "Apply the approved proposal through the normal editor mutation flow.");
  });

  it("blocks application when proposal review or payload state is incomplete", () => {
    const session = createGenerationSessionRecord(
      {
        requestId: "req_apply_002",
        createdAt: "2026-04-29T00:00:00.000Z",
        providerId: "provider_a",
        mode: "gapFill",
        prompt: { text: "Fill a missing branch." },
        existingAdventure: loadSampleAdventure()
      },
      {
        proposalId: "proposal_apply_002",
        requestId: "req_apply_002",
        providerId: "provider_a",
        reviewStatus: "readyForReview",
        summary: "Patch-only review.",
        patchSummary: ["Add a missing branch."],
        provenance: {
          providerId: "provider_a",
          generatedAt: "2026-04-29T08:00:00.000Z"
        }
      }
    );
    const changeSummary = createProposalChangeSummary(session.request, session.proposal);
    const plan = createProposalApplicationPlan(session, changeSummary);

    assert.equal(plan.canApply, false);
    assert.ok(plan.blockers.includes("Structured adventure payload is required before object changes can be applied."));
    assert.equal(plan.nextStep, "Resolve blockers and keep the proposal in review.");
  });

  it("creates a portable AI review package from session state", () => {
    const existingAdventure = loadSampleAdventure();
    const proposedAdventure = loadSampleAdventure();
    proposedAdventure.maps.push(structuredClone(proposedAdventure.maps[0]));

    const session = createGenerationSessionRecord(
      {
        requestId: "req_package_001",
        createdAt: "2026-04-29T00:00:00.000Z",
        providerId: "provider_a",
        mode: "sceneExpansion",
        prompt: { text: "Expand the relay map." },
        existingAdventure
      },
      {
        proposalId: "proposal_package_001",
        requestId: "req_package_001",
        providerId: "provider_a",
        reviewStatus: "accepted",
        summary: "Accepted structured expansion.",
        proposedAdventure,
        provenance: {
          providerId: "provider_a",
          generatedAt: "2026-04-29T09:00:00.000Z"
        }
      }
    );
    const changeSummary = createProposalChangeSummary(session.request, session.proposal);
    const applicationPlan = createProposalApplicationPlan(session, changeSummary);
    const pkg = createGenerationSessionPackage(session, changeSummary, applicationPlan);

    assert.equal(pkg.manifest.sessionId, session.sessionId);
    assert.equal(pkg.manifest.canApply, true);
    assert.equal(pkg.manifest.recommendedArchiveFileName, "req_package_001-proposal_package_001-ai-review-package.zip");
    assert.ok(pkg.manifest.files.some((file) => file.path === "session-record.json" && file.kind === "session-record"));
    assert.ok(pkg.readmeText.includes("ACS AI Review Package"));
    assert.deepEqual(validateGenerationSessionPackage(pkg), []);
  });

  it("reports package linkage and required-file mismatches", () => {
    const existingAdventure = loadSampleAdventure();
    const proposedAdventure = loadSampleAdventure();

    const session = createGenerationSessionRecord(
      {
        requestId: "req_package_002",
        createdAt: "2026-04-29T00:00:00.000Z",
        providerId: "provider_a",
        mode: "fullAdventure",
        prompt: { text: "Create a fresh world." },
        existingAdventure
      },
      {
        proposalId: "proposal_package_002",
        requestId: "req_package_002",
        providerId: "provider_a",
        reviewStatus: "accepted",
        summary: "Accepted full adventure.",
        proposedAdventure,
        provenance: {
          providerId: "provider_a",
          generatedAt: "2026-04-29T10:00:00.000Z"
        }
      }
    );
    const changeSummary = createProposalChangeSummary(session.request, session.proposal);
    const applicationPlan = createProposalApplicationPlan(session, changeSummary);
    const pkg = createGenerationSessionPackage(session, changeSummary, applicationPlan);

    pkg.manifest.requestId = "wrong_request";
    pkg.manifest.files = pkg.manifest.files.filter((file) => file.path !== "README.txt");
    pkg.readmeText = "";
    pkg.applicationPlan.canApply = false;

    assert.deepEqual(
      validateGenerationSessionPackage(pkg).map((issue) => issue.code),
      ["packageRequestMismatch", "packageCanApplyMismatch", "packageMissingFile", "packageMissingReadmeText"]
    );
  });
});
