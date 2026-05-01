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

export type AiGenerationSessionPackageFileKind = "manifest" | "session-record" | "change-summary" | "application-plan" | "readme";

export interface AiGenerationSessionPackageFile {
  path: string;
  kind: AiGenerationSessionPackageFileKind;
  description: string;
  required: boolean;
}

export interface AiGenerationSessionPackageManifest {
  sessionId: string;
  requestId: string;
  proposalId: string;
  providerId: string;
  createdAt: string;
  readiness: AiReviewReadiness;
  canApply: boolean;
  manifestFileName: string;
  recommendedArchiveFileName: string;
  recommendedExtractedFolderName: string;
  files: AiGenerationSessionPackageFile[];
  summaryLines: string[];
  nextStep: string;
}

export interface AiGenerationSessionPackage {
  manifest: AiGenerationSessionPackageManifest;
  sessionRecord: AiGenerationSessionRecord;
  changeSummary: AiProposalChangeSummary;
  applicationPlan: AiProposalApplicationPlan;
  readmeText: string;
}

export interface AiGenerationSessionPackageContentFile {
  path: string;
  mediaType: "application/json" | "text/plain";
  content: string;
}

export interface AiGenerationSessionPackageFileBundle {
  archiveFileName: string;
  extractedFolderName: string;
  files: AiGenerationSessionPackageContentFile[];
}

export interface AiGenerationSessionPackageArchiveEntry {
  path: string;
  mediaType: "application/json" | "text/plain";
  size: number;
}

