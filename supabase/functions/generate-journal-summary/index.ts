import type {
  GenerateJournalSummaryRequest,
  GenerateJournalSummaryResponse,
} from "../../../features/ai/types/ai";

import { jsonResponse, readJson } from "../_shared/json";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  const body = await readJson<GenerateJournalSummaryRequest>(request);
  if (!body?.monthKey || !body?.fallback?.title || !body?.fallback?.body) {
    return jsonResponse({ error: "monthKey and fallback summary are required." }, 400);
  }

  const response: GenerateJournalSummaryResponse = {
    // Provider integration point:
    // summary refinement can replace this fallback once configured.
    summary: body.fallback,
  };

  return jsonResponse(response);
});
