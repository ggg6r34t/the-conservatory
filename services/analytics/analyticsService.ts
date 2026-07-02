import { Platform } from 'react-native';

import { env } from '@/config/env';

type AnalyticsMode = 'disabled' | 'debug-log' | 'production';

type PostHogClient = InstanceType<
  Awaited<typeof import('posthog-react-native')>['default']
>;

export function getAnalyticsMode(): AnalyticsMode {
  if (!env.posthogApiKey) return 'disabled';
  if (__DEV__ && !env.enableAnalytics) return 'debug-log';
  return 'production';
}

let posthog: PostHogClient | null = null;
let posthogInitPromise: Promise<void> | null = null;

async function loadPostHogClient(distinctId: string): Promise<void> {
  const { default: PostHog } = await import('posthog-react-native');
  posthog = new PostHog(env.posthogApiKey!, {
    host: env.posthogHost,
    captureAppLifecycleEvents: false,
  });
  posthog.identify(distinctId, { platform: Platform.OS });
}

export function initializeAnalytics(distinctId: string): void {
  const mode = getAnalyticsMode();
  if (mode !== 'production') return;

  if (!posthogInitPromise) {
    posthogInitPromise = loadPostHogClient(distinctId).catch((error) => {
      posthogInitPromise = null;
      if (__DEV__) {
        console.warn('[Analytics] PostHog init failed:', error);
      }
    });
  }
}

function captureWithPostHog(
  name: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  if (posthog) {
    posthog.capture(name, properties ?? {});
    return;
  }

  if (!posthogInitPromise) {
    return;
  }

  void posthogInitPromise.then(() => {
    posthog?.capture(name, properties ?? {});
  });
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

  captureWithPostHog(name, properties);
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
    | 'ai_care_schedule'
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
    | 'password_reset_requested'
    | 'password_reset_request_succeeded'
    | 'password_reset_request_failed'
    | 'password_reset_link_opened'
    | 'password_update_submitted'
    | 'password_update_succeeded'
    | 'password_update_failed'
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
    | 'import_collection_failed'
    | 'oauth_sign_in_started'
    | 'oauth_sign_in_cancelled'
    | 'oauth_sign_in_failed'
    | 'oauth_sign_in_succeeded'
    | 'oauth_callback_received'
    | 'oauth_profile_ensured',
  properties?: Record<string, string | number | boolean | null>,
): void {
  trackEvent(name, properties);
}

export function resetAnalyticsUser(): void {
  if (posthog) {
    posthog.reset();
    return;
  }

  void posthogInitPromise?.then(() => {
    posthog?.reset();
  });
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
