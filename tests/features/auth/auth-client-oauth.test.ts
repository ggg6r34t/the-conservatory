/**
 * @jest-environment node
 */

jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: true,
    isProductionBuild: false,
    isDevelopmentBuild: true,
  },
}));

jest.mock("@/config/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: jest.fn().mockResolvedValue({
    runAsync: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/features/onboarding/services/onboardingStorage", () => ({
  syncOnboardingStatusToAccount: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/auth/sessionManager", () => ({
  writeSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: jest.fn().mockResolvedValue({ userId: "user-1" }),
}));

jest.mock("@/services/analytics/analyticsService", () => ({
  trackGtmEvent: jest.fn(),
  trackEvent: jest.fn(),
}));

import { ensureUserProfile } from "@/features/auth/api/authClient";
import { resetOAuthProfileCoordinatorForTests } from "@/features/auth/services/oauthProfileCoordinator";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import { trackEvent } from "@/services/analytics/analyticsService";
import { supabase } from "@/config/supabase";

describe("authClient OAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetOAuthProfileCoordinatorForTests();
  });

  it("hydrates profile, initializes preferences, and tracks signup screen analytics", async () => {
    const mockFrom = jest.fn(() => ({
      upsert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              display_name: "Elowen",
              avatar_url: null,
              role: "user",
            },
            error: null,
          }),
          single: jest.fn().mockResolvedValue({
            data: {
              display_name: "Elowen",
              avatar_url: null,
              role: "user",
            },
            error: null,
          }),
        }),
      }),
    }));

    (supabase as unknown as { from: jest.Mock }).from = mockFrom;

    (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "elowen@example.com",
            created_at: "2026-01-01T00:00:00.000Z",
            user_metadata: { full_name: "Elowen Thorne" },
            app_metadata: { provider: "google" },
            identities: [{ provider: "google" }],
          },
        },
      },
      error: null,
    });

    const user = await ensureUserProfile("google", "signup");

    expect(user.displayName).toBe("Elowen");
    expect(getUserPreferences).toHaveBeenCalledWith("user-1");
    expect(trackEvent).toHaveBeenCalledWith(
      "oauth_sign_in_succeeded",
      expect.objectContaining({ provider: "google", screen: "signup" }),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      "oauth_profile_ensured",
      expect.objectContaining({ provider: "google", screen: "signup" }),
    );
  });
});
