import type {
  GenerateCareScheduleRequest,
  GenerateCareScheduleResponse,
} from "../../../features/ai/types/ai.ts";

import { buildCareScheduleAiRequest } from "../_shared/aiPromptBuilders.ts";
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
import { assertPremiumEntitlement } from "../_shared/entitlements.ts";
import { jsonResponse } from "../_shared/json.ts";

const FUNCTION_NAME = "generate-care-schedule";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  let context;
  try {
    context = await createEdgeContext(request, FUNCTION_NAME);
    const entitlementError = await assertPremiumEntitlement(request);
    if (entitlementError) {
      return entitlementError;
    }
    assertAiProvidersConfigured();
    const body = validateAiRequest<GenerateCareScheduleRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertAiUsageQuota(context, "ai_care_schedule", {
      isPremium: true,
    });

    const prompt = buildCareScheduleAiRequest(body);
    const { data, meta } = await runAiJsonCompletion<{
      suggestions: GenerateCareScheduleResponse["suggestions"];
    }>({
      feature: "ai_care_schedule",
      system: prompt.system,
      user: prompt.user,
    });

    const response = validateAiResponse<GenerateCareScheduleResponse>(
      FUNCTION_NAME,
      attachAiMeta({ suggestions: data.suggestions ?? [] }, meta),
    );
    await recordAiObservability(context, {
      feature: "ai_care_schedule",
      meta,
      success: true,
    });
    logEdgeEvent(context, "request_success", {
      status: 200,
      provider: meta.provider,
      suggestionCount: response.suggestions.length,
    });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
