import type {
  SubscriptionPeriod,
  SubscriptionTier,
} from "@/features/billing/types";
import {
  DEFAULT_THEME_ID,
  getThemeDefinition,
  isThemeId,
  resolveThemeId,
} from "@/features/theme/registry";
import type { ThemeAccess, ThemeId } from "@/features/theme/types";

export type ThemeAccessReason =
  | "free_theme"
  | "requires_premium"
  | "entitlement_expired"
  | "unknown_theme";

export interface ThemeSubscriptionSnapshot {
  tier: SubscriptionTier;
  period: SubscriptionPeriod | null;
}

export interface ThemeAccessResult {
  canUse: boolean;
  resolvedThemeId: ThemeId;
  reason: ThemeAccessReason;
  access: ThemeAccess;
}

/** Active monthly or annual subscription — lifetime does not unlock premium themes. */
export function hasRecurringPremiumSubscription(
  subscription: ThemeSubscriptionSnapshot,
): boolean {
  if (subscription.tier !== "premium") {
    return false;
  }

  return (
    subscription.period === "monthly" || subscription.period === "annual"
  );
}

export function getThemeAccess(themeId: ThemeId): ThemeAccess {
  return getThemeDefinition(themeId).access;
}

export function canUseTheme(
  themeId: string | null | undefined,
  subscription: ThemeSubscriptionSnapshot,
): ThemeAccessResult {
  const hadUnknownInput = Boolean(themeId && !isThemeId(themeId));
  const resolvedThemeId = resolveThemeId(themeId);
  const access = getThemeAccess(resolvedThemeId);

  if (hadUnknownInput) {
    return {
      canUse: false,
      resolvedThemeId: DEFAULT_THEME_ID,
      reason: "unknown_theme",
      access: "free",
    };
  }

  if (access === "free") {
    return {
      canUse: true,
      resolvedThemeId,
      reason: "free_theme",
      access,
    };
  }

  if (hasRecurringPremiumSubscription(subscription)) {
    return {
      canUse: true,
      resolvedThemeId,
      reason: "free_theme",
      access,
    };
  }

  const reason: ThemeAccessReason =
    subscription.tier === "premium" ? "entitlement_expired" : "requires_premium";

  return {
    canUse: false,
    resolvedThemeId: DEFAULT_THEME_ID,
    reason,
    access,
  };
}

export function isPremiumTheme(themeId: ThemeId): boolean {
  return getThemeAccess(themeId) === "premium";
}
