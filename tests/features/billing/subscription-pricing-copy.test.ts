import {
  computeAnnualSavingsPercent,
  formatAnnualSavingsLabel,
} from '@/features/billing/services/subscriptionPricingCopy';
import type { BillingPackage } from '@/features/billing/types';

function packageStub(priceString: string): BillingPackage {
  return {
    identifier: 'pkg',
    packageType: 'monthly',
    priceString,
    pricePerMonthString: priceString,
    productIdentifier: 'product',
    introductoryPrice: null,
  };
}

describe('subscriptionPricingCopy', () => {
  it('computes annual savings from localized price strings', () => {
    const monthly = packageStub('$6.99');
    const annual = { ...packageStub('$44.99'), packageType: 'annual' as const };

    expect(computeAnnualSavingsPercent(monthly, annual)).toBe(46);
    expect(formatAnnualSavingsLabel(monthly, annual)).toBe('Save 46% vs monthly');
  });

  it('returns null when annual is not cheaper than twelve monthly payments', () => {
    const monthly = packageStub('$3.00');
    const annual = { ...packageStub('$40.00'), packageType: 'annual' as const };

    expect(computeAnnualSavingsPercent(monthly, annual)).toBeNull();
    expect(formatAnnualSavingsLabel(monthly, annual)).toBeNull();
  });

  it('returns null when prices cannot be parsed', () => {
    expect(
      computeAnnualSavingsPercent(packageStub('Contact us'), packageStub('$44.99')),
    ).toBeNull();
  });
});
