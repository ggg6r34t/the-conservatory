import { trackEvent } from "@/services/analytics/analyticsService";

import type { ThemeId } from "./types";

export function trackThemeScreenViewed(properties?: {
  theme_id?: ThemeId;
}) {
  trackEvent("theme_screen_viewed", properties ?? {});
}

export function trackThemeSelected(properties: {
  theme_id: ThemeId;
  previous_theme: ThemeId;
  new_theme: ThemeId;
}) {
  trackEvent("theme_selected", properties);
}

export function trackThemeChanged(properties: {
  theme_id: ThemeId;
  previous_theme: ThemeId;
  new_theme: ThemeId;
}) {
  trackEvent("theme_changed", properties);
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
