import {
  collectReleaseValidationIssues,
  isReleaseConfigurationValid,
} from "@/services/startup/releaseValidation";

jest.mock("@/services/supabase/backendReadiness", () => ({
  getBackendConfigurationSummary: jest.fn(() => ({
    requiresReleaseConfig: false,
    description: "",
  })),
}));

jest.mock("@/features/billing/config", () => ({
  validateBillingConfig: jest.fn(() => ({ valid: true, missing: [] })),
}));

describe("releaseValidation", () => {
  it("passes when backend and billing are configured", () => {
    expect(isReleaseConfigurationValid()).toBe(true);
    expect(collectReleaseValidationIssues()).toEqual([]);
  });

  it("reports missing release configuration issues", () => {
    const { getBackendConfigurationSummary } = jest.requireMock(
      "@/services/supabase/backendReadiness",
    );
    const { validateBillingConfig } = jest.requireMock(
      "@/features/billing/config",
    );

    getBackendConfigurationSummary.mockReturnValueOnce({
      requiresReleaseConfig: true,
      description: "Supabase URL is missing.",
    });
    validateBillingConfig.mockReturnValueOnce({
      valid: false,
      missing: ["REVENUECAT_IOS_KEY"],
    });

    const issues = collectReleaseValidationIssues();
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "supabase_missing" }),
        expect.objectContaining({ code: "billing_missing" }),
      ]),
    );
    expect(issues.length).toBeGreaterThan(0);
  });
});
