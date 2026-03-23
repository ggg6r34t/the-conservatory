jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockMaybeSingle = jest.fn();
const mockEqSelect = jest.fn(() => ({
  maybeSingle: mockMaybeSingle,
}));
const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn(() => ({
  eq: mockUpdateEq,
}));

jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: true,
  },
}));

jest.mock("@/config/supabase", () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table !== "users") {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select: jest.fn(() => ({
          eq: mockEqSelect,
        })),
        update: mockUpdate,
      };
    }),
  },
}));

import {
  completeOnboarding,
  getOnboardingStatus,
  resetOnboardingStatus,
  setOnboardingStatus,
  syncOnboardingStatusToAccount,
} from "@/features/onboarding/services/onboardingStorage";

describe("onboardingStorage", () => {
  beforeEach(async () => {
    const storage = require("@react-native-async-storage/async-storage");
    await storage.clear();
    jest.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({
      data: { onboarding_completed_at: null },
      error: null,
    });
  });

  it("defaults to pending when nothing is stored", async () => {
    await expect(getOnboardingStatus()).resolves.toBe("pending");
  });

  it("persists a completed onboarding status", async () => {
    await setOnboardingStatus("completed");

    await expect(getOnboardingStatus()).resolves.toBe("completed");
  });

  it("provides a dedicated complete helper", async () => {
    await completeOnboarding();

    await expect(getOnboardingStatus()).resolves.toBe("completed");
  });

  it("resets onboarding status back to pending", async () => {
    await completeOnboarding();
    await resetOnboardingStatus();

    await expect(getOnboardingStatus()).resolves.toBe("pending");
  });

  it("resets account-aware onboarding back to pending for signed-in users", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { onboarding_completed_at: "2026-03-23T00:00:00.000Z" },
      error: null,
    });

    await expect(getOnboardingStatus("user-123")).resolves.toBe("completed");

    mockMaybeSingle.mockResolvedValue({
      data: { onboarding_completed_at: null },
      error: null,
    });

    await resetOnboardingStatus({ userId: "user-123", scope: "both" });

    await expect(getOnboardingStatus("user-123")).resolves.toBe("pending");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("promotes completed device onboarding into an authenticated account record", async () => {
    await completeOnboarding();

    await expect(syncOnboardingStatusToAccount("user-123")).resolves.toBe(
      "completed",
    );
    await expect(getOnboardingStatus("user-123")).resolves.toBe("completed");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("keeps account-aware onboarding pending until either device or account is completed", async () => {
    await expect(getOnboardingStatus("user-456")).resolves.toBe("pending");

    await setOnboardingStatus("completed", {
      userId: "user-456",
      scope: "account",
    });

    await expect(getOnboardingStatus("user-456")).resolves.toBe("completed");
  });

  it("prefers remote onboarding truth across devices when the account is already completed", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { onboarding_completed_at: "2026-03-23T00:00:00.000Z" },
      error: null,
    });

    await expect(getOnboardingStatus("user-789")).resolves.toBe("completed");
    await expect(getOnboardingStatus()).resolves.toBe("completed");
  });
});
