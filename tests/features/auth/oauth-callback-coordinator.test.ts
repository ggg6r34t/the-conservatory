/**
 * @jest-environment node
 */

jest.mock("@/config/supabase", () => ({
  supabase: {
    auth: {
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

jest.mock("@/services/analytics/analyticsService", () => ({
  trackEvent: jest.fn(),
}));

import {
  exchangeOAuthCallbackUrl,
  hasCompletedOAuthCallback,
  resetOAuthCallbackCoordinatorForTests,
} from "@/features/auth/services/oauthCallbackCoordinator";
import { trackEvent } from "@/services/analytics/analyticsService";
import { supabase } from "@/config/supabase";

const mockAuth = supabase!.auth as unknown as {
  setSession: jest.Mock;
  exchangeCodeForSession: jest.Mock;
};

describe("oauthCallbackCoordinator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetOAuthCallbackCoordinatorForTests();
    mockAuth.exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("deduplicates concurrent exchanges for the same callback url", async () => {
    const url = "theconservatory://auth/callback?code=abc";

    const [first, second] = await Promise.all([
      exchangeOAuthCallbackUrl(url),
      exchangeOAuthCallbackUrl(url),
    ]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(hasCompletedOAuthCallback(url)).toBe(true);
    expect(trackEvent).toHaveBeenCalledWith(
      "oauth_callback_received",
      expect.objectContaining({ screen: "callback" }),
    );
  });

  it("skips re-exchange when callback url already completed", async () => {
    const url = "theconservatory://auth/callback?code=abc";
    await exchangeOAuthCallbackUrl(url);

    await exchangeOAuthCallbackUrl(url);

    expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it("returns false for non-oauth urls", async () => {
    await expect(
      exchangeOAuthCallbackUrl("theconservatory://auth/reset-password?code=abc"),
    ).resolves.toBe(false);
    expect(mockAuth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
