import { EdgeFunctionError } from "./edge.ts";

// @ts-ignore - Deno global available at runtime
const _Deno = Deno as typeof Deno & {
  env: { get(key: string): string | undefined };
};

export type AiProviderId = "openai" | "anthropic" | "google";

export interface AiImageInput {
  mimeType: string;
  base64: string;
}

export interface AiCompletionRequest {
  feature: string;
  system: string;
  user: string;
  images?: AiImageInput[];
  maxOutputTokens?: number;
}

export interface AiCompletionResult {
  text: string;
  provider: AiProviderId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
}

export interface AiGenerationMeta {
  provider: AiProviderId;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

const DEFAULT_PROVIDER_ORDER: AiProviderId[] = ["openai", "anthropic", "google"];

const MODEL_BY_PROVIDER: Record<AiProviderId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-20241022",
  google: "gemini-2.0-flash",
};

const COST_PER_MILLION: Record<
  AiProviderId,
  { input: number; output: number }
> = {
  openai: { input: 0.15, output: 0.6 },
  anthropic: { input: 0.25, output: 1.25 },
  google: { input: 0.1, output: 0.4 },
};

type CircuitState = {
  failures: number;
  openedAt: number | null;
};

const circuitByProvider = new Map<AiProviderId, CircuitState>();

function getEnv(name: string, fallback?: string) {
  return _Deno.env.get(name) ?? fallback;
}

function getRequiredProviderOrder(): AiProviderId[] {
  const raw = getEnv("AI_PROVIDER_ORDER", "openai,anthropic,google") ?? "";
  const parsed = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(
      (value): value is AiProviderId =>
        value === "openai" || value === "anthropic" || value === "google",
    );
  return parsed.length > 0 ? parsed : DEFAULT_PROVIDER_ORDER;
}

function getProviderApiKey(provider: AiProviderId): string | null {
  if (provider === "openai") {
    return getEnv("OPENAI_API_KEY") ?? null;
  }
  if (provider === "anthropic") {
    return getEnv("ANTHROPIC_API_KEY") ?? null;
  }
  return getEnv("GOOGLE_AI_API_KEY") ?? getEnv("GEMINI_API_KEY") ?? null;
}

function getTimeoutMs() {
  const value = Number(getEnv("AI_REQUEST_TIMEOUT_MS", "28000"));
  return Number.isFinite(value) && value > 1000 ? value : 28000;
}

function getMaxRetries() {
  const value = Number(getEnv("AI_MAX_RETRIES", "2"));
  return Number.isFinite(value) && value >= 0 ? Math.min(value, 4) : 2;
}

function getCircuitFailureThreshold() {
  const value = Number(getEnv("AI_CIRCUIT_FAILURE_THRESHOLD", "5"));
  return Number.isFinite(value) && value > 0 ? value : 5;
}

function getCircuitCooldownMs() {
  const value = Number(getEnv("AI_CIRCUIT_COOLDOWN_MS", "60000"));
  return Number.isFinite(value) && value > 0 ? value : 60000;
}

function estimateCostUsd(
  provider: AiProviderId,
  inputTokens: number,
  outputTokens: number,
) {
  const rates = COST_PER_MILLION[provider];
  return (
    (inputTokens / 1_000_000) * rates.input +
    (outputTokens / 1_000_000) * rates.output
  );
}

function isCircuitOpen(provider: AiProviderId) {
  const state = circuitByProvider.get(provider);
  if (!state?.openedAt) {
    return false;
  }
  if (Date.now() - state.openedAt >= getCircuitCooldownMs()) {
    circuitByProvider.set(provider, { failures: 0, openedAt: null });
    return false;
  }
  return true;
}

function recordProviderFailure(provider: AiProviderId) {
  const current = circuitByProvider.get(provider) ?? {
    failures: 0,
    openedAt: null,
  };
  const failures = current.failures + 1;
  const openedAt =
    failures >= getCircuitFailureThreshold() ? Date.now() : current.openedAt;
  circuitByProvider.set(provider, { failures, openedAt });
}

function recordProviderSuccess(provider: AiProviderId) {
  circuitByProvider.set(provider, { failures: 0, openedAt: null });
}

