import * as SecureStore from "expo-secure-store";

import { logger } from "@/utils/logger";

const RECOVERY_PENDING_KEY = "the-conservatory.password-recovery-pending";

export async function markPasswordRecoveryPending() {
  try {
    await SecureStore.setItemAsync(RECOVERY_PENDING_KEY, "true");
  } catch (error) {
    logger.warn("auth.recovery_pending.mark_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function clearPasswordRecoveryPending() {
  try {
    await SecureStore.deleteItemAsync(RECOVERY_PENDING_KEY);
  } catch (error) {
    logger.warn("auth.recovery_pending.clear_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function isPasswordRecoveryPending() {
  try {
    return (await SecureStore.getItemAsync(RECOVERY_PENDING_KEY)) === "true";
  } catch {
    return false;
  }
}
