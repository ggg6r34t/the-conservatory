import type {
  BillingAdapter,
  BillingOffering,
  PurchaseResult,
  SubscriptionState,
} from '../types';

export class MockBillingAdapter implements BillingAdapter {
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
    };
  }

  async getOfferings(): Promise<BillingOffering | null> {
    return {
      identifier: 'default',
      packages: [
        {
          identifier: '$rc_annual',
          packageType: 'annual',
          priceString: '$44.99',
          pricePerMonthString: '$3.75',
          productIdentifier: 'conservatory_premium_annual',
          introductoryPrice: '7 days free',
        },
        {
          identifier: '$rc_monthly',
          packageType: 'monthly',
          priceString: '$5.99',
          pricePerMonthString: '$5.99',
          productIdentifier: 'conservatory_premium_monthly',
          introductoryPrice: null,
        },
      ],
      annual: {
        identifier: '$rc_annual',
        packageType: 'annual',
        priceString: '$44.99',
        pricePerMonthString: '$3.75',
        productIdentifier: 'conservatory_premium_annual',
        introductoryPrice: '7 days free',
      },
      monthly: {
        identifier: '$rc_monthly',
        packageType: 'monthly',
        priceString: '$5.99',
        pricePerMonthString: '$5.99',
        productIdentifier: 'conservatory_premium_monthly',
        introductoryPrice: null,
      },
      lifetime: null,
    };
  }

  async purchasePackage(_packageIdentifier: string): Promise<PurchaseResult> {
    this.tier = 'premium';
    return { success: true, tier: 'premium' };
  }

  async restorePurchases(): Promise<PurchaseResult> {
    return { success: true, tier: this.tier };
  }

  async logOut(): Promise<void> {
    this.tier = 'free';
  }

  /** Test helper: force tier */
  _setTier(tier: 'free' | 'premium') {
    this.tier = tier;
  }
}
