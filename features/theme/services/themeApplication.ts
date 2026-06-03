import {
  getUserPreferences,
  updatePreferredTheme,
} from "@/features/settings/api/settingsClient";
import {
  trackThemeChanged,
  trackThemeFallbackApplied,
  trackThemeRestoredOnStartup,
  trackThemeRevertedAfterDowngrade,
  trackThemeSaveFailed,
  trackThemeSelected,
} from "@/features/theme/analytics";
import { DEFAULT_THEME_ID, resolveThemeId } from "@/features/theme/registry";
import {
  readCachedThemeId,
  writeCachedThemeId,
} from "@/features/theme/services/themeCacheStorage";
import {
  canUseTheme,
  isPremiumTheme,
  type ThemeSubscriptionSnapshot,
} from "@/features/theme/themeAccess";
import type { ThemeId } from "@/features/theme/types";

export type ThemeApplicationErrorCode =
  | "THEME_REQUIRES_PREMIUM"
  | "THEME_UNKNOWN"
  | "THEME_ENTITLEMENT_EXPIRED"
  | "THEME_SAVE_FAILED";

export class ThemeApplicationError extends Error {
  readonly code: ThemeApplicationErrorCode;
  readonly themeId: ThemeId;

  constructor(code: ThemeApplicationErrorCode, themeId: ThemeId) {
    super(code);
    this.name = "ThemeApplicationError";
    this.code = code;
    this.themeId = themeId;
  }
}

function toApplicationError(
  themeId: ThemeId,
  reason: ReturnType<typeof canUseTheme>["reason"],
): ThemeApplicationError {
  switch (reason) {
    case "unknown_theme":
      return new ThemeApplicationError("THEME_UNKNOWN", themeId);
    case "entitlement_expired":
      return new ThemeApplicationError("THEME_ENTITLEMENT_EXPIRED", themeId);
    default:
      return new ThemeApplicationError("THEME_REQUIRES_PREMIUM", themeId);
  }
}

export async function readThemeSubscriptionSnapshot(): Promise<ThemeSubscriptionSnapshot> {
  const { readEntitlementCache, resolveEffectiveTier } = await import(
    "@/features/billing/services/entitlementCache"
  );
  const cached = await readEntitlementCache();
  if (cached) {
    return {
      tier: resolveEffectiveTier(cached),
      period: cached.period,
    };
  }

  return { tier: "free", period: null };
}

/** Resolves a persisted or cached theme id to an accessible theme (no write). */
export function resolveAccessibleThemeId(
  themeId: string | null | undefined,
  subscription: ThemeSubscriptionSnapshot,
): ThemeId {
  return canUseTheme(themeId, subscription).resolvedThemeId;
}

export interface ReconcileThemeResult {
  themeId: ThemeId;
  corrected: boolean;
  previousThemeId: ThemeId | null;
}

/**
 * Validates preference against entitlement and persists Linen Light when needed.
 */
export async function reconcilePreferredTheme(input: {
  userId: string;
  preferredThemeId: string | null | undefined;
  subscription: ThemeSubscriptionSnapshot;
  source: string;
}): Promise<ReconcileThemeResult> {
  const preferredResolved = resolveThemeId(input.preferredThemeId);
  const accessCheck = canUseTheme(input.preferredThemeId, input.subscription);
  const themeId = accessCheck.resolvedThemeId;
  const corrected = preferredResolved !== themeId;

  if (!corrected) {
    return {
      themeId,
      corrected: false,
      previousThemeId: preferredResolved,
    };
  }

  await updatePreferredTheme(input.userId, themeId);
  await writeCachedThemeId(themeId);
  trackThemeFallbackApplied({
    theme_id: themeId,
    previous_theme_id: input.preferredThemeId ?? null,
    source: input.source,
  });

  if (isPremiumTheme(preferredResolved) && !accessCheck.canUse) {
    trackThemeRevertedAfterDowngrade({
      theme_id: themeId,
      previous_theme_id: preferredResolved,
      source: input.source,
    });
  }

  return {
    themeId,
    corrected: true,
    previousThemeId: preferredResolved,
  };
}

