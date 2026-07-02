import * as AuthSession from "expo-auth-session";

import { LEGAL_WEB_BASE } from "@/features/legal/constants";

/** Native deep link opened when the app handles recovery directly. */
export const PASSWORD_RECOVERY_APP_PATH = "/auth/reset-password";

export const PASSWORD_RECOVERY_APP_SCHEME = "theconservatory";

export const PASSWORD_RECOVERY_APP_URL = `${PASSWORD_RECOVERY_APP_SCHEME}://${PASSWORD_RECOVERY_APP_PATH.replace(/^\//, "")}`;

/** HTTPS redirect registered in Supabase and used in reset emails. */
export const PASSWORD_RECOVERY_WEB_URL = `${LEGAL_WEB_BASE}${PASSWORD_RECOVERY_APP_PATH}`;

/** Supabase `redirectTo` for password recovery emails. */
export const PASSWORD_RECOVERY_REDIRECT_URL = PASSWORD_RECOVERY_WEB_URL;

/** OAuth callback path segment (no leading slash for makeRedirectUri). */
export const OAUTH_CALLBACK_PATH = "auth/callback";

export const OAUTH_CALLBACK_APP_PATH = `/${OAUTH_CALLBACK_PATH}`;

export const OAUTH_CALLBACK_WEB_URL = `${LEGAL_WEB_BASE}${OAUTH_CALLBACK_APP_PATH}`;

/**
 * Canonical OAuth redirect URI for Supabase `redirectTo` and WebBrowser sessions.
 * Resolves to `theconservatory://auth/callback` on native builds.
 */
export function getOAuthRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: PASSWORD_RECOVERY_APP_SCHEME,
    path: OAUTH_CALLBACK_PATH,
  });
}
