import { useCallback } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { trackMonetizationEvent } from '@/services/analytics/analyticsService';
import { retryDeferredPremiumPhotoBackups } from '@/services/database/photoBackupRetry';
import { setEntitlementState } from '@/services/entitlementState';

import { writeEntitlementCache } from '../services/entitlementCache';
import { billingClient } from '../services/billingClient';
import { useBillingStore } from '../stores/useBillingStore';
import type { PurchaseResult, SubscriptionState } from '../types';

async function propagateEntitlementState(
  userId: string | undefined,
  state: Omit<SubscriptionState, 'isLoading' | 'isRestoring' | 'error'>,
) {
  const isPremium = state.tier === 'premium';
  setEntitlementState(isPremium);
  await writeEntitlementCache({
    tier: state.tier,
    expiresAt: state.expiresAt,
    period: state.period,
    lastVerifiedAt: new Date().toISOString(),
  });

  if (isPremium && userId) {
    void retryDeferredPremiumPhotoBackups(userId);
  }
}

export function useSubscription() {
  const { user } = useAuth();
  const store = useBillingStore();

  const purchase = useCallback(
    async (packageIdentifier: string): Promise<PurchaseResult> => {
      store.setSubscriptionState({ isLoading: true, error: null });
      const result = await billingClient.purchasePackage(packageIdentifier);

      if (result.success) {
        const state = await billingClient.getSubscriptionState();
        store.setSubscriptionState({
          ...state,
          isLoading: false,
          lastVerifiedAt: new Date().toISOString(),
          entitlementUnavailable: false,
        });
        await propagateEntitlementState(user?.id, state);
      } else if (!result.userCancelled) {
        store.setSubscriptionState({ isLoading: false, error: result.error ?? null });
      } else {
        store.setSubscriptionState({ isLoading: false });
      }

      return result;
    },
    [store, user?.id],
  );

  const restore = useCallback(async (): Promise<PurchaseResult> => {
    store.setSubscriptionState({ isRestoring: true, error: null });
    const result = await billingClient.restorePurchases();

    if (!result.success) {
      const error = result.error ?? 'Restore failed';
      store.setSubscriptionState({ isRestoring: false, error });
      trackMonetizationEvent('restore_failed', { reason: error });
      return result;
    }

    const state = await billingClient.getSubscriptionState();
    store.setSubscriptionState({
      ...state,
      isRestoring: false,
      lastVerifiedAt: new Date().toISOString(),
      entitlementUnavailable: false,
    });
    await propagateEntitlementState(user?.id, state);

    return result;
  }, [store, user?.id]);

  const refreshOfferings = useCallback(async () => {
    const offerings = await billingClient.getOfferings();
    store.setOfferings(offerings);
    if (!offerings || offerings.packages.length === 0) {
      trackMonetizationEvent('offerings_load_failed', {
        reason: 'empty_or_unavailable',
      });
    }
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
    lastVerifiedAt: store.lastVerifiedAt ?? null,
    entitlementUnavailable: store.entitlementUnavailable ?? false,
    purchase,
    restore,
    refreshOfferings,
  };
}
