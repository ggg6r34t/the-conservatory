import type {
  RefineCareLogRequest,
  RefineCareLogResponse,
} from "../../../features/ai/types/ai";

import { jsonResponse, readJson } from "../_shared/json";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  const body = await readJson<RefineCareLogRequest>(request);
  if (!body?.note?.trim()) {
    return jsonResponse({ error: "note is required." }, 400);
  }

  const response: RefineCareLogResponse = {
    // Provider integration point:
    // keep the original meaning and suggested tags, but allow tone refinement later.
    suggestion: body.fallback,
  };

  return jsonResponse(response);
});
