import type { IdentifyPlantRequest, IdentifyPlantResponse } from "../../../features/ai/types/ai";

import { jsonResponse, readJson } from "../_shared/json";

const CANDIDATES = [
  {
    keywords: ["monstera", "deliciosa"],
    species: "Monstera Deliciosa",
    confidence: 0.72,
    careProfileHint: "A bright indirect position usually keeps its rhythm steady.",
  },
  {
    keywords: ["pothos", "epipremnum"],
    species: "Pothos",
    confidence: 0.7,
    careProfileHint: "A forgiving first rhythm with moderate drying between waterings.",
  },
  {
    keywords: ["ficus", "fiddle"],
    species: "Fiddle Leaf Fig",
    confidence: 0.68,
    careProfileHint: "A steady window position and even watering tend to work best.",
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

  const body = await readJson<IdentifyPlantRequest>(request);
  if (!body?.imageUri?.trim()) {
    return jsonResponse({ error: "imageUri is required." }, 400);
  }

  // Provider integration point:
  // add real vision inference here when credentials are configured.
  return jsonResponse(identifyLocally(body.imageUri));
});
