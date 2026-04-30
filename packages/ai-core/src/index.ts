import type { AdventurePackage, LibraryObjectKind, StarterGenre } from "@acs/domain";

export type AiProviderCapability =
  | "adventure-generation"
  | "scene-expansion"
  | "gap-fill"
  | "dialogue-suggestion"
  | "npc-brain-dialogue"
  | "npc-action-proposal"
  | "library-pack-generation";

export type AiProviderTransport = "responses-api" | "chat-completions" | "agent-sdk" | "custom";
export type StructuredOutputMode = "json-schema" | "tool-calls" | "custom";
export type AdventureGenerationMode = "fullAdventure" | "regionExpansion" | "sceneExpansion" | "questArc" | "libraryPack" | "gapFill";
export type RendererFamily = "classic8Bit" | "enhanced16Bit" | "hd2d" | "threeD";
export type AiProposalReviewStatus = "draft" | "readyForReview" | "accepted" | "rejected";
export type AiValidationSeverity = "error" | "warning";
export type AiReviewReadiness = "blocked" | "warning" | "ready";
export type AiGenerationStepKind = "collect-context" | "prompt-provider" | "validate-structure" | "check-references" | "human-review" | "apply-approved-mutation";

export interface AiProviderManifest {
  id: string;
  displayName: string;
  description: string;
  transport: AiProviderTransport;
  capabilities: AiProviderCapability[];
  requiresApiKey: boolean;
  supportsStreaming?: boolean;
  supportsImages?: boolean;
  supportsStructuredOutput: StructuredOutputMode[];
  modelHints?: string[];
}

export interface AiProviderRegistry {
  readonly providers: readonly AiProviderManifest[];
  readonly byId: Readonly<Record<string, AiProviderManifest>>;
}

export interface AdventureGenerationPromptInput {
  text: string;
  designNotes?: string;
  sourceReferences?: string[];
}

export interface AdventureGenerationConstraints {
  preferredGenres?: StarterGenre[];
  preferredStarterPackIds?: string[];
  preferredRendererFamilies?: RendererFamily[];
  maximumMapCount?: number;
  maximumQuestCount?: number;
  requireStructuredObjectives?: boolean;
  preserveExistingIds?: boolean;
}

export interface AdventureGenerationRequest {
  requestId: string;
  createdAt: string;
  providerId: string;
  mode: AdventureGenerationMode;
  prompt: AdventureGenerationPromptInput;
  constraints?: AdventureGenerationConstraints;
  existingAdventure?: AdventurePackage;
}

export interface AdventureGenerationPlanStep {
  id: string;
  kind: AiGenerationStepKind;
  label: string;
  description: string;
  blocking: boolean;
}

export interface AdventureGenerationPlan {
  requestId: string;
  providerId: string;
  mode: AdventureGenerationMode;
  steps: AdventureGenerationPlanStep[];
  reviewPolicy: {
    requiresHumanReview: true;
    applyMode: "manual-only";
  };
}

export interface AiProposalIssue {
  code: string;
  severity: AiValidationSeverity;
  message: string;
  path?: string;
}

export interface AiProposalProvenance {
  providerId: string;
  providerLabel?: string;
  model?: string;
  generatedAt: string;
}

export interface AiAdventureProposal {
  proposalId: string;
  requestId: string;
  providerId: string;
  reviewStatus: AiProposalReviewStatus;
  summary: string;
  proposedAdventure?: AdventurePackage;
  patchSummary?: string[];
  proposedLibraryObjectCounts?: Partial<Record<LibraryObjectKind, number>>;
  warnings?: AiProposalIssue[];
  provenance: AiProposalProvenance;
}

export interface AiProposalReviewReport {
  requestId: string;
  proposalId: string;
  providerId: string;
  generatedAt: string;
  readiness: AiReviewReadiness;
  issueSummary: {
    errorCount: number;
    warningCount: number;
  };
  issues: AiProposalIssue[];
  canApply: boolean;
  recommendedNextStep: string;
}

