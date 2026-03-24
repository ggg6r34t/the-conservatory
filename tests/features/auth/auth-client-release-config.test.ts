jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: false,
    isDevelopmentBuild: false,
    isProductionBuild: true,
    missingSupabaseConfig: [
      "EXPO_PUBLIC_SUPABASE_URL",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    ],
    supabaseUrl: null,
    supabaseAnonKey: null,
    enableSyncTrials: false,
  },
}));

jest.mock("@/config/supabase", () => ({
  supabase: null,
}));

jest.mock("@/services/auth/sessionManager", () => ({
  writeSession: jest.fn(),
  readSession: jest.fn().mockResolvedValue(null),
  clearSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/features/onboarding/services/onboardingStorage", () => ({
  syncOnboardingStatusToAccount: jest.fn().mockResolvedValue("pending"),
}));

describe("auth client release readiness", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("fails explicitly when release auth configuration is missing", async () => {
    const { login } = require("@/features/auth/api/authClient");

    await expect(login("curator@example.com", "fern-secret")).rejects.toThrow(
      /missing required Supabase environment configuration/i,
    );
  });
});
