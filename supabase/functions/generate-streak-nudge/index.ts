import type {
  GenerateStreakNudgeRequest,
  GenerateStreakNudgeResponse,
} from "../../../features/ai/types/ai.ts";

import { buildStreakAiRequest } from "../_shared/aiPromptBuilders.ts";
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

const FUNCTION_NAME = "generate-streak-nudge";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  let context;
  try {
    context = await createEdgeContext(request, FUNCTION_NAME);
    assertAiProvidersConfigured();
    const body = validateAiRequest<GenerateStreakNudgeRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertAiUsageQuota(context, "streak_recovery_nudge");

    const prompt = buildStreakAiRequest(body);
    const { data, meta } = await runAiJsonCompletion<{
      nudge: { body: string } | null;
    }>({
      feature: "streak_recovery_nudge",
      system: prompt.system,
      user: prompt.user,
    });

    const response = validateAiResponse(
      FUNCTION_NAME,
      attachAiMeta({ nudge: data.nudge }, meta),
    );
    await recordAiObservability(context, {
      feature: "streak_recovery_nudge",
      meta,
      success: true,
    });
    logEdgeEvent(context, "request_success", { status: 200, provider: meta.provider });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
