import type {
  GenerateStreakNudgeRequest,
  GenerateStreakNudgeResponse,
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

const FUNCTION_NAME = "generate-streak-nudge";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  let context;
  try {
    context = await createEdgeContext(request, FUNCTION_NAME);
    const body = validateAiRequest<GenerateStreakNudgeRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertAiUsageQuota(context, "streak_recovery_nudge");

    const response = validateAiResponse<GenerateStreakNudgeResponse>(
      FUNCTION_NAME,
      { nudge: body.fallback },
    );
    logEdgeEvent(context, "request_success", { status: 200 });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