function parseJsonFromModelText(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Model output was not a JSON object.");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new EdgeFunctionError(
      "server_error",
      500,
      "Model returned invalid JSON.",
      {
        reason: error instanceof Error ? error.message : "parse_failed",
      },
    );
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAi(
  request: AiCompletionRequest,
  model: string,
  timeoutMs: number,
): Promise<AiCompletionResult> {
  const apiKey = getProviderApiKey("openai");
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const content: Record<string, unknown>[] = [
    { type: "text", text: request.user },
  ];
  for (const image of request.images ?? []) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${image.mimeType};base64,${image.base64}`,
      },
    });
  }

  const startedAt = Date.now();
  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: request.maxOutputTokens ?? 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: request.system },
          { role: "user", content },
        ],
      }),
    },
    timeoutMs,
  );

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("OpenAI returned an empty completion.");
  }

  const usage = payload?.usage ?? {};
  const inputTokens = Number(usage.prompt_tokens ?? 0);
  const outputTokens = Number(usage.completion_tokens ?? 0);
  const latencyMs = Date.now() - startedAt;

  return {
    text,
    provider: "openai",
    model,
    inputTokens,
    outputTokens,
    latencyMs,
    estimatedCostUsd: estimateCostUsd("openai", inputTokens, outputTokens),
  };
}

async function callAnthropic(
  request: AiCompletionRequest,
  model: string,
  timeoutMs: number,
): Promise<AiCompletionResult> {
  const apiKey = getProviderApiKey("anthropic");
  if (!apiKey) {
    throw new Error("Anthropic API key is not configured.");
  }

  const content: Record<string, unknown>[] = [{ type: "text", text: request.user }];
  for (const image of request.images ?? []) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mimeType,
        data: image.base64,
      },
    });
  }

  const startedAt = Date.now();
  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxOutputTokens ?? 900,
        temperature: 0.2,
        system: `${request.system}\nRespond with valid JSON only.`,
        messages: [{ role: "user", content }],
      }),
    },
    timeoutMs,
  );

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status}`);
  }

  const payload = await response.json();
  const textBlock = Array.isArray(payload?.content)
    ? payload.content.find(
        (block: { type?: string }) => block?.type === "text",
      )
    : null;
  const text = textBlock?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Anthropic returned an empty completion.");
  }

  const usage = payload?.usage ?? {};
  const inputTokens = Number(usage.input_tokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? 0);
  const latencyMs = Date.now() - startedAt;

  return {
    text,
    provider: "anthropic",
    model,
    inputTokens,
    outputTokens,
    latencyMs,
    estimatedCostUsd: estimateCostUsd("anthropic", inputTokens, outputTokens),
  };
}

async function callGoogle(
  request: AiCompletionRequest,
  model: string,
  timeoutMs: number,
): Promise<AiCompletionResult> {
  const apiKey = getProviderApiKey("google");
  if (!apiKey) {
    throw new Error("Google AI API key is not configured.");
  }

  const parts: Record<string, unknown>[] = [
    { text: `${request.system}\n\n${request.user}\n\nRespond with valid JSON only.` },
  ];
  for (const image of request.images ?? []) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64,
      },
    });
  }

  const startedAt = Date.now();
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: request.maxOutputTokens ?? 900,
          responseMimeType: "application/json",
        },
        contents: [{ role: "user", parts }],
      }),
    },
    timeoutMs,
  );

  if (!response.ok) {
    throw new Error(`Google AI request failed: ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Google AI returned an empty completion.");
  }

  const usage = payload?.usageMetadata ?? {};
  const inputTokens = Number(usage.promptTokenCount ?? 0);
  const outputTokens = Number(usage.candidatesTokenCount ?? 0);
  const latencyMs = Date.now() - startedAt;

  return {
    text,
    provider: "google",
    model,
    inputTokens,
    outputTokens,
    latencyMs,
    estimatedCostUsd: estimateCostUsd("google", inputTokens, outputTokens),
  };
}

async function callProvider(
  provider: AiProviderId,
  request: AiCompletionRequest,
): Promise<AiCompletionResult> {
  const timeoutMs = getTimeoutMs();
  const model =
    getEnv(`AI_MODEL_${provider.toUpperCase()}`) ?? MODEL_BY_PROVIDER[provider];

  if (provider === "openai") {
    return callOpenAi(request, model, timeoutMs);
  }
  if (provider === "anthropic") {
    return callAnthropic(request, model, timeoutMs);
  }
  return callGoogle(request, model, timeoutMs);
}

export function toGenerationMeta(result: AiCompletionResult): AiGenerationMeta {
  return {
    provider: result.provider,
    model: result.model,
    latencyMs: result.latencyMs,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedCostUsd: result.estimatedCostUsd,
  };
}

export function listConfiguredProviders(): AiProviderId[] {
  return getRequiredProviderOrder().filter((provider) =>
    Boolean(getProviderApiKey(provider)),
  );
}

export async function runAiCompletion(
  request: AiCompletionRequest,
): Promise<{ result: AiCompletionResult; meta: AiGenerationMeta }> {
  const providers = getRequiredProviderOrder().filter(
    (provider) => Boolean(getProviderApiKey(provider)) && !isCircuitOpen(provider),
  );

  if (providers.length === 0) {
    throw new EdgeFunctionError(
      "server_error",
      503,
      "No AI providers are configured for this deployment.",
    );
  }

  const maxRetries = getMaxRetries();
  const errors: string[] = [];

  for (const provider of providers) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const result = await callProvider(provider, request);
        recordProviderSuccess(provider);
        return { result, meta: toGenerationMeta(result) };
      } catch (error) {
        recordProviderFailure(provider);
        const message =
          error instanceof Error ? error.message : "unknown_provider_error";
        errors.push(`${provider}:${message}`);
        attempt += 1;
        if (attempt > maxRetries) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  }

  throw new EdgeFunctionError(
    "server_error",
    503,
    "All configured AI providers failed.",
    { providers: errors.slice(0, 6) },
  );
}

export async function runAiJsonCompletion<T extends Record<string, unknown>>(
  request: AiCompletionRequest,
): Promise<{ data: T; meta: AiGenerationMeta }> {
  const { result, meta } = await runAiCompletion(request);
  const data = parseJsonFromModelText(result.text) as T;
  return { data, meta };
}
