/**
 * @jest-environment node
 */

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  TurboModuleRegistry: {
    get: jest.fn(() => ({})),
  },
}));

jest.mock("@/config/env", () => ({
  env: {
    googleWebClientId: "google-web-client-id",
    isSupabaseConfigured: true,
  },
}));

jest.mock("@/config/supabase", () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
    },
  },
}));

jest.mock("@/features/auth/services/oauthErrors", () => ({
  createOAuthError: (code: string, message: string) => {
    const error = new Error(message) as Error & { code: string };
    error.code = code;
    return error;
  },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({
      data: { idToken: "google-id-token" },
    }),
  },
}));

import { signInWithGoogleNative } from "@/features/auth/services/googleSignIn";
import { supabase } from "@/config/supabase";

describe("googleSignIn", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exchanges a native google id token with supabase", async () => {
    const mockAuth = supabase!.auth as unknown as {
      signInWithIdToken: jest.Mock;
    };
    mockAuth.signInWithIdToken.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    await signInWithGoogleNative();

    expect(mockAuth.signInWithIdToken).toHaveBeenCalledWith({
      provider: "google",
      token: "google-id-token",
    });
  });
});
