import type {
  GenerateDashboardInsightRequest,
  GenerateDashboardInsightResponse,
} from "../../../features/ai/types/ai";

import { validateAiRequest, validateAiResponse } from "../_shared/aiSchemas";
import {
  assertAiUsageQuota,
  createEdgeContext,
  logEdgeEvent,
  readJsonWithLimit,
  safeErrorResponse,
} from "../_shared/edge";
import { assertPremiumEntitlement } from "../_shared/entitlements";
import { jsonResponse } from "../_shared/json";

const FUNCTION_NAME = "generate-dashboard-insight";

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
    const body = validateAiRequest<GenerateDashboardInsightRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertAiUsageQuota(context, "ai_dashboard_editorial", {
      isPremium: true,
    });

    const response = validateAiResponse<GenerateDashboardInsightResponse>(
      FUNCTION_NAME,
      { insight: body.fallback },
    );
    logEdgeEvent(context, "request_success", { status: 200 });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
