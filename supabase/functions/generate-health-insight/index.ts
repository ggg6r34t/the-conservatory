import type {
  GenerateHealthInsightRequest,
  GenerateHealthInsightResponse,
} from "../../../features/ai/types/ai";

import { buildHealthInsightPrompt } from "../../../features/ai/prompts/healthInsightPrompt";
import { jsonResponse, readJson } from "../_shared/json";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  const body = await readJson<GenerateHealthInsightRequest>(request);
  if (!body?.plantId || !body?.speciesName || !body?.localAnalysis) {
    return jsonResponse({ error: "plantId, speciesName, and localAnalysis are required." }, 400);
  }

  void buildHealthInsightPrompt(body);

  const response: GenerateHealthInsightResponse = {
    // Provider integration point:
    // optional tone or vision refinement can replace this fallback when configured.
    // Any provider output must still be revalidated and safety-clamped by the client.
    insight: body.fallback,
  };

  return jsonResponse(response);
});
