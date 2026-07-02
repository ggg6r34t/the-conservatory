import { AuthClientError } from "@/features/auth/errors/AuthClientError";

export type OAuthProvider = "apple" | "google";

export type OAuthErrorCode =
  | "oauth_cancelled"
  | "oauth_provider_unavailable"
  | "oauth_misconfigured"
  | "oauth_callback_missing"
  | "oauth_exchange_failed"
  | "oauth_network_error"
  | "oauth_profile_failed"
  | "auth_failed";

export function createOAuthError(
  code: OAuthErrorCode,
  message: string,
  retryable = false,
) {
  return new AuthClientError(code, message, retryable);
}

export function mapOAuthError(
  error: unknown,
  provider: OAuthProvider,
  fallbackMessage = "We couldn't complete sign in.",
): AuthClientError {
  if (error instanceof AuthClientError) {
    return error;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const rawMessage = error instanceof Error ? error.message : "";

  if (
    message.includes("cancel") ||
    message.includes("dismiss") ||
    message.includes("user closed") ||
    rawMessage === "SIGN_IN_CANCELLED"
  ) {
    return createOAuthError(
      "oauth_cancelled",
      "Sign in was cancelled.\nNo changes were made.",
    );
  }

  if (message.includes("native module")) {
    return createOAuthError(
      "oauth_provider_unavailable",
      provider === "google"
        ? "Google Sign In isn't available in this app build."
        : "Apple Sign In isn't available right now.",
    );
  }

  if (
    message.includes("not configured") ||
    message.includes("client id")
  ) {
    return createOAuthError(
      "oauth_misconfigured",
      provider === "google"
        ? "Google Sign In isn't configured for this build."
        : "Apple Sign In isn't configured for this build.",
    );
  }

  if (message.includes("unavailable")) {
    return createOAuthError(
      "oauth_provider_unavailable",
      provider === "google"
        ? "Google Sign In isn't available right now."
        : "Apple Sign In isn't available right now.",
    );
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout") ||
    message.includes("connection")
  ) {
    return createOAuthError(
      "oauth_network_error",
      "We couldn't complete sign in.\nPlease check your connection and try again.",
      true,
    );
  }

  if (
    message.includes("callback") ||
    message.includes("session token or code") ||
    message.includes("missing oauth")
  ) {
    return createOAuthError(
      "oauth_callback_missing",
      "We couldn't finish signing you in. Please try again.",
      true,
    );
  }

  if (message.includes("exchange") || message.includes("invalid grant")) {
    return createOAuthError(
      "oauth_exchange_failed",
      "We couldn't verify your sign in. Please try again.",
      true,
    );
  }

  return createOAuthError("auth_failed", fallbackMessage, false);
}

export function isOAuthCancellation(error: unknown): boolean {
  return (
    error instanceof AuthClientError && error.code === "oauth_cancelled"
  );
}