export interface AiGenerationSessionPackageArchive {
  archiveFileName: string;
  extractedFolderName: string;
  entries: AiGenerationSessionPackageArchiveEntry[];
  bytes: Uint8Array;
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

export function createGenerationSessionPackage(
  session: AiGenerationSessionRecord,
  changeSummary: AiProposalChangeSummary,
  applicationPlan: AiProposalApplicationPlan
): AiGenerationSessionPackage {
  const fileStem = createPackageFileStem(session.request.requestId, session.proposal.proposalId);
  const manifest: AiGenerationSessionPackageManifest = {
    sessionId: session.sessionId,
    requestId: session.request.requestId,
    proposalId: session.proposal.proposalId,
    providerId: session.providerId,
    createdAt: session.createdAt,
    readiness: applicationPlan.readiness,
    canApply: applicationPlan.canApply,
    manifestFileName: "package-manifest.json",
    recommendedArchiveFileName: `${fileStem}-ai-review-package.zip`,
    recommendedExtractedFolderName: `${fileStem}-ai-review-package`,
    files: [
      {
        path: "package-manifest.json",
        kind: "manifest",
        description: "Package-level manifest with required file list, readiness, and recommended handoff names.",
        required: true
      },
      {
        path: "session-record.json",
        kind: "session-record",
        description: "Portable AI session record with request, proposal, review report, and summary state.",
        required: true
      },
      {
        path: "change-summary.json",
        kind: "change-summary",
        description: "Structured count-delta summary for the proposed adventure changes.",
        required: true
      },
      {
        path: "application-plan.json",
        kind: "application-plan",
        description: "Apply-readiness, blockers, and target-section plan for the reviewed proposal.",
        required: true
      },
      {
        path: "README.txt",
        kind: "readme",
        description: "Human-readable overview of the AI review package contents and next step.",
        required: true
      }
    ],
    summaryLines: [
      `Provider: ${session.providerId}`,
      `Mode: ${session.request.mode}`,
      `Review readiness: ${applicationPlan.readiness}`,
      `Can apply: ${applicationPlan.canApply ? "yes" : "no"}`,
      `Target sections: ${applicationPlan.targets.length}`,
      `Blockers: ${applicationPlan.blockers.length}`
    ],
    nextStep: applicationPlan.nextStep
  };

  return {
    manifest,
    sessionRecord: session,
    changeSummary,
    applicationPlan,
    readmeText: createGenerationSessionPackageReadme(session, applicationPlan, manifest)
  };
}

export function validateGenerationSessionPackage(pkg: AiGenerationSessionPackage): AiProposalIssue[] {
  const issues = [...validateGenerationSessionRecord(pkg.sessionRecord)];

  if (pkg.manifest.sessionId !== pkg.sessionRecord.sessionId) {
    issues.push(error("packageSessionMismatch", "Package manifest sessionId must match the session record.", "manifest.sessionId"));
  }

  if (pkg.manifest.requestId !== pkg.sessionRecord.request.requestId) {
    issues.push(error("packageRequestMismatch", "Package manifest requestId must match the session request.", "manifest.requestId"));
  }

  if (pkg.manifest.proposalId !== pkg.sessionRecord.proposal.proposalId) {
    issues.push(error("packageProposalMismatch", "Package manifest proposalId must match the session proposal.", "manifest.proposalId"));
  }

  if (pkg.changeSummary.proposalId !== pkg.sessionRecord.proposal.proposalId) {
    issues.push(
      error(
        "packageChangeSummaryProposalMismatch",
        "Package change summary proposalId must match the session proposal.",
        "changeSummary.proposalId"
      )
    );
  }

  if (pkg.applicationPlan.proposalId !== pkg.sessionRecord.proposal.proposalId) {
    issues.push(
      error(
        "packageApplicationProposalMismatch",
        "Package application plan proposalId must match the session proposal.",
        "applicationPlan.proposalId"
      )
    );
  }

  if (pkg.applicationPlan.requestId !== pkg.sessionRecord.request.requestId) {
    issues.push(
      error(
        "packageApplicationRequestMismatch",
        "Package application plan requestId must match the session request.",
        "applicationPlan.requestId"
      )
    );
  }

  if (pkg.manifest.readiness !== pkg.applicationPlan.readiness) {
    issues.push(
      error("packageReadinessMismatch", "Package manifest readiness must match the application plan readiness.", "manifest.readiness")
    );
  }

  if (pkg.manifest.canApply !== pkg.applicationPlan.canApply) {
    issues.push(error("packageCanApplyMismatch", "Package manifest canApply must match the application plan.", "manifest.canApply"));
  }

  if (!pkg.manifest.manifestFileName.trim()) {
    issues.push(error("packageMissingManifestFileName", "Package manifestFileName must be populated.", "manifest.manifestFileName"));
  }

  const requiredPaths = [pkg.manifest.manifestFileName, "session-record.json", "change-summary.json", "application-plan.json", "README.txt"];
  for (const requiredPath of requiredPaths) {
    if (!pkg.manifest.files.some((file) => file.path === requiredPath && file.required)) {
      issues.push(
        error("packageMissingFile", `Package manifest must include required file '${requiredPath}'.`, "manifest.files")
      );
    }
  }

  if (!pkg.readmeText.trim()) {
    issues.push(error("packageMissingReadmeText", "Package readmeText must be populated.", "readmeText"));
  }

  return issues;
}

export function createGenerationSessionPackageFileBundle(pkg: AiGenerationSessionPackage): AiGenerationSessionPackageFileBundle {
  return {
    archiveFileName: pkg.manifest.recommendedArchiveFileName,
    extractedFolderName: pkg.manifest.recommendedExtractedFolderName,
    files: [
      createJsonBundleFile(pkg.manifest.manifestFileName, pkg.manifest),
      createJsonBundleFile("session-record.json", pkg.sessionRecord),
      createJsonBundleFile("change-summary.json", pkg.changeSummary),
      createJsonBundleFile("application-plan.json", pkg.applicationPlan),
      {
        path: "README.txt",
        mediaType: "text/plain",
        content: pkg.readmeText
      }
    ]
  };
}

export function validateGenerationSessionPackageFileBundle(
  pkg: AiGenerationSessionPackage,
  bundle: AiGenerationSessionPackageFileBundle
): AiProposalIssue[] {
  const issues = [...validateGenerationSessionPackage(pkg)];

  if (bundle.archiveFileName !== pkg.manifest.recommendedArchiveFileName) {
    issues.push(
      error(
        "packageBundleArchiveMismatch",
        "Package bundle archiveFileName must match the package manifest recommendedArchiveFileName.",
        "bundle.archiveFileName"
      )
    );
  }

  if (bundle.extractedFolderName !== pkg.manifest.recommendedExtractedFolderName) {
    issues.push(
      error(
        "packageBundleFolderMismatch",
        "Package bundle extractedFolderName must match the package manifest recommendedExtractedFolderName.",
        "bundle.extractedFolderName"
      )
    );
  }

  for (const file of pkg.manifest.files.filter((entry) => entry.required)) {
    if (!bundle.files.some((bundleFile) => bundleFile.path === file.path)) {
      issues.push(
        error("packageBundleMissingFile", `Package bundle must include required file '${file.path}'.`, "bundle.files")
      );
    }
  }

  return issues;
}

export function createGenerationSessionPackageArchive(pkg: AiGenerationSessionPackage): AiGenerationSessionPackageArchive {
  const bundle = createGenerationSessionPackageFileBundle(pkg);
  return {
    archiveFileName: bundle.archiveFileName,
    extractedFolderName: bundle.extractedFolderName,
    entries: bundle.files.map((file) => ({
      path: file.path,
      mediaType: file.mediaType,
      size: encodeUtf8(file.content).length
    })),
    bytes: createTextFileArchive(bundle.files.map((file) => ({ path: file.path, contents: file.content })))
  };
}

export function validateGenerationSessionPackageArchive(
  pkg: AiGenerationSessionPackage,
  archive: AiGenerationSessionPackageArchive
): AiProposalIssue[] {
  const bundle = createGenerationSessionPackageFileBundle(pkg);
  const issues = validateGenerationSessionPackageFileBundle(pkg, bundle);

  if (archive.archiveFileName !== bundle.archiveFileName) {
    issues.push(
      error(
        "packageArchiveNameMismatch",
        "Package archiveFileName must match the generated bundle archiveFileName.",
        "archive.archiveFileName"
      )
    );
  }

  if (archive.extractedFolderName !== bundle.extractedFolderName) {
    issues.push(
      error(
        "packageArchiveFolderMismatch",
        "Package extractedFolderName must match the generated bundle extractedFolderName.",
        "archive.extractedFolderName"
      )
    );
  }

  if (archive.bytes.length === 0) {
    issues.push(error("packageArchiveEmpty", "Package archive bytes must not be empty.", "archive.bytes"));
  }

  for (const file of bundle.files) {
    const entry = archive.entries.find((candidate) => candidate.path === file.path);
    if (!entry) {
      issues.push(error("packageArchiveMissingEntry", `Package archive must include '${file.path}'.`, "archive.entries"));
      continue;
    }

    if (entry.mediaType !== file.mediaType) {
      issues.push(
        error(
          "packageArchiveMediaTypeMismatch",
          `Package archive entry '${file.path}' must preserve its media type.`,
          "archive.entries"
        )
      );
    }

    if (entry.size !== encodeUtf8(file.content).length) {
      issues.push(
        error(
          "packageArchiveEntrySizeMismatch",
          `Package archive entry '${file.path}' must preserve its byte size.`,
          "archive.entries"
        )
      );
    }
  }

  return issues;
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

function createPackageFileStem(requestId: string, proposalId: string): string {
  return `${sanitizeFileNamePart(requestId)}-${sanitizeFileNamePart(proposalId)}`;
}

function sanitizeFileNamePart(value: string): string {
  return value.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "session";
}

function createGenerationSessionPackageReadme(
  session: AiGenerationSessionRecord,
  applicationPlan: AiProposalApplicationPlan,
  manifest: AiGenerationSessionPackageManifest
): string {
  return [
    "ACS AI Review Package",
    `Session: ${session.sessionId}`,
    `Provider: ${session.providerId}`,
    `Mode: ${session.request.mode}`,
    `Readiness: ${applicationPlan.readiness}`,
    `Can apply: ${applicationPlan.canApply ? "yes" : "no"}`,
    `Recommended archive: ${manifest.recommendedArchiveFileName}`,
    `Recommended folder: ${manifest.recommendedExtractedFolderName}`,
    `Next step: ${applicationPlan.nextStep}`
  ].join("\n");
}

function createJsonBundleFile(path: string, value: object): AiGenerationSessionPackageContentFile {
  return {
    path,
    mediaType: "application/json",
    content: JSON.stringify(value, null, 2)
  };
}

const ZIP_VERSION = 20;
const ZIP_METHOD_STORE = 0;
const DOS_EPOCH_DATE = (1 << 5) | 1;
const DOS_EPOCH_TIME = 0;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

interface EncodedZipFile {
  path: string;
  pathBytes: Uint8Array;
  contents: Uint8Array;
  crc32: number;
}

interface CentralDirectoryRecord {
  file: EncodedZipFile;
  localHeaderOffset: number;
}

function createTextFileArchive(files: Array<{ path: string; contents: string }>): Uint8Array {
  return createArchiveFromEncodedFiles(encodeArchiveFiles(files));
}

function createArchiveFromEncodedFiles(files: EncodedZipFile[]): Uint8Array {
  const localSections: Uint8Array[] = [];
  const centralRecords: CentralDirectoryRecord[] = [];
  let localOffset = 0;

  for (const file of files) {
    const localHeader = createLocalFileHeader(file);
    localSections.push(localHeader, file.contents);
    centralRecords.push({ file, localHeaderOffset: localOffset });
    localOffset += localHeader.length + file.contents.length;
  }

  const centralSections = centralRecords.map(createCentralDirectoryRecord);
  const centralDirectorySize = sumSectionLengths(centralSections);
  const endRecord = createEndOfCentralDirectoryRecord(files.length, centralDirectorySize, localOffset);
  return concatenateSections([...localSections, ...centralSections, endRecord]);
}

function encodeArchiveFiles(files: Array<{ path: string; contents: string }>): EncodedZipFile[] {
  const seenPaths = new Set<string>();
  return files.map((file) => encodeArchiveFile(file, seenPaths));
}

function encodeArchiveFile(file: { path: string; contents: string }, seenPaths: Set<string>): EncodedZipFile {
  const path = normalizeZipPath(file.path);
  if (!path) {
    throw new Error("AI review package archive contains a file with an empty path.");
  }
  if (seenPaths.has(path)) {
    throw new Error(`AI review package archive contains duplicate path '${path}'.`);
  }

  seenPaths.add(path);
  const pathBytes = encodeUtf8(path);
  const contents = encodeUtf8(file.contents);
  return {
    path,
    pathBytes,
    contents,
    crc32: calculateCrc32(contents)
  };
}

function normalizeZipPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+/, "");
}

