import type {
  GenerateDashboardInsightRequest,
  GenerateDashboardInsightResponse,
} from "../../../features/ai/types/ai";

import { jsonResponse, readJson } from "../_shared/json";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  const body = await readJson<GenerateDashboardInsightRequest>(request);
  if (!body?.fallback?.title || !body?.fallback?.body) {
    return jsonResponse({ error: "fallback insight is required." }, 400);
  }

  const response: GenerateDashboardInsightResponse = {
    // Provider integration point:
    // tone refinement can replace this fallback once configured.
    insight: body.fallback,
  };

  return jsonResponse(response);
});
