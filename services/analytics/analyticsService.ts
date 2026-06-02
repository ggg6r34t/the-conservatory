import { Platform } from 'react-native';
import PostHog from 'posthog-react-native';

import { env } from '@/config/env';

type AnalyticsMode = 'disabled' | 'debug-log' | 'production';

export function getAnalyticsMode(): AnalyticsMode {
  if (!env.posthogApiKey) return 'disabled';
  if (__DEV__ && !env.enableAnalytics) return 'debug-log';
  return 'production';
}

let posthog: PostHog | null = null;

export function initializeAnalytics(distinctId: string): void {
  const mode = getAnalyticsMode();
  if (mode !== 'production') return;

  posthog = new PostHog(env.posthogApiKey!, {
    host: env.posthogHost,
    captureAppLifecycleEvents: false,
  });
  posthog.identify(distinctId, { platform: Platform.OS });
}

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  const mode = getAnalyticsMode();
  if (mode === 'disabled') return;

  if (mode === 'debug-log') {
    if (__DEV__) {
      console.log('[Analytics]', name, properties ?? {});
    }
    return;
  }

  posthog?.capture(name, properties ?? {});
}

export function trackStreakEvent(
  name:
    | "streak_started"
    | "streak_extended"
    | "streak_maintained"
    | "streak_broken"
    | "streak_recovered",
  properties?: Record<string, string | number | boolean | null>,
): void {
  trackEvent(name, properties);
}

export function trackMonetizationEvent(
  name:
    | 'premium_screen_viewed'
    | 'plan_selected'
    | 'purchase_started'
    | 'purchase_completed'
    | 'purchase_cancelled'
    | 'purchase_failed'
    | 'restore_started'
    | 'restore_completed'
    | 'restore_failed'
    | 'upgrade_prompt_viewed'
    | 'upgrade_prompt_dismissed'
    | 'quota_reached'
    | 'ai_feature_used'
    | 'billing_initialization_failed'
    | 'offerings_load_failed'
    | 'entitlement_refresh'
    | 'sync_photo_deferred'
    | 'premium_deferred_photo_retry'
    | 'sync_item_abandoned'
    | 'sync_item_deleted_before_sync'
    | 'reminder_schedule_failed'
    | 'export_collection_started'
    | 'export_collection_completed'
    | 'export_collection_failed',
  properties?: Record<string, string | number | boolean | null>,
): void {
  trackEvent(name, properties);
}

export function trackAiFeatureUsed(
  feature:
    | 'ai_health_insight'
    | 'ai_journal_narrative'
    | 'ai_dashboard_editorial'
    | 'ai_archive_curation'
    | 'ai_species_identification',
  properties?: Record<string, string | number | boolean | null>,
): void {
  trackMonetizationEvent('ai_feature_used', {
    feature,
    ...properties,
  });
}

/** Product lifecycle events for GTM dashboards (PostHog funnels). */
export function trackGtmEvent(
  name:
    | 'user_signed_up'
    | 'user_logged_in'
    | 'app_session_started'
    | 'activation_first_plant_created'
    | 'subscription_activated'
    | 'subscription_downgraded'
    | 'backup_screen_viewed'
    | 'backup_sync_started'
    | 'backup_sync_completed'
    | 'backup_sync_failed'
    | 'backup_auto_sync_enabled'
    | 'backup_auto_sync_disabled'
    | 'import_collection_started'
    | 'import_collection_completed'
    | 'import_collection_failed',
  properties?: Record<string, string | number | boolean | null>,
): void {
  trackEvent(name, properties);
}

export function resetAnalyticsUser(): void {
  posthog?.reset();
}

export function getAnalyticsStatus() {
  const mode = getAnalyticsMode();
  return {
    mode,
    productionReady: mode === 'production',
    posthogConfigured: Boolean(env.posthogApiKey),
    analyticsExplicitlyEnabled: env.enableAnalytics,
  };
}