export async function applyTheme(input: {
  userId: string;
  themeId: ThemeId;
  subscription: ThemeSubscriptionSnapshot;
  previousThemeId: ThemeId;
  source?: string;
}): Promise<{
  appliedThemeId: ThemeId;
  changed: boolean;
  previousThemeId: ThemeId;
}> {
  const access = canUseTheme(input.themeId, input.subscription);

  if (!access.canUse) {
    throw toApplicationError(input.themeId, access.reason);
  }

  const appliedThemeId = access.resolvedThemeId;

  let persistedThemeId: ThemeId;
  try {
    const preferences = await getUserPreferences(input.userId);
    persistedThemeId = preferences.preferredTheme;
  } catch {
    trackThemeSaveFailed({
      theme_id: appliedThemeId,
      previous_theme_id: input.previousThemeId,
      reason: "preferences_read_failed",
      source: input.source,
    });
    throw new ThemeApplicationError("THEME_SAVE_FAILED", input.themeId);
  }

  const needsPersist = persistedThemeId !== appliedThemeId;

  if (!needsPersist) {
    await writeCachedThemeId(appliedThemeId);
    return {
      appliedThemeId,
      changed: input.previousThemeId !== appliedThemeId,
      previousThemeId: input.previousThemeId,
    };
  }

  try {
    await updatePreferredTheme(input.userId, appliedThemeId);
    await writeCachedThemeId(appliedThemeId);
  } catch {
    trackThemeSaveFailed({
      theme_id: appliedThemeId,
      previous_theme_id: input.previousThemeId,
      reason: "preferences_write_failed",
      source: input.source,
    });
    throw new ThemeApplicationError("THEME_SAVE_FAILED", input.themeId);
  }

  trackThemeSelected({
    theme_id: appliedThemeId,
    previous_theme: input.previousThemeId,
    new_theme: appliedThemeId,
    access: access.access,
    subscription_tier: input.subscription.tier,
    source: input.source,
  });
  trackThemeChanged({
    theme_id: appliedThemeId,
    previous_theme: input.previousThemeId,
    new_theme: appliedThemeId,
    access: access.access,
    subscription_tier: input.subscription.tier,
    source: input.source,
  });

  return {
    appliedThemeId,
    changed: true,
    previousThemeId: input.previousThemeId,
  };
}

export async function revertToDefaultTheme(input: {
  userId: string;
  previousThemeId: ThemeId;
  source: string;
}): Promise<ThemeId> {
  if (input.previousThemeId === DEFAULT_THEME_ID) {
    return DEFAULT_THEME_ID;
  }

  await updatePreferredTheme(input.userId, DEFAULT_THEME_ID);
  await writeCachedThemeId(DEFAULT_THEME_ID);
  trackThemeRevertedAfterDowngrade({
    theme_id: DEFAULT_THEME_ID,
    previous_theme_id: input.previousThemeId,
    source: input.source,
  });
  trackThemeFallbackApplied({
    theme_id: DEFAULT_THEME_ID,
    previous_theme_id: input.previousThemeId,
    source: input.source,
  });

  return DEFAULT_THEME_ID;
}

/** Bootstrap: reconcile preference + cache against entitlement; persist when userId given. */
export async function resolveBootstrapAccessibleTheme(input: {
  cachedThemeId: ThemeId | null;
  preferredTheme?: string | null;
  subscription: ThemeSubscriptionSnapshot;
  userId?: string;
  source: string;
}): Promise<{ themeId: ThemeId; corrected: boolean }> {
  const preferredResolved = resolveThemeId(input.preferredTheme);
  const access = canUseTheme(
    input.preferredTheme ?? input.cachedThemeId ?? DEFAULT_THEME_ID,
    input.subscription,
  );
  const themeId = access.resolvedThemeId;
  const corrected = preferredResolved !== themeId;

  if (corrected && input.userId) {
    return reconcilePreferredTheme({
      userId: input.userId,
      preferredThemeId: input.preferredTheme ?? preferredResolved,
      subscription: input.subscription,
      source: input.source,
    }).then((result) => ({
      themeId: result.themeId,
      corrected: result.corrected,
    }));
  }

  if (input.cachedThemeId !== themeId) {
    await writeCachedThemeId(themeId);
  }

  return { themeId, corrected: input.cachedThemeId !== themeId };
}

export async function readCachedAccessibleTheme(
  subscription: ThemeSubscriptionSnapshot,
): Promise<ThemeId> {
  const cached = await readCachedThemeId();
  return resolveAccessibleThemeId(cached, subscription);
}
