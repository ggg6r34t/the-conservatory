import * as WebBrowser from "expo-web-browser";

import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import { getOAuthRedirectUri } from "@/features/auth/constants/authRedirects";
import {
  exchangeOAuthCallbackUrl,
} from "@/features/auth/services/oauthCallbackCoordinator";
import {
  createOAuthError,
  mapOAuthError,
  type OAuthProvider,
} from "@/features/auth/services/oauthErrors";
import { signInWithGoogleNative, isGoogleNativeSignInAvailable } from "@/features/auth/services/googleSignIn";
import { trackEvent } from "@/services/analytics/analyticsService";

WebBrowser.maybeCompleteAuthSession();

export type OAuthSignInScreen = "login" | "signup";

export function isOAuthProviderAvailable(provider: OAuthProvider): boolean {
  if (!env.isSupabaseConfigured) {
    return false;
  }

  if (provider === "google") {
    return true;
  }

  return true;
}

async function signInWithBrowserOAuth(
  provider: OAuthProvider,
  redirectTo: string,
) {
  if (!supabase) {
    throw createOAuthError(
      "oauth_misconfigured",
      "Sign in isn't available in this build right now.",
    );
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    throw error ?? createOAuthError("oauth_provider_unavailable", "Sign in isn't available right now.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "cancel" || result.type === "dismiss") {
    throw createOAuthError(
      "oauth_cancelled",
      "Sign in was cancelled.\nNo changes were made.",
    );
  }

  if (result.type !== "success" || !result.url) {
    throw createOAuthError(
      "oauth_callback_missing",
      "We couldn't finish signing you in. Please try again.",
      true,
    );
  }

  await exchangeOAuthCallbackUrl(result.url);
}

export async function startOAuthSignIn(
  provider: OAuthProvider,
  screen: OAuthSignInScreen,
): Promise<void> {
  if (!env.isSupabaseConfigured) {
    throw createOAuthError(
      "oauth_misconfigured",
      "Sign in isn't available in this build right now.",
    );
  }

  const redirectTo = getOAuthRedirectUri();

  trackEvent("oauth_sign_in_started", {
    provider,
    screen,
  });

  try {
    if (provider === "google" && isGoogleNativeSignInAvailable()) {
      await signInWithGoogleNative();
      return;
    }

    await signInWithBrowserOAuth(provider, redirectTo);
  } catch (error) {
    const mapped = mapOAuthError(error, provider);

    if (mapped.code === "oauth_cancelled") {
      trackEvent("oauth_sign_in_cancelled", {
        provider,
        screen,
        reason_code: mapped.code,
      });
    } else {
      trackEvent("oauth_sign_in_failed", {
        provider,
        screen,
        reason_code: mapped.code,
      });
    }

    throw mapped;
  }
}

export async function processOAuthCallbackUrl(url: string): Promise<boolean> {
  try {
    return await exchangeOAuthCallbackUrl(url);
  } catch (error) {
    throw mapOAuthError(error, "google");
  }
}
