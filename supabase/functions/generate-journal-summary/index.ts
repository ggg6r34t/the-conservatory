import type {
  GenerateJournalSummaryRequest,
  GenerateJournalSummaryResponse,
} from "../../../features/ai/types/ai.ts";

import { buildJournalAiRequest } from "../_shared/aiPromptBuilders.ts";
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
    assertAiProvidersConfigured();
    const body = validateAiRequest<GenerateJournalSummaryRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertAiUsageQuota(context, "ai_journal_narrative", {
      isPremium: true,
    });

    const prompt = buildJournalAiRequest(body);
    const { data, meta } = await runAiJsonCompletion<{
      summary: { title: string; body: string };
    }>({
      feature: "ai_journal_narrative",
      system: prompt.system,
      user: prompt.user,
    });

    const response = validateAiResponse(
      FUNCTION_NAME,
      attachAiMeta({ summary: data.summary }, meta),
    );
    await recordAiObservability(context, {
      feature: "ai_journal_narrative",
      meta,
      success: true,
    });
    logEdgeEvent(context, "request_success", { status: 200, provider: meta.provider });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
