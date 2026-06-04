import {
  assertFeatureAccess,
  cloudAllowedForFeature,
  isFeatureAllowed,
} from "@/features/billing/services/featureAccess";

describe("featureAccess", () => {
  it("cloudAllowedForFeature mirrors premium-only flags", () => {
    expect(cloudAllowedForFeature("ai_care_schedule", false)).toBe(false);
    expect(cloudAllowedForFeature("ai_care_schedule", true)).toBe(true);
    expect(cloudAllowedForFeature("smart_reminder_optimization", false)).toBe(
      true,
    );
  });

  it("assertFeatureAccess throws for premium-only features", () => {
    expect(() =>
      assertFeatureAccess("ai_care_schedule", false),
    ).toThrow(/AI care schedule/i);
    expect(() =>
      assertFeatureAccess("premium_export", false),
    ).toThrow(/enhanced collection export/i);
  });

  it("isFeatureAllowed respects free quotas", () => {
    expect(
      isFeatureAllowed("plant_create", false, {
        totalPlantCount: 10,
        progressPhotosForPlant: {},
        aiHealthInsightsThisMonth: {},
        plantIdThisMonth: 0,
      }),
    ).toBe(false);
    expect(
      isFeatureAllowed("plant_create", false, {
        totalPlantCount: 3,
        progressPhotosForPlant: {},
        aiHealthInsightsThisMonth: {},
        plantIdThisMonth: 0,
      }),
    ).toBe(true);
  });
});
