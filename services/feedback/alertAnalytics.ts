import { trackEvent } from "@/services/analytics/analyticsService";

import type { AlertDialogVariant } from "@/components/feedback/AlertDialog/alert.types";

export function trackAppAlertShown(properties: {
  variant: AlertDialogVariant;
  analyticsKey?: string;
  sourceScreen?: string;
}): void {
  trackEvent("app_alert_shown", {
    variant: properties.variant,
    analytics_key: properties.analyticsKey ?? "unspecified",
    source_screen: properties.sourceScreen ?? "unspecified",
  });
}

export function trackAppAlertPrimaryAction(properties: {
  variant: AlertDialogVariant;
  analyticsKey?: string;
  sourceScreen?: string;
}): void {
  trackEvent("app_alert_primary_action", {
    variant: properties.variant,
    action_type: "primary",
    analytics_key: properties.analyticsKey ?? "unspecified",
    source_screen: properties.sourceScreen ?? "unspecified",
  });
}

export function trackAppAlertSecondaryAction(properties: {
  variant: AlertDialogVariant;
  analyticsKey?: string;
  sourceScreen?: string;
}): void {
  trackEvent("app_alert_secondary_action", {
    variant: properties.variant,
    action_type: "secondary",
    analytics_key: properties.analyticsKey ?? "unspecified",
    source_screen: properties.sourceScreen ?? "unspecified",
  });
}

export function trackAppAlertCancelled(properties: {
  variant: AlertDialogVariant;
  analyticsKey?: string;
  sourceScreen?: string;
}): void {
  trackEvent("app_alert_cancelled", {
    variant: properties.variant,
    analytics_key: properties.analyticsKey ?? "unspecified",
    source_screen: properties.sourceScreen ?? "unspecified",
  });
}

export function trackAppAlertDismissed(properties: {
  variant: AlertDialogVariant;
  analyticsKey?: string;
  sourceScreen?: string;
}): void {
  trackEvent("app_alert_dismissed", {
    variant: properties.variant,
    analytics_key: properties.analyticsKey ?? "unspecified",
    source_screen: properties.sourceScreen ?? "unspecified",
  });
}
