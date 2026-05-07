import { useCallback } from 'react';

import { billingClient } from '../services/billingClient';
import { useBillingStore } from '../stores/useBillingStore';
import type { PurchaseResult } from '../types';

export function useSubscription() {
  const store = useBillingStore();

  const purchase = useCallback(
    async (packageIdentifier: string): Promise<PurchaseResult> => {
      store.setSubscriptionState({ isLoading: true, error: null });
      const result = await billingClient.purchasePackage(packageIdentifier);

      if (result.success) {
        const state = await billingClient.getSubscriptionState();
        store.setSubscriptionState({ ...state, isLoading: false });
      } else if (!result.userCancelled) {
        store.setSubscriptionState({ isLoading: false, error: result.error ?? null });
      } else {
        store.setSubscriptionState({ isLoading: false });
      }

      return result;
    },
    [store],
  );

  const restore = useCallback(async (): Promise<PurchaseResult> => {
    store.setSubscriptionState({ isRestoring: true, error: null });
    const result = await billingClient.restorePurchases();

    const state = await billingClient.getSubscriptionState();
    store.setSubscriptionState({ ...state, isRestoring: false });

    return result;
  }, [store]);

  const refreshOfferings = useCallback(async () => {
    const offerings = await billingClient.getOfferings();
    store.setOfferings(offerings);
  }, [store]);

  return {
    isPremium: store.tier === 'premium',
    tier: store.tier,
    isLoading: store.isLoading,
    isRestoring: store.isRestoring,
    expiresAt: store.expiresAt,
    period: store.period,
    error: store.error,
    offerings: store.offerings,
    purchase,
    restore,
    refreshOfferings,
  };
}
