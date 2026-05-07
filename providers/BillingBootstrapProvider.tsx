import { type PropsWithChildren, useEffect } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { billingClient } from '@/features/billing/services/billingClient';
import {
  clearEntitlementCache,
  readEntitlementCache,
  resolveEffectiveTier,
  writeEntitlementCache,
} from '@/features/billing/services/entitlementCache';
import { useBillingStore } from '@/features/billing/stores/useBillingStore';
import type { SubscriptionState } from '@/features/billing/types';
import { initializeAnalytics, resetAnalyticsUser, trackMonetizationEvent } from '@/services/analytics/analyticsService';
import { retryDeferredPremiumPhotoBackups } from '@/services/database/photoBackupRetry';
import { setEntitlementState } from '@/services/entitlementState';

type ResolvedSubscriptionState = Omit<
  SubscriptionState,
  'isLoading' | 'isRestoring' | 'error'
>;

export function BillingBootstrapProvider({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useAuth();
  const setSubscriptionState = useBillingStore((s) => s.setSubscriptionState);
  const setOfferings = useBillingStore((s) => s.setOfferings);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setSubscriptionState({
        tier: 'free',
        isLoading: false,
        expiresAt: null,
        period: null,
        lastVerifiedAt: null,
        entitlementUnavailable: false,
      });
      setEntitlementState(false);
      resetAnalyticsUser();
      void clearEntitlementCache();
      return;
    }

    let cancelled = false;
    let cleanupSubscriptionListener: (() => void) | null = null;

    async function applyResolvedSubscriptionState(
      state: ResolvedSubscriptionState,
      isLoading: boolean,
    ) {
      if (cancelled) return;
      const lastVerifiedAt = new Date().toISOString();
      setSubscriptionState({
        ...state,
        isLoading,
        lastVerifiedAt,
        entitlementUnavailable: false,
      });
      setEntitlementState(state.tier === 'premium');
      if (state.tier === 'premium') {
        void retryDeferredPremiumPhotoBackups(user!.id);
      }
      await writeEntitlementCache({
        tier: state.tier,
        expiresAt: state.expiresAt,
        period: state.period,
        lastVerifiedAt,
      });
    }

    async function bootstrap() {
      setSubscriptionState({ isLoading: true });

      // Apply cached entitlement state before the network call so premium
      // features remain usable while offline or during slow RevenueCat init.
      const cached = await readEntitlementCache();
      if (cached && !cancelled) {
        const effectiveTier = resolveEffectiveTier(cached);
        setSubscriptionState({
          tier: effectiveTier,
          expiresAt: cached.expiresAt,
          period: cached.period,
          isLoading: true,
          lastVerifiedAt: cached.lastVerifiedAt,
          entitlementUnavailable: false,
        });
        setEntitlementState(effectiveTier === 'premium');
      }

      try {
        await billingClient.initialize(user!.id);
        if (cancelled) return;

        cleanupSubscriptionListener = billingClient.setSubscriptionStateListener?.(
          (state) => {
            void applyResolvedSubscriptionState(state, false);
            trackMonetizationEvent('entitlement_refresh', {
              source: 'revenuecat_customer_info',
              tier: state.tier,
            });
          },
        ) ?? null;

        const [state, offerings] = await Promise.all([
          billingClient.getSubscriptionState(),
          billingClient.getOfferings(),
        ]);

        if (cancelled) return;
        setOfferings(offerings);
        await applyResolvedSubscriptionState(state, false);
        initializeAnalytics(user!.id);
      } catch (err) {
        if (cancelled) return;
        setSubscriptionState({ isLoading: false, entitlementUnavailable: true });
        trackMonetizationEvent('billing_initialization_failed', {
          reason: err instanceof Error ? err.message : 'unknown',
        });
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      cleanupSubscriptionListener?.();
    };
  }, [isAuthenticated, user?.id, setSubscriptionState, setOfferings]);

  return <>{children}</>;
}
