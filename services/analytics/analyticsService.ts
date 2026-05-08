import { Platform } from 'react-native';
import PostHog from 'posthog-react-native';

import { env } from '@/config/env';

type AnalyticsMode = 'disabled' | 'debug-log' | 'production';

export function getAnalyticsMode(): AnalyticsMode {
  if (!env.posthogApiKey) return 'disabled';
  if (__DEV__) return 'debug-log';
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
    | 'sync_item_abandoned',
  properties?: Record<string, string | number | boolean | null>,
): void {
  trackEvent(name, properties);
}

export function resetAnalyticsUser(): void {
  posthog?.reset();
}

export function getAnalyticsStatus() {
  return {
    mode: getAnalyticsMode(),
    productionReady: getAnalyticsMode() === 'production',
  };
}
