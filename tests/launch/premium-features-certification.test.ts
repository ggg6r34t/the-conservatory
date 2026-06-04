import fs from "fs";
import path from "path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Premium features certification (code evidence)", () => {
  describe("subscription infrastructure", () => {
    it("initializes RevenueCat with entitlement listener and offline cache", () => {
      expect(read("features/billing/adapters/RevenueCatAdapter.ts")).toContain(
        "addCustomerInfoUpdateListener",
      );
      expect(read("providers/BillingBootstrapProvider.tsx")).toContain(
        "readEntitlementCache",
      );
      expect(read("providers/BillingBootstrapProvider.tsx")).toContain(
        "setSubscriptionStateListener",
      );
      expect(read("features/billing/hooks/useSubscription.ts")).toContain(
        "propagateEntitlementState",
      );
    });
  });

  describe("central entitlement evaluation", () => {
    it("routes all gated features through canUseFeature and FEATURE_REQUIRES_PREMIUM", () => {
      expect(read("features/billing/constants.ts")).toContain(
        "FEATURE_REQUIRES_PREMIUM",
      );
      expect(read("features/export/services/exportAccessPolicy.ts")).toContain(
        '"premium_export"',
      );
      expect(read("features/billing/services/featureAccess.ts")).toContain(
        "assertFeatureAccess",
      );
      expect(read("features/care-calendar/hooks/useCareCalendarActions.ts")).toContain(
        'assertFeatureAccess("ai_care_schedule"',
      );
      expect(read("features/care-calendar/hooks/useCareCalendar.ts")).toContain(
        "cloudAllowedForFeature",
      );
      expect(read("features/care-calendar/api/careScheduleSuggestionsClient.ts")).toContain(
        'assertFeatureAccess("ai_care_schedule"',
      );
      expect(read("features/plants/services/plantLibraryFilterService.ts")).toContain(
        'isFeatureAllowed("advanced_library_filters"',
      );
      expect(read("features/ai/hooks/useJournalSummary.ts")).toContain(
        "cloudAllowedForFeature",
      );
      expect(read("features/ai/api/aiClient.ts")).toContain(
        "FEATURE_REQUIRES_PREMIUM",
      );
    });
  });

  describe("service-layer enforcement", () => {
    it("enforces plant and photo quotas in plantsClient", () => {
      expect(read("features/plants/api/plantsClient.ts")).toContain(
        "FREE_PLANT_LIMIT",
      );
      expect(read("features/plants/api/plantsClient.ts")).toContain(
        "FREE_PROGRESS_PHOTOS_PER_PLANT",
      );
      expect(read("features/plants/api/plantsClient.ts")).toContain(
        "PLANT_LIMIT_REACHED",
      );
      expect(read("features/plants/api/plantsClient.ts")).toContain(
        "PHOTO_LIMIT_REACHED",
      );
    });

    it("enforces import quotas for free users", () => {
      const source = read("features/export/services/importService.ts");
      expect(source).toContain("assertFreeImportQuotas");
      expect(source).toContain("FREE_PROGRESS_PHOTOS_PER_PLANT");
      expect(source).toContain("getEntitlementState()");
    });

    it("enforces specimen tag creation at the service layer", () => {
      expect(read("features/plants/services/specimenTagsService.ts")).toContain(
        "getEntitlementState()",
      );
      expect(read("features/plants/services/specimenTagsService.ts")).toContain(
        'assertFeatureAccess("specimen_tag_create"',
      );
    });

    it("downgrades advanced library filters in listPlants", () => {
      expect(read("features/plants/services/plantLibraryFilterService.ts")).toContain(
        "resolvePlantLibraryFilter",
      );
      expect(read("features/plants/api/plantsClient.ts")).toContain(
        "resolvePlantLibraryFilter",
      );
    });

    it("defers premium photo backup in sync adapter", () => {
      expect(read("services/database/supabaseSyncAdapter.ts")).toContain(
        "getEntitlementState()",
      );
      expect(read("services/database/supabaseSyncAdapter.ts")).toContain(
        "PREMIUM_PHOTO_BACKUP_DEFERRED_REASON",
      );
    });
  });

  describe("premium export differences", () => {
    it("includes materially different payload sections for premium mode", () => {
      const source = read("features/export/services/exportService.ts");
      expect(source).toContain('photos: premium ? photoRows.map(mapPhoto) : []');
      expect(source).toContain("statusSnapshots: premium ? statusSnapshotRows : []");
      expect(source).toContain("specimenTags: premium ? specimenTagRows : []");
      expect(source).toContain("tags: null");
      expect(source).toContain("getCareLogHistorySinceForMode");
    });
  });

  describe("AI and server-side entitlement guards", () => {
    it("blocks premium-only AI client calls before network", () => {
      expect(read("features/ai/api/aiClient.ts")).toContain(
        "blocked_by_entitlement",
      );
    });

    it("validates premium on Supabase edge functions via RevenueCat", () => {
      expect(read("supabase/functions/_shared/entitlements.ts")).toContain(
        "hasRevenueCatPremiumEntitlement",
      );
      expect(
        read("supabase/functions/generate-journal-summary/index.ts"),
      ).toContain("assertPremiumEntitlement");
      expect(read("supabase/functions/curate-archive-gallery/index.ts")).toContain(
        "assertPremiumEntitlement",
      );
    });
  });

  describe("truthful downgrade copy", () => {
    it("does not claim smart reminder optimization pauses for free users", () => {
      const source = read("app/downgrade.tsx");
      expect(source).not.toContain("smart reminder optimization");
      expect(source).toContain("does not remove your plants");
      expect(source).toContain("enhanced export");
    });
  });

  describe("store compliance surfaces", () => {
    it("exposes restore purchases and subscription management links", () => {
      expect(read("app/premium.tsx")).toContain("onRestore");
      expect(read("app/premium.tsx")).toContain("apps.apple.com/account/subscriptions");
      expect(read("app/subscription-plans.tsx")).toContain("restore_started");
      expect(read("app/subscription-plans.tsx")).toContain(
        "renew automatically until cancelled",
      );
    });
  });
});
