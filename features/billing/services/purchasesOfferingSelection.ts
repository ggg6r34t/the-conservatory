import { billingConfig } from '../config';
import type { BillingOffering } from '../types';

type PurchasesOfferingLike = {
  identifier: string;
  availablePackages: unknown[];
  annual?: unknown | null;
  monthly?: unknown | null;
  lifetime?: unknown | null;
};

type PurchasesOfferingsLike = {
  current: PurchasesOfferingLike | null;
  all: Record<string, PurchasesOfferingLike>;
};

export function resolvePurchasesOffering(
  offerings: PurchasesOfferingsLike,
): PurchasesOfferingLike | null {
  if (offerings.current) {
    return offerings.current;
  }

  const configured = offerings.all[billingConfig.offeringIdentifier];
  if (configured) {
    return configured;
  }

  const availableKeys = Object.keys(offerings.all ?? {});
  if (availableKeys.length === 1) {
    return offerings.all[availableKeys[0]!] ?? null;
  }

  return null;
}

export function logEmptyOfferingsDiagnostics(
  offerings: PurchasesOfferingsLike,
): void {
  if (!__DEV__) {
    return;
  }

  const availableKeys = Object.keys(offerings.all ?? {});
  const configuredOffering = offerings.all[billingConfig.offeringIdentifier];
  const packageCount = configuredOffering?.availablePackages.length ?? 0;

  console.warn(
    [
      '[Billing] RevenueCat returned no usable offering.',
      `Configured offering: "${billingConfig.offeringIdentifier}".`,
      `Current offering: ${offerings.current?.identifier ?? 'none'}.`,
      `Available offerings: ${availableKeys.length > 0 ? availableKeys.join(', ') : 'none'}.`,
      configuredOffering
        ? `Configured offering has ${packageCount} package(s).`
        : 'Configured offering was not found in offerings.all.',
      'Checklist: mark an offering as Current in RevenueCat, attach conservatory_premium_monthly and conservatory_premium_annual packages to entitlement "premium", and ensure App Store Connect / Play Console products exist with matching IDs.',
    ].join(' '),
  );
}

export function isEmptyBillingOffering(offering: BillingOffering | null): boolean {
  if (!offering) {
    return true;
  }

  return offering.packages.length === 0 && !offering.annual && !offering.monthly;
}
