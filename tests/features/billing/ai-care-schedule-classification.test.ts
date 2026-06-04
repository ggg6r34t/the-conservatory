import { FEATURE_REQUIRES_PREMIUM } from "@/features/billing/constants";
import { canUseFeature } from "@/features/billing/services/entitlementService";

describe("ai_care_schedule classification", () => {
  it("requires premium at the feature gate", () => {
    expect(FEATURE_REQUIRES_PREMIUM.ai_care_schedule).toBe(true);
  });

  it("blocks free users from AI schedule suggestions", () => {
    expect(
      canUseFeature("ai_care_schedule", false, {
        totalPlantCount: 2,
        progressPhotosForPlant: {},
        aiHealthInsightsThisMonth: {},
        plantIdThisMonth: 0,
      }),
    ).toEqual({ canUse: false, reason: "requires_premium" });
  });

  it("allows premium users", () => {
    expect(
      canUseFeature("ai_care_schedule", true, {
        totalPlantCount: 2,
        progressPhotosForPlant: {},
        aiHealthInsightsThisMonth: {},
        plantIdThisMonth: 0,
      }),
    ).toEqual({ canUse: true });
  });
});