export interface AiGenerationSessionRecord {
  sessionId: string;
  providerId: string;
  createdAt: string;
  request: AdventureGenerationRequest;
  plan: AdventureGenerationPlan;
  proposal: AiAdventureProposal;
  reviewReport: AiProposalReviewReport;
  summary: {
    mode: AdventureGenerationMode;
    readiness: AiReviewReadiness;
    canApply: boolean;
  };
}

export interface AiProposalCountDelta {
  before: number;
  after: number;
  delta: number;
}

export interface AiProposalChangeSummary {
  proposalId: string;
  requestId: string;
  mode: AdventureGenerationMode;
  hasStructuredAdventure: boolean;
  counts: {
    maps: AiProposalCountDelta;
    regions: AiProposalCountDelta;
    dialogue: AiProposalCountDelta;
    triggers: AiProposalCountDelta;
    entityDefinitions: AiProposalCountDelta;
    itemDefinitions: AiProposalCountDelta;
    skillDefinitions: AiProposalCountDelta;
    traitDefinitions: AiProposalCountDelta;
    spellDefinitions: AiProposalCountDelta;
    tileDefinitions: AiProposalCountDelta;
    questDefinitions: AiProposalCountDelta;
    flagDefinitions: AiProposalCountDelta;
    customLibraryObjects: AiProposalCountDelta;
    assets: AiProposalCountDelta;
    starterLibraryPacks: AiProposalCountDelta;
    mediaCues: AiProposalCountDelta;
    soundCues: AiProposalCountDelta;
  };
  summaryLines: string[];
}

export interface AiProposalApplicationTarget {
  section: string;
  delta: number;
  applyLabel: string;
}

export interface AiProposalApplicationPlan {
  requestId: string;
  proposalId: string;
  readiness: AiReviewReadiness;
  canApply: boolean;
  requiresHumanReview: boolean;
  applyMode: "manual-only";
  targets: AiProposalApplicationTarget[];
  blockers: string[];
  nextStep: string;
}

export function createAiProviderRegistry(providers: readonly AiProviderManifest[]): AiProviderRegistry {
  const sortedProviders = [...providers].sort((left, right) => left.displayName.localeCompare(right.displayName));
  const byId: Record<string, AiProviderManifest> = {};

  for (const provider of sortedProviders) {
    if (byId[provider.id]) {
      throw new Error(`Duplicate AI provider id '${provider.id}'.`);
    }
    byId[provider.id] = provider;
  }

  return {
    providers: sortedProviders,
    byId
  };
}

export function findAiProvider(registry: AiProviderRegistry, providerId: string): AiProviderManifest | undefined {
  return registry.byId[providerId];
}

export function listProvidersForCapability(
  registry: AiProviderRegistry,
  capability: AiProviderCapability
): AiProviderManifest[] {
  return registry.providers.filter((provider) => provider.capabilities.includes(capability));
}

export function validateAdventureGenerationRequest(request: AdventureGenerationRequest): AiProposalIssue[] {
  const issues: AiProposalIssue[] = [];

  if (!request.requestId.trim()) {
    issues.push(error("missingRequestId", "Adventure generation requests must include a requestId.", "requestId"));
  }

  if (!request.providerId.trim()) {
    issues.push(error("missingProviderId", "Adventure generation requests must include a providerId.", "providerId"));
  }

  if (!request.prompt.text.trim()) {
    issues.push(error("missingPromptText", "Adventure generation requests must include prompt text.", "prompt.text"));
  }

  if (request.constraints?.maximumMapCount !== undefined && request.constraints.maximumMapCount < 1) {
    issues.push(error("invalidMaximumMapCount", "maximumMapCount must be at least 1.", "constraints.maximumMapCount"));
  }

  if (request.constraints?.maximumQuestCount !== undefined && request.constraints.maximumQuestCount < 0) {
    issues.push(error("invalidMaximumQuestCount", "maximumQuestCount cannot be negative.", "constraints.maximumQuestCount"));
  }

  if (request.mode !== "fullAdventure" && !request.existingAdventure) {
    issues.push(
      warning(
        "missingExistingAdventure",
        "Non-full-adventure requests should usually include an existingAdventure snapshot for grounded proposals.",
        "existingAdventure"
      )
    );
  }

  return issues;
}

