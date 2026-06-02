import fs from "fs";
import path from "path";

const AI_FUNCTIONS = [
  "generate-dashboard-insight",
  "generate-journal-summary",
  "generate-health-insight",
  "identify-plant",
  "refine-care-log",
  "generate-streak-nudge",
  "optimize-reminders",
  "curate-archive-gallery",
];

const PREMIUM_FUNCTIONS = [
  "generate-dashboard-insight",
  "generate-journal-summary",
  "optimize-reminders",
  "curate-archive-gallery",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Supabase Edge Function production hardening", () => {
  it("provides shared Edge Function infrastructure for auth, validation, logging, and quota", () => {
    const source = read("supabase/functions/_shared/edge.ts");

    expect(source).toContain("createEdgeContext");
    expect(source).toContain("readJsonWithLimit");
    expect(source).toContain("logEdgeEvent");
    expect(source).toContain("assertAiUsageQuota");
    expect(source).toContain("assertPlantOwnership");
    expect(source).toContain("safeErrorResponse");
    expect(source).toContain("redactForLog");
    expect(source).toContain("auth.getUser");
    expect(source).toContain("consume_ai_usage");
    expect(source).toContain("EDGE_AI_DAILY_LIMIT_FREE");
    expect(source).not.toContain("console.log(body");
  });

  it("implements production AI provider infrastructure with failover and observability", () => {
    const provider = read("supabase/functions/_shared/aiProvider.ts");
    const observability = read("supabase/functions/_shared/aiObservability.ts");
    const migration = read(
      "supabase/migrations/20260602140000_edge_ai_observability.sql",
    );

    expect(provider).toContain("runAiCompletion");
    expect(provider).toContain("runAiJsonCompletion");
    expect(provider).toContain("openai");
    expect(provider).toContain("anthropic");
    expect(provider).toContain("google");
    expect(provider).toContain("AI_REQUEST_TIMEOUT_MS");
    expect(provider).toContain("AI_MAX_RETRIES");
    expect(provider).toContain("circuitByProvider");
    expect(observability).toContain("record_edge_ai_request");
    expect(migration).toContain("edge_ai_request_log");
  });

  it("defines request and response validators for every AI function", () => {
    const source = read("supabase/functions/_shared/aiSchemas.ts");

    for (const functionName of AI_FUNCTIONS) {
      expect(source).toContain(`${functionName}":`);
    }

    expect(source).toContain("validateAiRequest");
    expect(source).toContain("validateAiResponse");
    expect(source).toContain("maxItems");
    expect(source).toContain("maxLength");
  });

  const MODEL_BACKED_FUNCTIONS = AI_FUNCTIONS.filter(
    (name) => name !== "optimize-reminders",
  );

  it.each(MODEL_BACKED_FUNCTIONS)(
    "authenticates, validates, rate-limits, and invokes model providers for %s",
    (functionName) => {
      const source = read(`supabase/functions/${functionName}/index.ts`);

      expect(source).toContain("../_shared/edge");
      expect(source).toContain("createEdgeContext");
      expect(source).toContain("validateAiRequest");
      expect(source).toContain("assertAiUsageQuota");
      expect(source).toContain("validateAiResponse");
      expect(source).toContain("safeErrorResponse");
      expect(source).toContain("runAiJsonCompletion");
      expect(source).toContain("attachAiMeta");
      expect(source).toContain("recordAiObservability");
      expect(source).not.toContain("body.fallback");
      expect(source.indexOf("context = await createEdgeContext")).toBeLessThan(
        source.indexOf("validateAiRequest<"),
      );
      expect(
        source.indexOf("const response = validateAiResponse"),
      ).toBeLessThan(source.lastIndexOf("jsonResponse"));
    },
  );

  it("keeps optimize-reminders as deterministic scheduling without model fallback echo", () => {
    const source = read("supabase/functions/optimize-reminders/index.ts");
    expect(source).toContain("optimizeLocally");
    expect(source).not.toContain("runAiJsonCompletion");
    expect(source).not.toContain("body.fallback");
  });

  it.each(PREMIUM_FUNCTIONS)(
    "keeps server-side premium guard for %s before quota consumption",
    (functionName) => {
      const source = read(`supabase/functions/${functionName}/index.ts`);

      expect(source).toContain("assertPremiumEntitlement");
      expect(source.indexOf("await assertPremiumEntitlement")).toBeLessThan(
        source.indexOf("await assertAiUsageQuota"),
      );
    },
  );

  it.each(["generate-health-insight", "curate-archive-gallery"])(
    "verifies plant ownership for %s",
    (functionName) => {
      const source = read(`supabase/functions/${functionName}/index.ts`);

      expect(source).toContain("assertPlantOwnership");
      expect(source.indexOf("await assertPlantOwnership")).toBeLessThan(
        source.indexOf("await assertAiUsageQuota"),
      );
    },
  );

  it("adds an atomic Supabase usage quota migration and deployment documentation", () => {
    const migration = read(
      "supabase/migrations/20260507000000_edge_ai_usage.sql",
    );
    const env = read(".env.example");

    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.edge_ai_usage",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.consume_ai_usage",
    );
    expect(migration).toContain("ON CONFLICT");
    expect(migration).toContain("GREATEST");
    expect(env).toContain("REVENUECAT_SECRET_API_KEY");
    expect(env).toContain("EDGE_AI_DAILY_LIMIT_FREE");
    expect(env).toContain("EDGE_AI_DAILY_LIMIT_PREMIUM");
    expect(env).toContain("OPENAI_API_KEY");
    expect(env).toContain("ANTHROPIC_API_KEY");
    expect(env).toContain("GOOGLE_AI_API_KEY");
    expect(env).toContain("AI_PROVIDER_ORDER");
  });

  it("teaches the client wrapper to handle typed Edge Function denials safely", () => {
    const source = read("features/ai/api/aiClient.ts");

    expect(source).toContain("EdgeFunctionErrorCode");
    expect(source).toContain("premium_required");
    expect(source).toContain("quota_exceeded");
    expect(source).toContain("rate_limit_exceeded");
    expect(source).toContain("validation_error");
    expect(source).toContain("billingContext");
    expect(source).not.toContain("message: error.message");
  });

  it("returns typed premium entitlement errors instead of legacy string errors", () => {
    const source = read("supabase/functions/_shared/entitlements.ts");

    expect(source).toContain("EdgeFunctionError");
    expect(source).toContain("premium_required");
    expect(source).toContain("auth_required");
    expect(source).toContain("safeErrorResponse");
    expect(source).not.toContain('{ error: "Premium entitlement required." }');
    expect(source).not.toContain("{ error: message }");
  });

  it("runs delete-account through shared auth, logging, and typed error handling", () => {
    const source = read("supabase/functions/delete-account/index.ts");

    expect(source).toContain("../_shared/edge");
    expect(source).toContain("createEdgeContext");
    expect(source).toContain("logEdgeEvent");
    expect(source).toContain("safeErrorResponse");
    expect(source).toContain("auth.admin.deleteUser(context.userId)");
    expect(source).not.toContain("auth.getUser(jwt)");
    expect(source).not.toContain("Missing authorization token.");
  });

  it("documents local migration verification and Edge smoke checks", () => {
    const docs = read("docs/SUPABASE_EDGE_FUNCTIONS.md");

    expect(docs).toContain("supabase migration up");
    expect(docs).toContain("supabase functions serve");
    expect(docs).toContain("Authorization: Bearer");
    expect(docs).toContain("quota_exceeded");
    expect(docs).toContain("premium_required");
  });
});
