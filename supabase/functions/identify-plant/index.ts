import type {
  IdentifyPlantRequest,
  IdentifyPlantResponse,
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

const FUNCTION_NAME = "identify-plant";

const CANDIDATES = [
  {
    keywords: ["monstera", "deliciosa"],
    species: "Monstera Deliciosa",
    confidence: 0.72,
    careProfileHint:
      "A bright indirect position usually keeps its rhythm steady.",
  },
  {
    keywords: ["pothos", "epipremnum"],
    species: "Pothos",
    confidence: 0.7,
    careProfileHint:
      "A forgiving first rhythm with moderate drying between waterings.",
  },
  {
    keywords: ["ficus", "fiddle"],
    species: "Fiddle Leaf Fig",
    confidence: 0.68,
    careProfileHint:
      "A steady window position and even watering tend to work best.",
  },
];

function identifyLocally(imageUri: string): IdentifyPlantResponse {
  const normalized = imageUri.toLowerCase();
  const match = CANDIDATES.find((candidate) =>
    candidate.keywords.some((keyword) => normalized.includes(keyword)),
  );

  return {
    suggestion: match
      ? {
          species: match.species,
          confidence: match.confidence,
          careProfileHint: match.careProfileHint,
          source: "cloud",
        }
      : null,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  let context;
  try {
    context = await createEdgeContext(request, FUNCTION_NAME);
    const body = validateAiRequest<IdentifyPlantRequest>(
      FUNCTION_NAME,
      await readJsonWithLimit(request),
    );
    await assertAiUsageQuota(context, "ai_species_identification");

    const response = validateAiResponse<IdentifyPlantResponse>(
      FUNCTION_NAME,
      identifyLocally(body.imageUri),
    );
    logEdgeEvent(context, "request_success", { status: 200 });
    return jsonResponse(response);
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