export function createAdventureGenerationPlan(request: AdventureGenerationRequest): AdventureGenerationPlan {
  return {
    requestId: request.requestId,
    providerId: request.providerId,
    mode: request.mode,
    steps: [
      {
        id: "collect-context",
        kind: "collect-context",
        label: "Collect design context",
        description: request.existingAdventure
          ? "Use the existing adventure snapshot, prompt text, and constraints as grounded source context."
          : "Use the prompt text and constraints to define the initial adventure scope.",
        blocking: true
      },
      {
        id: "prompt-provider",
        kind: "prompt-provider",
        label: "Prompt provider",
        description: "Send a normalized generation request to the selected AI provider adapter.",
        blocking: true
      },
      {
        id: "validate-structure",
        kind: "validate-structure",
        label: "Validate structured proposal",
        description: "Check request/proposal envelope alignment and ensure the provider returned structured data.",
        blocking: true
      },
      {
        id: "check-references",
        kind: "check-references",
        label: "Check references and duplicates",
        description: "Run content-schema and validation checks before any proposed changes are accepted.",
        blocking: true
      },
      {
        id: "human-review",
        kind: "human-review",
        label: "Human review",
        description: "Present the structured proposal, warnings, and provenance for explicit designer approval.",
        blocking: true
      },
      {
        id: "apply-approved-mutation",
        kind: "apply-approved-mutation",
        label: "Apply approved mutation",
        description: "Only apply the proposal after human review accepts it.",
        blocking: true
      }
    ],
    reviewPolicy: {
      requiresHumanReview: true,
      applyMode: "manual-only"
    }
  };
}

export function validateAdventureProposal(
  request: AdventureGenerationRequest,
  proposal: AiAdventureProposal
): AiProposalIssue[] {
  const issues: AiProposalIssue[] = [];

  if (proposal.requestId !== request.requestId) {
    issues.push(error("requestMismatch", "Proposal requestId must match the request.", "requestId"));
  }

  if (proposal.providerId !== request.providerId) {
    issues.push(error("providerMismatch", "Proposal providerId must match the request providerId.", "providerId"));
  }

  if (!proposal.summary.trim()) {
    issues.push(error("missingSummary", "Proposal summary is required.", "summary"));
  }

  if (!proposal.provenance.generatedAt.trim()) {
    issues.push(error("missingGeneratedAt", "Proposal provenance must include generatedAt.", "provenance.generatedAt"));
  }

  if (proposal.provenance.providerId !== proposal.providerId) {
    issues.push(error("provenanceProviderMismatch", "Proposal provenance providerId must match proposal providerId.", "provenance.providerId"));
  }

  const hasAdventure = proposal.proposedAdventure !== undefined;
  const hasPatchSummary = (proposal.patchSummary?.length ?? 0) > 0;

  if (!hasAdventure && !hasPatchSummary) {
    issues.push(
      error(
        "missingProposalPayload",
        "Proposal must include either a proposedAdventure or a patchSummary describing the suggested changes.",
        "proposedAdventure"
      )
    );
  }

  if (proposal.reviewStatus === "readyForReview" && !hasAdventure) {
    issues.push(
      warning(
        "reviewWithoutAdventure",
        "A ready-for-review proposal should usually include a structured proposedAdventure payload.",
        "proposedAdventure"
      )
    );
  }

  return issues;
}

export function createProposalReviewReport(
  request: AdventureGenerationRequest,
  proposal: AiAdventureProposal
): AiProposalReviewReport {
  const issues = [
    ...validateAdventureGenerationRequest(request),
    ...validateAdventureProposal(request, proposal),
    ...(proposal.warnings ?? [])
  ];
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const readiness = errorCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "ready";

  return {
    requestId: request.requestId,
    proposalId: proposal.proposalId,
    providerId: proposal.providerId,
    generatedAt: proposal.provenance.generatedAt,
    readiness,
    issueSummary: {
      errorCount,
      warningCount
    },
    issues,
    canApply: readiness === "ready" && proposal.reviewStatus === "accepted",
    recommendedNextStep:
      readiness === "blocked"
        ? "Fix blocking request/proposal issues before review."
        : proposal.reviewStatus === "accepted"
          ? "Apply the accepted proposal through normal editor mutation flow."
          : "Review the proposal and explicitly accept or reject it before applying changes."
  };
}

