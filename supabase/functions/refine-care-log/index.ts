import type {
  RefineCareLogRequest,
  RefineCareLogResponse,
} from "../../../features/ai/types/ai";

import { validateAiRequest, validateAiResponse } from "../_shared/aiSchemas";
import {
  assertAiUsageQuota,
  createEdgeContext,
  logEdgeEvent,
  readJsonWithLimit,
  safeErrorResponse,
} from "../_shared/edge";
import { jsonResponse } from "../_shared/json";

const FUNCTION_NAME = "refine-care-log";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  let context;
  try {
    context = await createEdgeContext(request, FUNCTION_NAME);
    const body = validateAiRequest<RefineCareLogRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertAiUsageQuota(context, "care_log_refinement");

    const response = validateAiResponse<RefineCareLogResponse>(FUNCTION_NAME, {
      suggestion: body.fallback,
    });
    logEdgeEvent(context, "request_success", { status: 200 });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
