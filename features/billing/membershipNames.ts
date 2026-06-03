import type { SubscriptionPeriod, SubscriptionTier } from './types';

export const MEMBERSHIP_NAMES = {
  free: 'The Seedling',
  monthly: 'The Steward',
  annual: 'The Heirloom',
  lifetime: 'The Endowment',
} as const;

export type MembershipNameKey = keyof typeof MEMBERSHIP_NAMES;

export function getMembershipName(input: {
  tier: SubscriptionTier;
  period?: SubscriptionPeriod | null;
}): string {
  if (input.tier !== 'premium') {
    return MEMBERSHIP_NAMES.free;
  }

  switch (input.period) {
    case 'monthly':
      return MEMBERSHIP_NAMES.monthly;
    case 'annual':
      return MEMBERSHIP_NAMES.annual;
    case 'lifetime':
      return MEMBERSHIP_NAMES.lifetime;
    default:
      return MEMBERSHIP_NAMES.annual;
  }
}

export function getMembershipNameForPackageType(
  packageType: SubscriptionPeriod | 'unknown',
): string | null {
  switch (packageType) {
    case 'monthly':
      return MEMBERSHIP_NAMES.monthly;
    case 'annual':
      return MEMBERSHIP_NAMES.annual;
    case 'lifetime':
      return MEMBERSHIP_NAMES.lifetime;
    default:
      return null;
  }
}