function createLocalFileHeader(file: EncodedZipFile): Uint8Array {
  const bytes = new Uint8Array(30 + file.pathBytes.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, LOCAL_FILE_HEADER_SIGNATURE, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, ZIP_METHOD_STORE, true);
  view.setUint16(10, DOS_EPOCH_TIME, true);
  view.setUint16(12, DOS_EPOCH_DATE, true);
  view.setUint32(14, file.crc32, true);
  view.setUint32(18, file.contents.length, true);
  view.setUint32(22, file.contents.length, true);
  view.setUint16(26, file.pathBytes.length, true);
  view.setUint16(28, 0, true);
  bytes.set(file.pathBytes, 30);
  return bytes;
}

function createCentralDirectoryRecord(record: CentralDirectoryRecord): Uint8Array {
  const { file, localHeaderOffset } = record;
  const bytes = new Uint8Array(46 + file.pathBytes.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, CENTRAL_DIRECTORY_SIGNATURE, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, ZIP_VERSION, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, ZIP_METHOD_STORE, true);
  view.setUint16(12, DOS_EPOCH_TIME, true);
  view.setUint16(14, DOS_EPOCH_DATE, true);
  view.setUint32(16, file.crc32, true);
  view.setUint32(20, file.contents.length, true);
  view.setUint32(24, file.contents.length, true);
  view.setUint16(28, file.pathBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localHeaderOffset, true);
  bytes.set(file.pathBytes, 46);
  return bytes;
}

function createEndOfCentralDirectoryRecord(
  fileCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number
): Uint8Array {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, END_OF_CENTRAL_DIRECTORY_SIGNATURE, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);
  return bytes;
}

function encodeUtf8(value: string): Uint8Array {
  const escaped = unescape(encodeURIComponent(value));
  const bytes = new Uint8Array(escaped.length);
  for (let index = 0; index < escaped.length; index += 1) {
    bytes[index] = escaped.charCodeAt(index);
  }
  return bytes;
}

function sumSectionLengths(sections: Uint8Array[]): number {
  return sections.reduce((total, section) => total + section.length, 0);
}

function concatenateSections(sections: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(sumSectionLengths(sections));
  let offset = 0;

  for (const section of sections) {
    output.set(section, offset);
    offset += section.length;
  }

  return output;
}

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = updateCrc32(crc, byte);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function updateCrc32(crc: number, byte: number): number {
  let next = crc ^ byte;

  for (let bit = 0; bit < 8; bit += 1) {
    next = (next & 1) !== 0 ? (next >>> 1) ^ 0xedb88320 : next >>> 1;
  }

  return next >>> 0;
}
