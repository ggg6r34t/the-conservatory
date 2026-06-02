import type {
  RefineCareLogRequest,
  RefineCareLogResponse,
} from "../../../features/ai/types/ai.ts";

import { buildCareLogAiRequest } from "../_shared/aiPromptBuilders.ts";
import { runAiJsonCompletion } from "../_shared/aiProvider.ts";
import { recordAiObservability, assertAiProvidersConfigured } from "../_shared/aiObservability.ts";
import { attachAiMeta } from "../_shared/aiResponses.ts";
import { validateAiRequest, validateAiResponse } from "../_shared/aiSchemas.ts";
import {
  assertAiUsageQuota,
  createEdgeContext,
  logEdgeEvent,
  readJsonWithLimit,
  safeErrorResponse,
} from "../_shared/edge.ts";
import { jsonResponse } from "../_shared/json.ts";

const FUNCTION_NAME = "refine-care-log";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  let context;
  try {
    context = await createEdgeContext(request, FUNCTION_NAME);
    assertAiProvidersConfigured();
    const body = validateAiRequest<RefineCareLogRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertAiUsageQuota(context, "care_log_refinement");

    const prompt = buildCareLogAiRequest(body);
    const { data, meta } = await runAiJsonCompletion<{
      suggestion: {
        refinedNote: string | null;
        suggestedTags: string[];
      };
    }>({
      feature: "care_log_refinement",
      system: prompt.system,
      user: prompt.user,
    });

    const response = validateAiResponse(
      FUNCTION_NAME,
      attachAiMeta({ suggestion: data.suggestion }, meta),
    );
    await recordAiObservability(context, {
      feature: "care_log_refinement",
      meta,
      success: true,
    });
    logEdgeEvent(context, "request_success", { status: 200, provider: meta.provider });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
