import { MockBillingAdapter } from '../adapters/MockBillingAdapter';
import { RevenueCatAdapter } from '../adapters/RevenueCatAdapter';
import type { BillingAdapter } from '../types';

function createAdapter(): BillingAdapter {
  if (process.env.NODE_ENV === 'test') {
    return new MockBillingAdapter('free');
  }
  return new RevenueCatAdapter();
}

export const billingClient: BillingAdapter = createAdapter();
