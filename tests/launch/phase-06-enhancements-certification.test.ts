import fs from "fs";
import path from "path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Phase 06 enhancements certification", () => {
  it("ships graveyard restore and care-log delete with sync outbox", () => {
    expect(read("features/plants/api/plantsClient.ts")).toContain(
      "restorePlantFromGraveyard",
    );
    expect(read("features/care-logs/api/careLogsClient.ts")).toContain(
      "deleteCareLog",
    );
    expect(read("features/plants/api/plantsClient.ts")).toContain(
      "runAtomicMutationWithSyncOutbox",
    );
  });

  it("enforces server-side premium entitlement on premium AI edge functions", () => {
    expect(read("supabase/functions/_shared/entitlements.ts")).toContain(
      "assertPremiumEntitlement",
    );
    expect(
      read("supabase/functions/generate-dashboard-insight/index.ts"),
    ).toContain("assertPremiumEntitlement");
    expect(read("supabase/functions/identify-plant/index.ts")).toContain(
      "assertAiUsageQuota",
    );
  });

  it("records AI cost and token observability in Supabase", () => {
    expect(
      read("supabase/migrations/20260602140000_edge_ai_observability.sql"),
    ).toContain("edge_ai_request_log");
    expect(
      read("supabase/migrations/20260602140000_edge_ai_observability.sql"),
    ).toContain("estimated_cost_usd");
    expect(read("supabase/functions/_shared/aiObservability.ts")).toContain(
      "record_edge_ai_request",
    );
  });

  it("tracks feature usage quotas locally and on remote schema", () => {
    expect(read("features/billing/hooks/useUsageLimits.ts")).toContain(
      "feature_usage",
    );
    expect(
      read("supabase/migrations/20260602150000_security_hardening.sql"),
    ).toContain("CREATE TABLE IF NOT EXISTS public.feature_usage");
  });

  it("wires RevenueCat purchase and restore analytics on subscription UI", () => {
    expect(read("app/subscription-plans.tsx")).toContain("purchase_started");
    expect(read("app/subscription-plans.tsx")).toContain("restore_started");
    expect(read("features/billing/hooks/useSubscription.ts")).toContain(
      "restore_failed",
    );
  });
});
