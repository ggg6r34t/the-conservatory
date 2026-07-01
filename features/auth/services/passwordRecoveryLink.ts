import {
  PASSWORD_RECOVERY_APP_PATH,
  PASSWORD_RECOVERY_APP_SCHEME,
  PASSWORD_RECOVERY_WEB_URL,
} from "@/features/auth/constants/authRedirects";

export type PasswordRecoveryLinkPayload =
  | {
      kind: "tokens";
      accessToken: string;
      refreshToken: string;
    }
  | {
      kind: "code";
      code: string;
    };

function parseHashParams(url: string) {
  const hashIndex = url.indexOf("#");
  if (hashIndex < 0) {
    return new URLSearchParams();
  }

  return new URLSearchParams(url.slice(hashIndex + 1));
}

function parseQueryParams(url: string) {
  const queryIndex = url.indexOf("?");
  if (queryIndex < 0) {
    return new URLSearchParams();
  }

  const hashIndex = url.indexOf("#", queryIndex);
  const query = hashIndex >= 0 ? url.slice(queryIndex + 1, hashIndex) : url.slice(queryIndex + 1);
  return new URLSearchParams(query);
}

function isPasswordRecoveryPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return (
    normalized === PASSWORD_RECOVERY_APP_PATH ||
    normalized.endsWith(PASSWORD_RECOVERY_APP_PATH)
  );
}

export function isPasswordRecoveryUrl(url: string) {
  if (!url.trim()) {
    return false;
  }

  try {
    if (url.startsWith(`${PASSWORD_RECOVERY_APP_SCHEME}://`)) {
      const withoutScheme = url.slice(`${PASSWORD_RECOVERY_APP_SCHEME}://`.length);
      const path = withoutScheme.split(/[?#]/)[0] ?? "";
      return isPasswordRecoveryPath(`/${path}`);
    }

    const parsed = new URL(url);
    if (!isPasswordRecoveryPath(parsed.pathname)) {
      return false;
    }

    return (
      parsed.origin === new URL(PASSWORD_RECOVERY_WEB_URL).origin ||
      parsed.hostname === "theconservatory.app" ||
      parsed.hostname === "theconservatory.garden"
    );
  } catch {
    return (
      url.includes("auth/reset-password") &&
      (url.includes("access_token=") ||
        url.includes("refresh_token=") ||
        url.includes("code="))
    );
  }
}

export function parsePasswordRecoveryUrl(
  url: string,
): PasswordRecoveryLinkPayload | null {
  if (!isPasswordRecoveryUrl(url)) {
    return null;
  }

  const hashParams = parseHashParams(url);
  const queryParams = parseQueryParams(url);
  const type = hashParams.get("type") ?? queryParams.get("type");

  if (type && type !== "recovery") {
    return null;
  }

  const accessToken = hashParams.get("access_token") ?? queryParams.get("access_token");
  const refreshToken =
    hashParams.get("refresh_token") ?? queryParams.get("refresh_token");

  if (accessToken && refreshToken) {
    return {
      kind: "tokens",
      accessToken,
      refreshToken,
    };
  }

  const code = queryParams.get("code") ?? hashParams.get("code");
  if (code) {
    return { kind: "code", code };
  }

  return null;
}