export function createGenerationSessionRecord(
  request: AdventureGenerationRequest,
  proposal: AiAdventureProposal
): AiGenerationSessionRecord {
  const plan = createAdventureGenerationPlan(request);
  const reviewReport = createProposalReviewReport(request, proposal);

  return {
    sessionId: `${request.requestId}:${proposal.proposalId}`,
    providerId: request.providerId,
    createdAt: proposal.provenance.generatedAt,
    request,
    plan,
    proposal,
    reviewReport,
    summary: {
      mode: request.mode,
      readiness: reviewReport.readiness,
      canApply: reviewReport.canApply
    }
  };
}

export function validateGenerationSessionRecord(record: AiGenerationSessionRecord): AiProposalIssue[] {
  const issues: AiProposalIssue[] = [];

  if (record.providerId !== record.request.providerId) {
    issues.push(error("sessionProviderMismatch", "Session providerId must match the request providerId.", "providerId"));
  }

  if (record.plan.requestId !== record.request.requestId) {
    issues.push(error("sessionPlanRequestMismatch", "Session plan requestId must match the request requestId.", "plan.requestId"));
  }

  if (record.reviewReport.requestId !== record.request.requestId) {
    issues.push(
      error("sessionReviewRequestMismatch", "Session review report requestId must match the request requestId.", "reviewReport.requestId")
    );
  }

  if (record.reviewReport.proposalId !== record.proposal.proposalId) {
    issues.push(
      error(
        "sessionReviewProposalMismatch",
        "Session review report proposalId must match the proposal proposalId.",
        "reviewReport.proposalId"
      )
    );
  }

  if (record.summary.mode !== record.request.mode) {
    issues.push(error("sessionModeMismatch", "Session summary mode must match the request mode.", "summary.mode"));
  }

  if (record.summary.readiness !== record.reviewReport.readiness) {
    issues.push(
      error("sessionReadinessMismatch", "Session summary readiness must match the review report readiness.", "summary.readiness")
    );
  }

  if (record.summary.canApply !== record.reviewReport.canApply) {
    issues.push(error("sessionApplyMismatch", "Session summary canApply must match the review report.", "summary.canApply"));
  }

  return issues;
}

