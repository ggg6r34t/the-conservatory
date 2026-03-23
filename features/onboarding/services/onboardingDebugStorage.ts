import AsyncStorage from "@react-native-async-storage/async-storage";

import type { WalkthroughSlideId } from "@/features/onboarding/constants/walkthroughSlides";
import { getOnboardingStatus, type OnboardingStatus } from "@/features/onboarding/services/onboardingStorage";
import { logger } from "@/utils/logger";

const ONBOARDING_DEBUG_KEY = "onboarding-debug-snapshot";

function isDebugEnabled() {
  return __DEV__;
}

export interface OnboardingDebugSnapshot {
  completedAt: string | null;
  welcomeViewedAt: string | null;
  permissionsViewedAt: string | null;
  quickStartViewedAt: string | null;
  viewedSlides: WalkthroughSlideId[];
  lastViewedSlide: WalkthroughSlideId | null;
  lastAction: string | null;
  lastActionAt: string | null;
  updatedAt: string | null;
}

export interface ResolvedOnboardingDebugSnapshot extends OnboardingDebugSnapshot {
  status: OnboardingStatus;
  slideViewCount: number;
}

const defaultSnapshot: OnboardingDebugSnapshot = {
  completedAt: null,
  welcomeViewedAt: null,
  permissionsViewedAt: null,
  quickStartViewedAt: null,
  viewedSlides: [],
  lastViewedSlide: null,
  lastAction: null,
  lastActionAt: null,
  updatedAt: null,
};

async function readSnapshot(): Promise<OnboardingDebugSnapshot> {
  if (!isDebugEnabled()) {
    return defaultSnapshot;
  }

  try {
    const stored = await AsyncStorage.getItem(ONBOARDING_DEBUG_KEY);
    if (!stored) {
      return defaultSnapshot;
    }

    const parsed = JSON.parse(stored) as Partial<OnboardingDebugSnapshot>;
    return {
      ...defaultSnapshot,
      ...parsed,
      viewedSlides: Array.isArray(parsed.viewedSlides)
        ? (parsed.viewedSlides.filter(Boolean) as WalkthroughSlideId[])
        : [],
    };
  } catch (error) {
    logger.warn("onboarding.debug.read_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return defaultSnapshot;
  }
}

async function writeSnapshot(snapshot: OnboardingDebugSnapshot): Promise<void> {
  if (!isDebugEnabled()) {
    return;
  }

  try {
    await AsyncStorage.setItem(ONBOARDING_DEBUG_KEY, JSON.stringify(snapshot));
  } catch (error) {
    logger.warn("onboarding.debug.write_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function updateSnapshot(
  updater: (current: OnboardingDebugSnapshot) => OnboardingDebugSnapshot,
): Promise<void> {
  const current = await readSnapshot();
  const next = updater(current);
  await writeSnapshot(next);
}

export async function getOnboardingDebugSnapshot(
  userId?: string,
): Promise<ResolvedOnboardingDebugSnapshot> {
  const [snapshot, status] = await Promise.all([
    readSnapshot(),
    getOnboardingStatus(userId),
  ]);
  return {
    ...snapshot,
    status,
    slideViewCount: snapshot.viewedSlides.length,
  };
}

export async function markWelcomeViewed(at = new Date().toISOString()): Promise<void> {
  await updateSnapshot((current) => ({
    ...current,
    welcomeViewedAt: current.welcomeViewedAt ?? at,
    updatedAt: at,
  }));
}

export async function markPermissionsViewed(at = new Date().toISOString()): Promise<void> {
  await updateSnapshot((current) => ({
    ...current,
    permissionsViewedAt: current.permissionsViewedAt ?? at,
    updatedAt: at,
  }));
}

export async function markQuickStartViewed(at = new Date().toISOString()): Promise<void> {
  await updateSnapshot((current) => ({
    ...current,
    quickStartViewedAt: current.quickStartViewedAt ?? at,
    updatedAt: at,
  }));
}

export async function markWalkthroughSlideViewed(
  slideId: WalkthroughSlideId,
  at = new Date().toISOString(),
): Promise<void> {
  await updateSnapshot((current) => ({
    ...current,
    viewedSlides: current.viewedSlides.includes(slideId)
      ? current.viewedSlides
      : [...current.viewedSlides, slideId],
    lastViewedSlide: slideId,
    updatedAt: at,
  }));
}

export async function markOnboardingAction(
  action: string,
  at = new Date().toISOString(),
): Promise<void> {
  await updateSnapshot((current) => ({
    ...current,
    lastAction: action,
    lastActionAt: at,
    updatedAt: at,
  }));
}

export async function markOnboardingCompletedAt(
  at = new Date().toISOString(),
): Promise<void> {
  await updateSnapshot((current) => ({
    ...current,
    completedAt: at,
    lastAction: current.lastAction ?? "completed",
    lastActionAt: at,
    updatedAt: at,
  }));
}

export async function resetOnboardingDebugSnapshot(): Promise<void> {
  if (!isDebugEnabled()) {
    return;
  }

  try {
    await AsyncStorage.removeItem(ONBOARDING_DEBUG_KEY);
  } catch (error) {
    logger.warn("onboarding.debug.reset_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
