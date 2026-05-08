import type {
  GenerateJournalSummaryRequest,
  GenerateJournalSummaryResponse,
} from "../../../features/ai/types/ai.ts";

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

const FUNCTION_NAME = "generate-journal-summary";

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
    const body = validateAiRequest<GenerateJournalSummaryRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertAiUsageQuota(context, "ai_journal_narrative", {
      isPremium: true,
    });

    const response = validateAiResponse<GenerateJournalSummaryResponse>(
      FUNCTION_NAME,
      { summary: body.fallback },
    );
    logEdgeEvent(context, "request_success", { status: 200 });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
