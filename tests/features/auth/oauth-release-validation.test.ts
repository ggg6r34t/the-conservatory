/**
 * @jest-environment node
 */

jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: true,
    isProductionBuild: true,
    googleWebClientId: null,
  },
}));

jest.mock("@/services/supabase/backendReadiness", () => ({
  getBackendConfigurationSummary: jest.fn(() => ({
    requiresReleaseConfig: false,
    isSupabaseConfigured: true,
  })),
}));

jest.mock("@/features/billing/config", () => ({
  validateBillingConfig: jest.fn(() => ({ valid: true, missing: [] })),
}));

import { collectReleaseValidationIssues } from "@/services/startup/releaseValidation";

describe("releaseValidation OAuth", () => {
  it("requires google web client id for production supabase builds", () => {
    const issues = collectReleaseValidationIssues();
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "google_oauth_missing" }),
      ]),
    );
  });
});
