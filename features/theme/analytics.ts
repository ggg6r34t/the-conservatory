import { trackEvent } from "@/services/analytics/analyticsService";
import type { SubscriptionTier } from "@/features/billing/types";

import type { ThemeAccess, ThemeId } from "./types";

export function trackThemeScreenViewed(properties?: {
  theme_id?: ThemeId;
  source?: string;
}) {
  trackEvent("theme_screen_viewed", properties ?? {});
}

export function trackThemeSelected(properties: {
  theme_id: ThemeId;
  previous_theme: ThemeId;
  new_theme: ThemeId;
  access?: ThemeAccess;
  subscription_tier?: SubscriptionTier;
  source?: string;
}) {
  trackEvent("theme_selected", properties);
}

export function trackThemeChanged(properties: {
  theme_id: ThemeId;
  previous_theme: ThemeId;
  new_theme: ThemeId;
  access?: ThemeAccess;
  subscription_tier?: SubscriptionTier;
  source?: string;
}) {
  trackEvent("theme_changed", properties);
}

export function trackPremiumThemeTapped(properties: {
  theme_id: ThemeId;
  previous_theme_id?: ThemeId;
  source?: string;
}) {
  trackEvent("premium_theme_tapped", properties);
}

export function trackPremiumThemeBlocked(properties: {
  theme_id: ThemeId;
  previous_theme_id?: ThemeId;
  reason?: string;
  source?: string;
}) {
  trackEvent("premium_theme_blocked", properties);
}

export function trackPremiumThemeUnlocked(properties: {
  theme_id: ThemeId;
  previous_theme_id?: ThemeId;
  subscription_tier?: SubscriptionTier;
  source?: string;
}) {
  trackEvent("premium_theme_unlocked", properties);
}

export function trackThemeRevertedAfterDowngrade(properties: {
  theme_id: ThemeId;
  previous_theme_id: ThemeId | string | null;
  source?: string;
}) {
  trackEvent("theme_reverted_after_downgrade", properties);
}

export function trackThemePreviewViewed(properties: { theme_id: ThemeId }) {
  trackEvent("theme_preview_viewed", properties);
}

export function trackThemeContrastIssueDetected(properties: {
  theme_id: ThemeId;
  previous_theme_id?: ThemeId;
  source?: string;
  notes?: string[];
}) {
  const { notes, ...rest } = properties;
  trackEvent("theme_contrast_issue_detected", {
    ...rest,
    notes: notes?.join(" | ") ?? null,
  });
}

export function trackThemeFallbackApplied(properties: {
  theme_id: ThemeId;
  previous_theme_id?: string | null;
  source?: string;
}) {
  trackEvent("theme_fallback_applied", properties);
}
