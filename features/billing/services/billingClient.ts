import { MockBillingAdapter } from '../adapters/MockBillingAdapter';
import { RevenueCatAdapter } from '../adapters/RevenueCatAdapter';
import type { BillingAdapter } from '../types';

function shouldUseMockBilling(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  return (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    process.env.EXPO_PUBLIC_USE_MOCK_BILLING === 'true'
  );
}

function createAdapter(): BillingAdapter {
  if (shouldUseMockBilling()) {
    return new MockBillingAdapter('free');
  }
  return new RevenueCatAdapter();
}

export const billingClient: BillingAdapter = createAdapter();
