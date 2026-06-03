import {
  PREMIUM_LIFETIME_PACKAGE_IDENTIFIER,
  PREMIUM_PACKAGE_IDENTIFIERS,
} from '../constants';
import type { BillingOffering, BillingPackage } from '../types';

function findPackageByIdentifier(
  packages: BillingPackage[],
  identifier: string,
): BillingPackage | null {
  return (
    packages.find(
      (pkg) =>
        pkg.identifier === identifier || pkg.productIdentifier === identifier,
    ) ?? null
  );
}

export function resolvePremiumOfferingPackages(
  packages: BillingPackage[],
  slots: Pick<BillingOffering, 'annual' | 'monthly' | 'lifetime'>,
): Pick<BillingOffering, 'annual' | 'monthly' | 'lifetime'> {
  return {
    annual:
      slots.annual ??
      findPackageByIdentifier(packages, PREMIUM_PACKAGE_IDENTIFIERS.annual) ??
      packages.find((pkg) => pkg.packageType === 'annual') ??
      null,
    monthly:
      slots.monthly ??
      findPackageByIdentifier(packages, PREMIUM_PACKAGE_IDENTIFIERS.monthly) ??
      packages.find((pkg) => pkg.packageType === 'monthly') ??
      null,
    lifetime: null,
  };
}

export function buildBillingOffering(
  identifier: string,
  packages: BillingPackage[],
  slots: Pick<BillingOffering, 'annual' | 'monthly' | 'lifetime'>,
): BillingOffering {
  const resolved = resolvePremiumOfferingPackages(packages, slots);
  const launchPackages = [resolved.annual, resolved.monthly].filter(
    (pkg): pkg is BillingPackage => pkg !== null,
  );

  return {
    identifier,
    packages: launchPackages.length > 0 ? launchPackages : packages,
    ...resolved,
  };
}

export function isDeferredLifetimePackage(pkg: BillingPackage): boolean {
  return (
    pkg.identifier === PREMIUM_LIFETIME_PACKAGE_IDENTIFIER ||
    pkg.productIdentifier === PREMIUM_LIFETIME_PACKAGE_IDENTIFIER ||
    pkg.packageType === 'lifetime'
  );
}
