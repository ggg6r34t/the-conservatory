import { PREMIUM_PACKAGE_IDENTIFIERS } from '@/features/billing/constants';
import {
  buildBillingOffering,
  resolvePremiumOfferingPackages,
} from '@/features/billing/services/offeringPackageResolution';
import type { BillingPackage } from '@/features/billing/types';

function packageStub(
  identifier: string,
  packageType: BillingPackage['packageType'],
): BillingPackage {
  return {
    identifier,
    packageType,
    priceString: '$0.00',
    pricePerMonthString: '$0.00',
    productIdentifier: identifier,
    introductoryPrice: null,
  };
}

describe('offeringPackageResolution', () => {
  it('resolves monthly and annual packages by conservatory product identifiers', () => {
    const monthly = packageStub(
      PREMIUM_PACKAGE_IDENTIFIERS.monthly,
      'monthly',
    );
    const annual = packageStub(PREMIUM_PACKAGE_IDENTIFIERS.annual, 'annual');

    const resolved = resolvePremiumOfferingPackages([monthly, annual], {
      annual: null,
      monthly: null,
      lifetime: null,
    });

    expect(resolved.monthly).toEqual(monthly);
    expect(resolved.annual).toEqual(annual);
    expect(resolved.lifetime).toBeNull();
  });

  it('prefers RevenueCat slots when present, then falls back to conservatory ids', () => {
    const rcMonthly = packageStub('$rc_monthly', 'monthly');
    const rcAnnual = packageStub('$rc_annual', 'annual');
    const storeMonthly = packageStub(
      PREMIUM_PACKAGE_IDENTIFIERS.monthly,
      'monthly',
    );

    const resolved = resolvePremiumOfferingPackages([storeMonthly], {
      annual: rcAnnual,
      monthly: rcMonthly,
      lifetime: null,
    });

    expect(resolved.monthly).toEqual(rcMonthly);
    expect(resolved.annual).toEqual(rcAnnual);
  });

  it('builds launch offerings with only monthly and annual packages', () => {
    const monthly = packageStub(
      PREMIUM_PACKAGE_IDENTIFIERS.monthly,
      'monthly',
    );
    const annual = packageStub(PREMIUM_PACKAGE_IDENTIFIERS.annual, 'annual');
    const lifetime = packageStub('conservatory_premium_lifetime', 'lifetime');

    const offering = buildBillingOffering(
      'default',
      [monthly, annual, lifetime],
      {
        annual: null,
        monthly: null,
        lifetime: lifetime,
      },
    );

    expect(offering.packages).toEqual([annual, monthly]);
    expect(offering.lifetime).toBeNull();
  });
});
