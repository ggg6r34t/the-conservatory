import AsyncStorage from "@react-native-async-storage/async-storage";

import { env } from "@/config/env";
import { supabase } from "@/config/supabase";
import { logger } from "@/utils/logger";

const DEVICE_ONBOARDING_STATUS_KEY = "onboarding-status";
const ACCOUNT_ONBOARDING_STATUS_PREFIX = "onboarding-status.account";

export type OnboardingStatus = "pending" | "completed";

function getAccountStatusKey(userId: string) {
  return `${ACCOUNT_ONBOARDING_STATUS_PREFIX}.${userId}`;
}

function isMissingRemoteColumnError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("onboarding_completed_at")
  );
}

async function getRemoteOnboardingStatus(userId: string): Promise<OnboardingStatus | null> {
  if (!env.isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("onboarding_completed_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      if (!isMissingRemoteColumnError(error)) {
        logger.warn("onboarding.status.remote_read_failed");
      }
      return null;
    }

    return data?.onboarding_completed_at ? "completed" : "pending";
  } catch (error) {
    if (!isMissingRemoteColumnError(error)) {
      logger.warn("onboarding.status.remote_read_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
    return null;
  }
}

async function setRemoteOnboardingCompleted(userId: string): Promise<boolean> {
  if (!env.isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const completedAt = new Date().toISOString();
    const { error } = await supabase
      .from("users")
      .update({
        onboarding_completed_at: completedAt,
        updated_at: completedAt,
        updated_by: userId,
      })
      .eq("id", userId);

    if (error) {
      if (!isMissingRemoteColumnError(error)) {
        logger.warn("onboarding.status.remote_write_failed");
      }
      return false;
    }

    return true;
  } catch (error) {
    if (!isMissingRemoteColumnError(error)) {
      logger.warn("onboarding.status.remote_write_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
    return false;
  }
}

async function clearRemoteOnboardingCompleted(userId: string): Promise<boolean> {
  if (!env.isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("users")
      .update({
        onboarding_completed_at: null,
        updated_at: updatedAt,
        updated_by: userId,
      })
      .eq("id", userId);

    if (error) {
      if (!isMissingRemoteColumnError(error)) {
        logger.warn("onboarding.status.remote_reset_failed");
      }
      return false;
    }

    return true;
  } catch (error) {
    if (!isMissingRemoteColumnError(error)) {
      logger.warn("onboarding.status.remote_reset_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
    return false;
  }
}

async function readStatus(key: string): Promise<OnboardingStatus> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored === "completed" ? "completed" : "pending";
  } catch (error) {
    logger.warn("onboarding.status.read_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return "pending";
  }
}

async function writeStatus(key: string, status: OnboardingStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(key, status);
  } catch (error) {
    logger.warn("onboarding.status.write_failed", {
      message: error instanceof Error ? error.message : "unknown",
      status,
    });
  }
}

async function persistCompletedStatus(userId?: string): Promise<void> {
  const writes: Promise<void>[] = [writeStatus(DEVICE_ONBOARDING_STATUS_KEY, "completed")];

  if (userId) {
    writes.push(writeStatus(getAccountStatusKey(userId), "completed"));
  }

  await Promise.all(writes);
}

export async function getOnboardingStatus(userId?: string): Promise<OnboardingStatus> {
  if (userId) {
    const remoteStatus = await getRemoteOnboardingStatus(userId);
    if (remoteStatus === "completed") {
      await persistCompletedStatus(userId);
      return "completed";
    }

    const accountStatus = await readStatus(getAccountStatusKey(userId));
    if (accountStatus === "completed") {
      return accountStatus;
    }
  }

  return readStatus(DEVICE_ONBOARDING_STATUS_KEY);
}

export async function setOnboardingStatus(
  status: OnboardingStatus,
  options?: { userId?: string; scope?: "device" | "account" | "both" },
): Promise<void> {
  const scope = options?.scope ?? (options?.userId ? "both" : "device");
  const writes: Promise<void>[] = [];

  if (scope === "device" || scope === "both") {
    writes.push(writeStatus(DEVICE_ONBOARDING_STATUS_KEY, status));
  }

  if (options?.userId && (scope === "account" || scope === "both")) {
    writes.push(writeStatus(getAccountStatusKey(options.userId), status));
  }

  await Promise.all(writes);
}

export async function completeOnboarding(options?: {
  userId?: string;
  scope?: "device" | "account" | "both";
}): Promise<void> {
  if (options?.userId && (options.scope === "account" || options.scope === "both" || !options.scope)) {
    await setRemoteOnboardingCompleted(options.userId);
  }

  await setOnboardingStatus("completed", options);
}

export async function syncOnboardingStatusToAccount(userId: string): Promise<OnboardingStatus> {
  const remoteStatus = await getRemoteOnboardingStatus(userId);
  if (remoteStatus === "completed") {
    await persistCompletedStatus(userId);
    return "completed";
  }

  const deviceStatus = await readStatus(DEVICE_ONBOARDING_STATUS_KEY);
  const accountStatus = await readStatus(getAccountStatusKey(userId));
  const nextStatus =
    accountStatus === "completed" || deviceStatus === "completed"
      ? "completed"
      : "pending";

  if (nextStatus === "completed") {
    await setRemoteOnboardingCompleted(userId);
    await persistCompletedStatus(userId);
  }

  return nextStatus;
}

export async function resetOnboardingStatus(options?: {
  userId?: string;
  scope?: "device" | "account" | "both";
}): Promise<void> {
  const scope = options?.scope ?? (options?.userId ? "both" : "device");

  if (options?.userId && (scope === "account" || scope === "both")) {
    await clearRemoteOnboardingCompleted(options.userId);
  }

  try {
    const removals: Promise<void>[] = [];

    if (scope === "device" || scope === "both") {
      removals.push(AsyncStorage.removeItem(DEVICE_ONBOARDING_STATUS_KEY));
    }

    if (options?.userId && (scope === "account" || scope === "both")) {
      removals.push(AsyncStorage.removeItem(getAccountStatusKey(options.userId)));
    }

    await Promise.all(removals);
  } catch (error) {
    logger.warn("onboarding.status.reset_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
