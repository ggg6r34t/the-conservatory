import type {
  GenerateHealthInsightRequest,
  GenerateHealthInsightResponse,
} from "../../../features/ai/types/ai.ts";

import { buildHealthInsightAiRequest } from "../_shared/aiPromptBuilders.ts";
import { runAiJsonCompletion } from "../_shared/aiProvider.ts";
import { recordAiObservability, assertAiProvidersConfigured } from "../_shared/aiObservability.ts";
import { attachAiMeta } from "../_shared/aiResponses.ts";
import { validateAiRequest, validateAiResponse } from "../_shared/aiSchemas.ts";
import {
  assertAiUsageQuota,
  assertPlantOwnership,
  createEdgeContext,
  logEdgeEvent,
  readJsonWithLimit,
  safeErrorResponse,
} from "../_shared/edge.ts";
import { jsonResponse } from "../_shared/json.ts";

const FUNCTION_NAME = "generate-health-insight";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  let context;
  try {
    context = await createEdgeContext(request, FUNCTION_NAME);
    assertAiProvidersConfigured();
    const body = validateAiRequest<GenerateHealthInsightRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertPlantOwnership(context, [body.plantId]);
    await assertAiUsageQuota(context, "ai_health_insight", {
      entityId: body.plantId,
    });

    const prompt = buildHealthInsightAiRequest(body);
    const { data, meta } = await runAiJsonCompletion<{
      title: string;
      body: string;
      confidence: number;
      classification?: string;
    }>({
      feature: "ai_health_insight",
      system: prompt.system,
      user: prompt.user,
    });

    const response = validateAiResponse<
      GenerateHealthInsightResponse & {
        meta: typeof meta;
      }
    >(
      FUNCTION_NAME,
      attachAiMeta(
        {
          insight: {
            title: String(data.title),
            body: String(data.body),
            confidence: Number(data.confidence),
            classification:
              data.classification === "growth" ||
              data.classification === "dryness" ||
              data.classification === "stable"
                ? data.classification
                : undefined,
          },
        },
        meta,
      ),
    );

    await recordAiObservability(context, {
      feature: "ai_health_insight",
      meta,
      success: true,
    });
    logEdgeEvent(context, "request_success", {
      status: 200,
      provider: meta.provider,
      model: meta.model,
    });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
