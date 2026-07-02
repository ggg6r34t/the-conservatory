/**
 * @jest-environment node
 */

import {
  createOAuthError,
  isOAuthCancellation,
  mapOAuthError,
} from "@/features/auth/services/oauthErrors";

describe("oauthErrors", () => {
  it("maps cancellation errors", () => {
    const error = mapOAuthError(new Error("The user canceled the sign-in flow"), "apple");
    expect(error.code).toBe("oauth_cancelled");
    expect(isOAuthCancellation(error)).toBe(true);
  });

  it("maps network errors as retryable", () => {
    const error = mapOAuthError(new Error("Network request failed"), "google");
    expect(error.code).toBe("oauth_network_error");
    expect(error.retryable).toBe(true);
  });

  it("maps provider unavailable errors", () => {
    const error = mapOAuthError(new Error("native module unavailable"), "google");
    expect(error.code).toBe("oauth_provider_unavailable");
  });

  it("maps callback missing errors", () => {
    const error = mapOAuthError(
      new Error("OAuth callback did not include a session token or code"),
      "apple",
    );
    expect(error.code).toBe("oauth_callback_missing");
  });

  it("maps exchange failures", () => {
    const error = mapOAuthError(new Error("invalid grant exchange failed"), "google");
    expect(error.code).toBe("oauth_exchange_failed");
  });

  it("maps SIGN_IN_CANCELLED from google native module", () => {
    const error = mapOAuthError(new Error("SIGN_IN_CANCELLED"), "google");
    expect(error.code).toBe("oauth_cancelled");
  });

  it("creates structured oauth errors", () => {
    const error = createOAuthError(
      "oauth_misconfigured",
      "Google Sign In isn't configured for this build.",
    );
    expect(error.message).toContain("Google Sign In");
    expect(error.code).toBe("oauth_misconfigured");
  });
});
