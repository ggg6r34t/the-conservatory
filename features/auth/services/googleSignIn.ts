import { Platform, TurboModuleRegistry } from "react-native";

import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import { createOAuthError } from "@/features/auth/services/oauthErrors";
import { logger } from "@/utils/logger";

type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

let googleSignInModule: GoogleSignInModule | null = null;
let googleSignInUnavailable = false;

const GOOGLE_SIGN_IN_UNAVAILABLE_MESSAGE =
  "Google Sign-In is unavailable in this app build. Rebuild the development client to include Google Sign-In support.";

async function getGoogleSignInModule(): Promise<GoogleSignInModule | null> {
  if (googleSignInModule) {
    return googleSignInModule;
  }
  if (googleSignInUnavailable) {
    return null;
  }

  const nativeModuleAvailable = Boolean(
    TurboModuleRegistry.get("RNGoogleSignin"),
  );
  if (!nativeModuleAvailable) {
    googleSignInUnavailable = true;
    return null;
  }

  try {
    googleSignInModule =
      require("@react-native-google-signin/google-signin") as GoogleSignInModule;
  } catch {
    googleSignInUnavailable = true;
    return null;
  }

  return googleSignInModule;
}

function getGoogleWebClientId(): string {
  const webClientId = env.googleWebClientId?.trim();
  if (!webClientId) {
    throw createOAuthError(
      "oauth_misconfigured",
      "Google Sign In isn't configured for this build.",
    );
  }
  return webClientId;
}

export function isGoogleNativeSignInAvailable(): boolean {
  if (!env.googleWebClientId) {
    return false;
  }
  return Boolean(TurboModuleRegistry.get("RNGoogleSignin"));
}

export async function configureGoogleSignIn(): Promise<void> {
  const googleSignIn = await getGoogleSignInModule();
  if (!googleSignIn || !env.googleWebClientId) {
    return;
  }

  const { GoogleSignin } = googleSignIn;
  GoogleSignin.configure({
    webClientId: getGoogleWebClientId(),
  });
}

export async function signInWithGoogleNative() {
  if (!supabase) {
    throw createOAuthError(
      "oauth_misconfigured",
      "Sign in isn't available in this build right now.",
    );
  }

  const googleSignIn = await getGoogleSignInModule();
  if (!googleSignIn) {
    throw createOAuthError(
      "oauth_provider_unavailable",
      GOOGLE_SIGN_IN_UNAVAILABLE_MESSAGE,
    );
  }

  const { GoogleSignin } = googleSignIn;
  GoogleSignin.configure({
    webClientId: getGoogleWebClientId(),
  });

  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  }

  const userInfo = await GoogleSignin.signIn();
  const normalizedUserInfo = userInfo as {
    data?: { idToken?: string | null };
    idToken?: string | null;
  };
  const idToken =
    normalizedUserInfo.data?.idToken ?? normalizedUserInfo.idToken ?? undefined;

  if (!idToken) {
    throw createOAuthError(
      "oauth_exchange_failed",
      "We couldn't verify your Google sign in. Please try again.",
      true,
    );
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (error) {
    logger.warn("auth.oauth.google_id_token_failed");
    throw error;
  }

  return data;
}
