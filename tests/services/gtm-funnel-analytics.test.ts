import fs from "fs";
import path from "path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("GTM funnel analytics wiring", () => {
  it("exposes lifecycle events on the analytics service", () => {
    expect(read("services/analytics/analyticsService.ts")).toContain(
      "trackGtmEvent",
    );
    expect(read("services/analytics/analyticsService.ts")).toContain(
      "user_signed_up",
    );
    expect(read("services/analytics/analyticsService.ts")).toContain(
      "activation_first_plant_created",
    );
    expect(read("services/analytics/analyticsService.ts")).toContain(
      "subscription_downgraded",
    );
    expect(read("services/analytics/analyticsService.ts")).toContain(
      "backup_screen_viewed",
    );
  });

  it("tracks auth activation and first plant creation", () => {
    expect(read("features/auth/api/authClient.ts")).toContain(
      'trackGtmEvent("user_signed_up"',
    );
    expect(read("features/auth/api/authClient.ts")).toContain(
      'trackGtmEvent("user_logged_in"',
    );
    expect(read("features/plants/api/plantsClient.ts")).toContain(
      'trackGtmEvent("activation_first_plant_created")',
    );
    expect(read("features/onboarding/hooks/useOnboarding.ts")).toContain(
      'trackEvent("onboarding_completed"',
    );
  });

  it("tracks subscription lifecycle and session start", () => {
    expect(read("providers/BillingBootstrapProvider.tsx")).toContain(
      "subscription_activated",
    );
    expect(read("providers/BillingBootstrapProvider.tsx")).toContain(
      "app_session_started",
    );
  });

  it("tracks backup and import adoption funnels", () => {
    expect(read("app/data-backup.tsx")).toContain("backup_screen_viewed");
    expect(read("app/data-backup.tsx")).toContain("backup_sync_completed");
    expect(read("app/import-collection-data.tsx")).toContain(
      "import_collection_started",
    );
    expect(read("app/import-collection-data.tsx")).toContain(
      "import_collection_completed",
    );
  });
});
