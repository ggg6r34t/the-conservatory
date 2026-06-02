import type { EdgeContext } from "./edge.ts";
import { logEdgeEvent } from "./edge.ts";
import type { AiGenerationMeta, AiProviderId } from "./aiProvider.ts";

export async function recordAiObservability(
  context: EdgeContext,
  input: {
    feature: string;
    meta: AiGenerationMeta;
    success: boolean;
    errorCode?: string | null;
  },
) {
  logEdgeEvent(context, "ai_request_completed", {
    feature: input.feature,
    provider: input.meta.provider,
    model: input.meta.model,
    inputTokens: input.meta.inputTokens,
    outputTokens: input.meta.outputTokens,
    estimatedCostUsd: input.meta.estimatedCostUsd,
    latencyMs: input.meta.latencyMs,
    success: input.success,
    errorCode: input.errorCode ?? null,
  });

  const { error } = await context.supabaseAdmin.rpc("record_edge_ai_request", {
    p_user_id: context.userId,
    p_feature: input.feature,
    p_provider: input.meta.provider,
    p_model: input.meta.model,
    p_input_tokens: input.meta.inputTokens,
    p_output_tokens: input.meta.outputTokens,
    p_estimated_cost_usd: input.meta.estimatedCostUsd,
    p_latency_ms: input.meta.latencyMs,
    p_success: input.success,
    p_error_code: input.errorCode ?? null,
  });

  if (error) {
    logEdgeEvent(context, "ai_observability_persist_failed", {
      feature: input.feature,
      reason: error.message,
    });
  }
}

// @ts-ignore - Deno global available at runtime
const _Deno = Deno as typeof Deno & {
  env: { get(key: string): string | undefined };
};

export function assertAiProvidersConfigured() {
  const configured = (["openai", "anthropic", "google"] as AiProviderId[]).some(
    (provider) => {
      if (provider === "openai") {
        return Boolean(_Deno.env.get("OPENAI_API_KEY"));
      }
      if (provider === "anthropic") {
        return Boolean(_Deno.env.get("ANTHROPIC_API_KEY"));
      }
      return Boolean(
        _Deno.env.get("GOOGLE_AI_API_KEY") ?? _Deno.env.get("GEMINI_API_KEY"),
      );
    },
  );

  if (!configured) {
    throw new Error("No AI provider API keys are configured.");
  }
}
