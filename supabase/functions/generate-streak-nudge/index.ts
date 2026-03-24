import type {
  GenerateStreakNudgeRequest,
  GenerateStreakNudgeResponse,
} from "../../../features/ai/types/ai";

import { jsonResponse, readJson } from "../_shared/json";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  const body = await readJson<GenerateStreakNudgeRequest>(request);
  if (!body?.summary) {
    return jsonResponse({ error: "summary is required." }, 400);
  }

  const response: GenerateStreakNudgeResponse = {
    // Provider integration point:
    // wording refinement can replace this fallback once configured.
    nudge: body.fallback,
  };

  return jsonResponse(response);
});
