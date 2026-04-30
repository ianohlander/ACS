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

function error(code: string, message: string, path: string): AiProposalIssue {
  return { code, severity: "error", message, path };
}

function warning(code: string, message: string, path: string): AiProposalIssue {
  return { code, severity: "warning", message, path };
}
