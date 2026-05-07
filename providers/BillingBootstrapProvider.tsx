import { type PropsWithChildren, useEffect } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { billingClient } from '@/features/billing/services/billingClient';
import { useBillingStore } from '@/features/billing/stores/useBillingStore';
import { initializeAnalytics } from '@/services/analytics/analyticsService';
import { setEntitlementState } from '@/services/entitlementState';

export function BillingBootstrapProvider({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useAuth();
  const setSubscriptionState = useBillingStore((s) => s.setSubscriptionState);
  const setOfferings = useBillingStore((s) => s.setOfferings);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setSubscriptionState({ tier: 'free', isLoading: false, expiresAt: null, period: null });
      setEntitlementState(false);
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setSubscriptionState({ isLoading: true });
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
      } catch {
        if (cancelled) return;
        setSubscriptionState({ isLoading: false });
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, setSubscriptionState, setOfferings]);

  return <>{children}</>;
}
