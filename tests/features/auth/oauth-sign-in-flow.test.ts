/**
 * @jest-environment node
 */

jest.mock("@/config/env", () => ({
  env: { isSupabaseConfigured: true },
}));

jest.mock("@/config/supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
    },
  },
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("@/features/auth/services/googleSignIn", () => ({
  isGoogleNativeSignInAvailable: jest.fn(() => false),
  signInWithGoogleNative: jest.fn(),
}));

jest.mock("@/features/auth/constants/authRedirects", () => ({
  getOAuthRedirectUri: jest.fn(() => "theconservatory://auth/callback"),
}));

jest.mock("@/features/auth/services/oauthCallbackCoordinator", () => ({
  exchangeOAuthCallbackUrl: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/services/analytics/analyticsService", () => ({
  trackEvent: jest.fn(),
}));

import * as WebBrowser from "expo-web-browser";

import { startOAuthSignIn } from "@/features/auth/services/oauthSignIn";
import { trackEvent } from "@/services/analytics/analyticsService";
import { supabase } from "@/config/supabase";

describe("oauthSignIn flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts apple oauth in browser and tracks signup screen", async () => {
    (supabase!.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: { url: "https://provider.example/oauth" },
      error: null,
    });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: "success",
      url: "theconservatory://auth/callback?code=abc",
    });

    await startOAuthSignIn("apple", "signup");

    expect(supabase!.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "apple",
      options: expect.objectContaining({
        skipBrowserRedirect: true,
      }),
    });
    expect(trackEvent).toHaveBeenCalledWith(
      "oauth_sign_in_started",
      expect.objectContaining({ provider: "apple", screen: "signup" }),
    );
  });

  it("tracks cancellation without throwing raw provider errors", async () => {
    (supabase!.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: { url: "https://provider.example/oauth" },
      error: null,
    });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: "cancel",
    });

    await expect(startOAuthSignIn("google", "login")).rejects.toMatchObject({
      code: "oauth_cancelled",
    });
    expect(trackEvent).toHaveBeenCalledWith(
      "oauth_sign_in_cancelled",
      expect.objectContaining({ provider: "google", screen: "login" }),
    );
  });
});
