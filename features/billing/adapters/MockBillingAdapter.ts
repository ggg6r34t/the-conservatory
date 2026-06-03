import type {
  BillingAdapter,
  BillingOffering,
  BillingPackage,
  PurchaseResult,
  SubscriptionState,
} from '../types';
import { PREMIUM_PACKAGE_IDENTIFIERS } from '../constants';
import { buildBillingOffering } from '../services/offeringPackageResolution';

export class MockBillingAdapter implements BillingAdapter {
  private static readonly ANNUAL_PACKAGE: BillingPackage = {
    identifier: '$rc_annual',
    packageType: 'annual',
    priceString: '$44.99',
    pricePerMonthString: '$3.75',
    productIdentifier: PREMIUM_PACKAGE_IDENTIFIERS.annual,
    introductoryPrice: '7-day free trial',
  };

  private static readonly MONTHLY_PACKAGE: BillingPackage = {
    identifier: '$rc_monthly',
    packageType: 'monthly',
    priceString: '$6.99',
    pricePerMonthString: '$6.99',
    productIdentifier: PREMIUM_PACKAGE_IDENTIFIERS.monthly,
    introductoryPrice: null,
  };

  private tier: 'free' | 'premium';

  constructor(initialTier: 'free' | 'premium' = 'free') {
    this.tier = initialTier;
  }

  async initialize(_userId: string): Promise<void> {}

  async getSubscriptionState(): Promise<Omit<SubscriptionState, 'isLoading' | 'isRestoring' | 'error'>> {
    return {
      tier: this.tier,
      expiresAt: this.tier === 'premium' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      period: this.tier === 'premium' ? 'annual' : null,
      subscribedAt: this.tier === 'premium' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    };
  }

  async getOfferings(): Promise<BillingOffering | null> {
    const packages = [
      MockBillingAdapter.ANNUAL_PACKAGE,
      MockBillingAdapter.MONTHLY_PACKAGE,
    ];

    return buildBillingOffering('default', packages, {
      annual: MockBillingAdapter.ANNUAL_PACKAGE,
      monthly: MockBillingAdapter.MONTHLY_PACKAGE,
      lifetime: null,
    });
  }

  async purchasePackage(_packageIdentifier: string): Promise<PurchaseResult> {
    this.tier = 'premium';
    return { success: true, tier: 'premium' };
  }

  async restorePurchases(): Promise<PurchaseResult> {
    return { success: true, tier: this.tier };
  }

  setSubscriptionStateListener(
    _listener: (
      state: Omit<SubscriptionState, 'isLoading' | 'isRestoring' | 'error'>,
    ) => void,
  ): () => void {
    return () => {};
  }

  async logOut(): Promise<void> {
    this.tier = 'free';
  }

  /** Test helper: force tier */
  _setTier(tier: 'free' | 'premium') {
    this.tier = tier;
  }
}
