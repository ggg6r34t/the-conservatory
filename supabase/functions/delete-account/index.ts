import { jsonResponse, readJson } from "../_shared/json";

interface DeleteAccountRequest {
  userId: string;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  const body = await readJson<DeleteAccountRequest>(request);
  if (!body?.userId) {
    return jsonResponse({ error: "userId is required." }, 400);
  }

  // Provider integration point:
  // actual account deletion will be wired to a real backend in a future phase.
  return jsonResponse({ success: true });
});
