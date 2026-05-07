import { create } from 'zustand';

import type { BillingOffering, SubscriptionState } from '../types';

interface BillingStoreState extends SubscriptionState {
  offerings: BillingOffering | null;
  setSubscriptionState: (
    state: Partial<Omit<BillingStoreState, 'setSubscriptionState' | 'setOfferings'>>,
  ) => void;
  setOfferings: (offerings: BillingOffering | null) => void;
}

export const useBillingStore = create<BillingStoreState>((set) => ({
  tier: 'free',
  isLoading: true,
  isRestoring: false,
  expiresAt: null,
  period: null,
  error: null,
  lastVerifiedAt: null,
  entitlementUnavailable: false,
  offerings: null,
  setSubscriptionState: (partial) => set((prev) => ({ ...prev, ...partial })),
  setOfferings: (offerings) => set({ offerings }),
}));
