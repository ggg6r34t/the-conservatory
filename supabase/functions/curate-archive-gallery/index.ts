import type {
  CurateArchiveGalleryRequest,
  CurateArchiveGalleryResponse,
} from "../../../features/ai/types/ai.ts";

import { buildArchiveAiRequest } from "../_shared/aiPromptBuilders.ts";
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
import { assertPremiumEntitlement } from "../_shared/entitlements.ts";
import { jsonResponse } from "../_shared/json.ts";

const FUNCTION_NAME = "curate-archive-gallery";

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
    const body = validateAiRequest<CurateArchiveGalleryRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertPlantOwnership(
      context,
      body.items.map((item) => item.plantId),
    );
    await assertAiUsageQuota(context, "ai_archive_curation", {
      isPremium: true,
    });

    const prompt = buildArchiveAiRequest(body);
    const { data, meta } = await runAiJsonCompletion<{
      pairs: Array<{
        plantId: string;
        plantName: string;
        beforePhotoId?: string;
        afterPhotoId?: string;
        beforeUri: string;
        afterUri: string;
        caption: string;
      }>;
    }>({
      feature: "ai_archive_curation",
      system: prompt.system,
      user: prompt.user,
    });

    const pairs = Array.isArray(data.pairs) ? data.pairs.slice(0, 3) : [];
    const response = validateAiResponse(
      FUNCTION_NAME,
      attachAiMeta({ pairs }, meta),
    );
    await recordAiObservability(context, {
      feature: "ai_archive_curation",
      meta,
      success: true,
    });
    logEdgeEvent(context, "request_success", {
      status: 200,
      pairCount: pairs.length,
      provider: meta.provider,
    });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
