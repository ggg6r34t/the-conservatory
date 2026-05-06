// @ts-ignore — Deno runtime import, not resolved by tsc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse } from "../_shared/json";

// @ts-ignore — Deno global available at runtime
const _Deno = Deno as typeof Deno & { env: { get(key: string): string | undefined } };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  // Extract JWT from Authorization header
  const authHeader = request.headers.get("Authorization");
  const jwt = authHeader?.replace("Bearer ", "").trim();
  if (!jwt) {
    return jsonResponse({ error: "Missing authorization token." }, 401);
  }

  // Create admin client using service role key
  const supabaseAdmin = createClient(
    _Deno.env.get("SUPABASE_URL") ?? "",
    _Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Verify caller identity from JWT
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  // Delete the user from Supabase Auth (cascades to storage, RLS-protected tables)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500);
  }

  // Provider integration point: future phases may delete additional cloud data here
  return jsonResponse({ success: true });
});
