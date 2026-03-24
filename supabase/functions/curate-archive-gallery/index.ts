import type {
  CurateArchiveGalleryRequest,
  CurateArchiveGalleryResponse,
} from "../../../features/ai/types/ai";

import { jsonResponse, readJson } from "../_shared/json";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  const body = await readJson<CurateArchiveGalleryRequest>(request);
  if (!body?.items?.length) {
    return jsonResponse({ error: "items are required." }, 400);
  }

  const response: CurateArchiveGalleryResponse = {
    // Provider integration point:
    // pair ranking can be refined later when a media provider is configured.
    pairs: [],
  };

  return jsonResponse(response);
});