export function createProposalChangeSummary(
  request: AdventureGenerationRequest,
  proposal: AiAdventureProposal
): AiProposalChangeSummary {
  const beforeAdventure = request.existingAdventure;
  const afterAdventure = proposal.proposedAdventure;
  const counts = {
    maps: countDelta(beforeAdventure?.maps.length ?? 0, afterAdventure?.maps.length ?? 0),
    regions: countDelta(beforeAdventure?.regions.length ?? 0, afterAdventure?.regions.length ?? 0),
    dialogue: countDelta(beforeAdventure?.dialogue.length ?? 0, afterAdventure?.dialogue.length ?? 0),
    triggers: countDelta(beforeAdventure?.triggers.length ?? 0, afterAdventure?.triggers.length ?? 0),
    entityDefinitions: countDelta(beforeAdventure?.entityDefinitions.length ?? 0, afterAdventure?.entityDefinitions.length ?? 0),
    itemDefinitions: countDelta(beforeAdventure?.itemDefinitions.length ?? 0, afterAdventure?.itemDefinitions.length ?? 0),
    skillDefinitions: countDelta(beforeAdventure?.skillDefinitions.length ?? 0, afterAdventure?.skillDefinitions.length ?? 0),
    traitDefinitions: countDelta(beforeAdventure?.traitDefinitions.length ?? 0, afterAdventure?.traitDefinitions.length ?? 0),
    spellDefinitions: countDelta(beforeAdventure?.spellDefinitions.length ?? 0, afterAdventure?.spellDefinitions.length ?? 0),
    tileDefinitions: countDelta(beforeAdventure?.tileDefinitions.length ?? 0, afterAdventure?.tileDefinitions.length ?? 0),
    questDefinitions: countDelta(beforeAdventure?.questDefinitions.length ?? 0, afterAdventure?.questDefinitions.length ?? 0),
    flagDefinitions: countDelta(beforeAdventure?.flagDefinitions.length ?? 0, afterAdventure?.flagDefinitions.length ?? 0),
    customLibraryObjects: countDelta(beforeAdventure?.customLibraryObjects.length ?? 0, afterAdventure?.customLibraryObjects.length ?? 0),
    assets: countDelta(beforeAdventure?.assets.length ?? 0, afterAdventure?.assets.length ?? 0),
    starterLibraryPacks: countDelta(beforeAdventure?.starterLibraryPacks.length ?? 0, afterAdventure?.starterLibraryPacks.length ?? 0),
    mediaCues: countDelta(beforeAdventure?.mediaCues.length ?? 0, afterAdventure?.mediaCues.length ?? 0),
    soundCues: countDelta(beforeAdventure?.soundCues.length ?? 0, afterAdventure?.soundCues.length ?? 0)
  };

  return {
    proposalId: proposal.proposalId,
    requestId: request.requestId,
    mode: request.mode,
    hasStructuredAdventure: afterAdventure !== undefined,
    counts,
    summaryLines: createSummaryLines(counts, afterAdventure !== undefined)
  };
}

export function createProposalApplicationPlan(
  session: AiGenerationSessionRecord,
  changeSummary: AiProposalChangeSummary
): AiProposalApplicationPlan {
  const targets = changeSummary.hasStructuredAdventure
    ? Object.entries(changeSummary.counts)
      .filter(([, value]) => value.delta !== 0)
      .map(([section, value]) => ({
        section,
        delta: value.delta,
        applyLabel: `Apply ${formatDelta(value.delta)} change(s) to ${section}.`
      }))
      .sort((left, right) => left.section.localeCompare(right.section))
    : [];

  const blockers = [
    ...session.reviewReport.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message),
    ...(changeSummary.hasStructuredAdventure ? [] : ["Structured adventure payload is required before object changes can be applied."])
  ];

  return {
    requestId: session.request.requestId,
    proposalId: session.proposal.proposalId,
    readiness: session.reviewReport.readiness,
    canApply: session.reviewReport.canApply && changeSummary.hasStructuredAdventure,
    requiresHumanReview: session.plan.reviewPolicy.requiresHumanReview,
    applyMode: session.plan.reviewPolicy.applyMode,
    targets,
    blockers,
    nextStep:
      blockers.length > 0
        ? "Resolve blockers and keep the proposal in review."
        : session.reviewReport.canApply
          ? "Apply the approved proposal through the normal editor mutation flow."
          : "Finish human review and accept the proposal before applying changes."
  };
}

function error(code: string, message: string, path: string): AiProposalIssue {
  return { code, severity: "error", message, path };
}

function warning(code: string, message: string, path: string): AiProposalIssue {
  return { code, severity: "warning", message, path };
}

function countDelta(before: number, after: number): AiProposalCountDelta {
  return {
    before,
    after,
    delta: after - before
  };
}

function createSummaryLines(
  counts: AiProposalChangeSummary["counts"],
  hasStructuredAdventure: boolean
): string[] {
  if (!hasStructuredAdventure) {
    return ["No structured adventure payload was supplied, so object-count changes cannot be summarized yet."];
  }

  return Object.entries(counts)
    .filter(([, value]) => value.delta !== 0)
    .map(([key, value]) => `${key}: ${formatDelta(value.delta)} (${value.before} -> ${value.after})`)
    .sort((left, right) => left.localeCompare(right));
}

function formatDelta(delta: number): string {
  return delta >= 0 ? `+${delta}` : `${delta}`;
}
