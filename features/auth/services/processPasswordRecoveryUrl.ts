import {
  AuthClientError,
  establishPasswordRecoverySession,
} from "@/features/auth/api/authClient";
import {
  isPasswordRecoveryUrl,
  parsePasswordRecoveryUrl,
} from "@/features/auth/services/passwordRecoveryLink";
import { usePasswordRecoveryStore } from "@/features/auth/stores/usePasswordRecoveryStore";
import { logger } from "@/utils/logger";

export async function processPasswordRecoveryUrl(
  url: string,
): Promise<boolean> {
  if (!isPasswordRecoveryUrl(url)) {
    return false;
  }

  const payload = parsePasswordRecoveryUrl(url);
  if (!payload) {
    usePasswordRecoveryStore.getState().setLinkError("invalid_link");
    return true;
  }

  try {
    await establishPasswordRecoverySession(payload);
    usePasswordRecoveryStore.getState().activate();
    return true;
  } catch (error) {
    const reason = error instanceof AuthClientError ? error.code : "unknown";
    logger.warn("auth.recovery.link_failed", { reason });
    usePasswordRecoveryStore.getState().setLinkError(reason);
    return true;
  }
}
