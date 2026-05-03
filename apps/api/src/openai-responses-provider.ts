import {
  createAiGameCreationRequestPlan,
  createOpenAiResponsesRequestPlan,
  validateAdventureProposal,
  type AiAdventureProposal,
  type AiGameCreationRequestPlan,
  type AiGameCreationPromptInput,
  type AiProposalIssue,
  type OpenAiResponsesRequestPlan
} from "@acs/ai-core";
import type { SubmitAiGameCreationOpenAiRequest, SubmitAiGameCreationOpenAiResponse } from "@acs/project-api";

export interface OpenAiResponsesRuntimeConfig {
  apiKeyEnvironmentVariable: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export interface OpenAiResponsesSubmitOptions {
  now?: () => Date;
  fetch?: typeof fetch;
}

export async function submitOpenAiGameCreationRequest(
  request: SubmitAiGameCreationOpenAiRequest,
  config: OpenAiResponsesRuntimeConfig,
  options: OpenAiResponsesSubmitOptions = {}
): Promise<SubmitAiGameCreationOpenAiResponse> {
  const now = options.now ?? (() => new Date());
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const requestPlan = createAiGameCreationRequestPlan(toGameCreationPromptInput(request, now));
  const providerPlan = createProviderPlan(requestPlan, request, config);
  const blockedResponse = createBlockedProviderResponse(requestPlan, providerPlan) ?? createMissingApiKeyResponse(requestPlan, providerPlan, config);

  if (blockedResponse) {
    return blockedResponse;
  }

  const providerResponse = await submitResponsesPayload(providerPlan, config.apiKey ?? "", fetchImpl);
  return createSubmittedProviderResponse(requestPlan, providerPlan, providerResponse.body);
}

function createProviderPlan(
  requestPlan: AiGameCreationRequestPlan,
  request: SubmitAiGameCreationOpenAiRequest,
  config: OpenAiResponsesRuntimeConfig
): OpenAiResponsesRequestPlan {
  return createOpenAiResponsesRequestPlan(requestPlan, {
    model: request.model ?? config.model ?? "",
    apiKeyEnvironmentVariable: config.apiKeyEnvironmentVariable,
    ...(config.endpoint ? { endpoint: config.endpoint } : {})
  });
}

function createBlockedProviderResponse(
  requestPlan: AiGameCreationRequestPlan,
  providerPlan: OpenAiResponsesRequestPlan
): SubmitAiGameCreationOpenAiResponse | undefined {
  if (providerPlan.canSubmitToProvider && providerPlan.payload) {
    return undefined;
  }

  return {
    requestPlan,
    providerPlan,
    issues: [...requestPlan.requestIssues, ...providerPlan.configIssues],
    status: "blocked",
    nextStep: providerPlan.nextStep
  };
}

function createMissingApiKeyResponse(
  requestPlan: AiGameCreationRequestPlan,
  providerPlan: OpenAiResponsesRequestPlan,
  config: OpenAiResponsesRuntimeConfig
): SubmitAiGameCreationOpenAiResponse | undefined {
  if (config.apiKey?.trim()) {
    return undefined;
  }

  return {
    requestPlan,
    providerPlan,
    issues: [
      {
        severity: "error",
        code: "missingOpenAiApiKey",
        message: `OpenAI API key environment variable '${config.apiKeyEnvironmentVariable}' is not configured.`,
        path: "apiKeyEnvironmentVariable"
      }
    ],
    status: "blocked",
    nextStep: "Set the server-side OpenAI API key environment variable before submitting AI game creation requests."
  };
}

function createSubmittedProviderResponse(
  requestPlan: AiGameCreationRequestPlan,
  providerPlan: OpenAiResponsesRequestPlan,
  responseBody: unknown
): SubmitAiGameCreationOpenAiResponse {
  const parsed = extractAiAdventureProposalFromOpenAiResponses(responseBody);
  const responseId = getStringProperty(responseBody, "id");

  if (!parsed.proposal) {
    return {
      requestPlan,
      providerPlan,
      ...(responseId ? { providerResponseId: responseId } : {}),
      issues: parsed.issues,
      status: "submitted",
      nextStep: "OpenAI returned a response, but no parseable AiAdventureProposal was found. Review provider output before retrying."
    };
  }

  const proposalIssues = validateAdventureProposal(requestPlan.request, parsed.proposal);
  return {
    requestPlan,
    providerPlan,
    proposal: parsed.proposal,
    ...(responseId ? { providerResponseId: responseId } : {}),
    issues: proposalIssues,
    status: proposalIssues.some((issue) => issue.severity === "error") ? "submitted" : "proposalReady",
    nextStep: proposalIssues.some((issue) => issue.severity === "error")
      ? "Resolve returned proposal validation issues before presenting it for review."
      : "Present the returned AiAdventureProposal for human review before applying any changes."
  };
}

export function extractAiAdventureProposalFromOpenAiResponses(responseBody: unknown): {
  proposal?: AiAdventureProposal;
  issues: AiProposalIssue[];
} {
  const refusal = findOpenAiRefusal(responseBody);
  if (refusal) {
    return {
      issues: [
        {
          severity: "error",
          code: "openAiRefusal",
          message: refusal,
          path: "response.output"
        }
      ]
    };
  }

  const outputText = findOpenAiOutputText(responseBody);
  if (!outputText) {
    return {
      issues: [
        {
          severity: "error",
          code: "missingOpenAiOutputText",
          message: "OpenAI Responses output did not include output_text content.",
          path: "response.output"
        }
      ]
    };
  }

  try {
    return {
      proposal: JSON.parse(outputText) as AiAdventureProposal,
      issues: []
    };
  } catch {
    return {
      issues: [
        {
          severity: "error",
          code: "invalidOpenAiOutputJson",
          message: "OpenAI Responses output_text was not valid JSON.",
          path: "response.output_text"
        }
      ]
    };
  }
}

function toGameCreationPromptInput(request: SubmitAiGameCreationOpenAiRequest, now: () => Date): AiGameCreationPromptInput {
  return {
    requestId: request.requestId ?? `req_openai_${now().getTime()}`,
    createdAt: request.createdAt ?? now().toISOString(),
    providerId: "openai_responses",
    intent: request.intent,
    prompt: request.prompt,
    ...(request.constraints ? { constraints: request.constraints } : {}),
    ...(request.existingAdventure ? { existingAdventure: request.existingAdventure } : {})
  };
}

async function submitResponsesPayload(
  providerPlan: OpenAiResponsesRequestPlan,
  apiKey: string,
  fetchImpl: typeof fetch
): Promise<{ body: unknown }> {
  const payload = providerPlan.payload;
  if (!payload) {
    throw new Error("OpenAI provider plan has no request payload.");
  }

  const response = await fetchImpl(payload.endpoint, {
    method: payload.method,
    headers: {
      "Content-Type": payload.headers["Content-Type"],
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload.body)
  });
  const raw = await response.text();
  const body = raw ? (JSON.parse(raw) as unknown) : undefined;

  if (!response.ok) {
    const message = getOpenAiErrorMessage(body) ?? `OpenAI Responses request failed with ${response.status}.`;
    throw new Error(message);
  }

  return { body };
}

function findOpenAiOutputText(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (typeof value.output_text === "string") {
    return value.output_text;
  }

  return getOpenAiContentEntries(value).map(readOutputText).find((text): text is string => Boolean(text));
}

function findOpenAiRefusal(value: unknown): string | undefined {
  return getOpenAiContentEntries(value).map(readRefusalText).find((text): text is string => Boolean(text));
}

function getOpenAiContentEntries(value: unknown): unknown[] {
  if (!isRecord(value) || !Array.isArray(value.output)) {
    return [];
  }

  return value.output.flatMap(getOutputItemContent);
}

function getOutputItemContent(item: unknown): unknown[] {
  return isRecord(item) && Array.isArray(item.content) ? item.content : [];
}

function readOutputText(content: unknown): string | undefined {
  return isRecord(content) && content.type === "output_text" && typeof content.text === "string" ? content.text : undefined;
}

function readRefusalText(content: unknown): string | undefined {
  return isRecord(content) && content.type === "refusal" && typeof content.refusal === "string" ? content.refusal : undefined;
}

function getOpenAiErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.error)) {
    return undefined;
  }

  return typeof value.error.message === "string" ? value.error.message : undefined;
}

function getStringProperty(value: unknown, property: string): string | undefined {
  return isRecord(value) && typeof value[property] === "string" ? value[property] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
