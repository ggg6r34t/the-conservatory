import type {
  IdentifyPlantRequest,
  IdentifyPlantResponse,
} from "../../../features/ai/types/ai.ts";

import { buildIdentifyAiRequest } from "../_shared/aiPromptBuilders.ts";
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

const FUNCTION_NAME = "identify-plant";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  let context;
  try {
    context = await createEdgeContext(request, FUNCTION_NAME);
    assertAiProvidersConfigured();
    const body = validateAiRequest<
      IdentifyPlantRequest & {
        imageBase64: string;
        mimeType: string;
      }
    >(FUNCTION_NAME, await readJsonWithLimit(request, 6_000_000));
    await assertAiUsageQuota(context, "ai_species_identification");

    const prompt = buildIdentifyAiRequest({
      speciesHint: body.imageUri,
      mimeType: body.mimeType,
    });
    const { data, meta } = await runAiJsonCompletion<{
      suggestion: {
        species: string;
        confidence: number;
        careProfileHint?: string;
        confidenceExplanation?: string;
      } | null;
    }>({
      feature: "ai_species_identification",
      system: prompt.system,
      user: prompt.user,
      images: [{ mimeType: body.mimeType, base64: body.imageBase64 }],
    });

    const suggestion = data.suggestion
      ? {
          species: String(data.suggestion.species),
          confidence: Number(data.suggestion.confidence),
          careProfileHint: data.suggestion.careProfileHint
            ? String(data.suggestion.careProfileHint)
            : undefined,
          confidenceExplanation: data.suggestion.confidenceExplanation
            ? String(data.suggestion.confidenceExplanation)
            : "Model assessed visible foliage and growth form.",
        }
      : null;

    const response = validateAiResponse(
      FUNCTION_NAME,
      attachAiMeta({ suggestion }, meta),
    );
    await recordAiObservability(context, {
      feature: "ai_species_identification",
      meta,
      success: true,
    });
    logEdgeEvent(context, "request_success", {
      status: 200,
      provider: meta.provider,
      hasSuggestion: Boolean(suggestion),
    });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
