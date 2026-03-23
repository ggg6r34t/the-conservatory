import * as SecureStore from "expo-secure-store";

import { resetOnboardingDebugSnapshot } from "@/features/onboarding/services/onboardingDebugStorage";
import { clearPlantDraft } from "@/features/plants/services/plantDraftStorage";
import type { AppUser } from "@/types/models";
import { logger } from "@/utils/logger";

const SESSION_KEY = "the-conservatory.session";

function isValidDateString(value: unknown) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(new Date(value).getTime())
  );
}

function isAppUser(value: unknown): value is AppUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Partial<AppUser>;
  return (
    typeof user.id === "string" &&
    user.id.length > 0 &&
    typeof user.email === "string" &&
    user.email.length > 0 &&
    typeof user.displayName === "string" &&
    user.displayName.length > 0 &&
    (user.avatarUrl == null || typeof user.avatarUrl === "string") &&
    (user.role === "user" || user.role === "admin") &&
    isValidDateString(user.createdAt) &&
    isValidDateString(user.updatedAt)
  );
}

export async function readSession() {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isAppUser(parsed)) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      logger.warn("auth.session.invalid_shape_cleared");
      return null;
    }

    return parsed;
  } catch (error) {
    logger.warn("auth.session.read_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
    return null;
  }
}

export async function writeSession(user: AppUser) {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(user));
  } catch (error) {
    logger.warn("auth.session.write_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    throw new Error("We couldn't secure your session on this device.");
  }
}

export async function clearSession() {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(SESSION_KEY),
      clearPlantDraft(),
      resetOnboardingDebugSnapshot(),
    ]);
  } catch (error) {
    logger.warn("auth.session.clear_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}
