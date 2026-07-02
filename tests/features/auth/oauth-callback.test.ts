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

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "theconservatory://auth/callback"),
}));

import {
  completeOAuthCallbackFromUrl,
  isOAuthCallbackUrl,
  parseOAuthCallbackParams,
} from "@/features/auth/services/oauthCallback";
import { getOAuthRedirectUri } from "@/features/auth/constants/authRedirects";
import { supabase } from "@/config/supabase";

const mockAuth = supabase!.auth as unknown as {
  setSession: jest.Mock;
  exchangeCodeForSession: jest.Mock;
};

describe("oauthCallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds the canonical redirect uri", () => {
    expect(getOAuthRedirectUri()).toBe("theconservatory://auth/callback");
  });

  it("detects oauth callback urls", () => {
    expect(
      isOAuthCallbackUrl("theconservatory://auth/callback?code=abc"),
    ).toBe(true);
    expect(
      isOAuthCallbackUrl("https://theconservatory.garden/auth/callback?code=abc"),
    ).toBe(true);
    expect(
      isOAuthCallbackUrl("theconservatory://auth/reset-password?code=abc"),
    ).toBe(false);
  });

  it("parses query and fragment callback params", () => {
    expect(
      parseOAuthCallbackParams(
        "theconservatory://auth/callback?code=abc#access_token=at&refresh_token=rt",
      ),
    ).toEqual({
      code: "abc",
      access_token: "at",
      refresh_token: "rt",
    });
  });

  it("sets a session when callback contains tokens", async () => {
    mockAuth.setSession.mockResolvedValue({ error: null });

    await completeOAuthCallbackFromUrl(
      "theconservatory://auth/callback#access_token=at&refresh_token=rt",
    );

    expect(mockAuth.setSession).toHaveBeenCalledWith({
      access_token: "at",
      refresh_token: "rt",
    });
    expect(mockAuth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges an auth code when callback contains code", async () => {
    mockAuth.exchangeCodeForSession.mockResolvedValue({ error: null });

    await completeOAuthCallbackFromUrl(
      "theconservatory://auth/callback?code=abc",
    );

    expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(mockAuth.setSession).not.toHaveBeenCalled();
  });
});
