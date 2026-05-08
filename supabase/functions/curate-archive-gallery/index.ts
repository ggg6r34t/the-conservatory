import type {
  CurateArchiveGalleryRequest,
  CurateArchiveGalleryResponse,
} from "../../../features/ai/types/ai.ts";

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

    const response = validateAiResponse<CurateArchiveGalleryResponse>(
      FUNCTION_NAME,
      { pairs: body.items.length > 0 ? [] : [] },
    );
    logEdgeEvent(context, "request_success", { status: 200 });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
