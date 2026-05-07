import type {
  GenerateHealthInsightRequest,
  GenerateHealthInsightResponse,
} from "../../../features/ai/types/ai";

import { buildHealthInsightPrompt } from "../../../features/ai/prompts/healthInsightPrompt";
import { validateAiRequest, validateAiResponse } from "../_shared/aiSchemas";
import {
  assertAiUsageQuota,
  assertPlantOwnership,
  createEdgeContext,
  logEdgeEvent,
  readJsonWithLimit,
  safeErrorResponse,
} from "../_shared/edge";
import { jsonResponse } from "../_shared/json";

const FUNCTION_NAME = "generate-health-insight";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  let context;
  try {
    context = await createEdgeContext(request, FUNCTION_NAME);
    const body = validateAiRequest<GenerateHealthInsightRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertPlantOwnership(context, [body.plantId]);
    await assertAiUsageQuota(context, "ai_health_insight", {
      entityId: body.plantId,
    });

    void buildHealthInsightPrompt({
      ...body,
      photoUris: body.photoUris.slice(0, 6),
      recentLogNotes: body.recentLogNotes.slice(0, 8),
    });

    const response = validateAiResponse<GenerateHealthInsightResponse>(
      FUNCTION_NAME,
      { insight: body.fallback },
    );
    logEdgeEvent(context, "request_success", { status: 200 });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
