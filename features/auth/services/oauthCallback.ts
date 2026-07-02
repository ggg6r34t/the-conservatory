import { supabase } from "@/config/supabase";
import {
  OAUTH_CALLBACK_APP_PATH,
  PASSWORD_RECOVERY_APP_SCHEME,
} from "@/features/auth/constants/authRedirects";

function parseParamString(value: string): Record<string, string> {
  if (!value) {
    return {};
  }

  return value
    .replace(/^[?#]/, "")
    .split("&")
    .filter(Boolean)
    .reduce<Record<string, string>>((params, pair) => {
      const [rawKey, rawValue = ""] = pair.split("=");
      if (!rawKey) {
        return params;
      }
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
      return params;
    }, {});
}

export function parseOAuthCallbackParams(
  url: string,
): Record<string, string> {
  const parsed = new URL(url);
  return {
    ...parseParamString(parsed.search),
    ...parseParamString(parsed.hash),
  };
}

export function isOAuthCallbackUrl(url: string): boolean {
  if (!url.trim()) {
    return false;
  }

  try {
    if (url.startsWith(`${PASSWORD_RECOVERY_APP_SCHEME}://`)) {
      const withoutScheme = url.slice(`${PASSWORD_RECOVERY_APP_SCHEME}://`.length);
      const path = withoutScheme.split(/[?#]/)[0] ?? "";
      const normalized = `/${path.replace(/\/+$/, "")}`;
      return normalized === OAUTH_CALLBACK_APP_PATH || normalized.endsWith(OAUTH_CALLBACK_APP_PATH);
    }

    const parsed = new URL(url);
    const normalized = parsed.pathname.replace(/\/+$/, "") || "/";
    return (
      normalized === OAUTH_CALLBACK_APP_PATH ||
      normalized.endsWith(OAUTH_CALLBACK_APP_PATH)
    );
  } catch {
    return (
      url.includes("auth/callback") &&
      (url.includes("access_token=") ||
        url.includes("refresh_token=") ||
        url.includes("code=") ||
        url.includes("error="))
    );
  }
}

export async function completeOAuthCallbackFromUrl(url: string): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const params = parseOAuthCallbackParams(url);

  if (params.error) {
    throw new Error(params.error_description ?? params.error);
  }

  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) {
      throw error;
    }
    return;
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      throw error;
    }
    return;
  }

  throw new Error("OAuth callback did not include a session token or code.");
}
