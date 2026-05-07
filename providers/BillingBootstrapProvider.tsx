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
import { initializeAnalytics, resetAnalyticsUser, trackMonetizationEvent } from '@/services/analytics/analyticsService';
import { setEntitlementState } from '@/services/entitlementState';

export function BillingBootstrapProvider({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useAuth();
  const setSubscriptionState = useBillingStore((s) => s.setSubscriptionState);
  const setOfferings = useBillingStore((s) => s.setOfferings);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setSubscriptionState({ tier: 'free', isLoading: false, expiresAt: null, period: null });
      setEntitlementState(false);
      resetAnalyticsUser();
      void clearEntitlementCache();
      return;
    }

    let cancelled = false;

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
        });
        setEntitlementState(effectiveTier === 'premium');
      }

      try {
        await billingClient.initialize(user!.id);
        if (cancelled) return;

        const [state, offerings] = await Promise.all([
          billingClient.getSubscriptionState(),
          billingClient.getOfferings(),
        ]);

        if (cancelled) return;
        setSubscriptionState({ ...state, isLoading: false });
        setOfferings(offerings);
        setEntitlementState(state.tier === 'premium');
        initializeAnalytics(user!.id);
        await writeEntitlementCache({
          tier: state.tier,
          expiresAt: state.expiresAt,
          period: state.period,
          lastVerifiedAt: new Date().toISOString(),
        });
      } catch (err) {
        if (cancelled) return;
        setSubscriptionState({ isLoading: false });
        trackMonetizationEvent('billing_initialization_failed', {
          reason: err instanceof Error ? err.message : 'unknown',
        });
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, setSubscriptionState, setOfferings]);

  return <>{children}</>;
}
