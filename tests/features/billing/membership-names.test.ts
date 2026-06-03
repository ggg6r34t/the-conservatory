import {
  getMembershipName,
  getMembershipNameForPackageType,
  MEMBERSHIP_NAMES,
} from '@/features/billing/membershipNames';

describe('membershipNames', () => {
  it('defines editorial names for every membership rhythm', () => {
    expect(MEMBERSHIP_NAMES).toEqual({
      free: 'The Seedling',
      monthly: 'The Steward',
      annual: 'The Heirloom',
      lifetime: 'The Endowment',
    });
  });

  it('returns The Seedling for free accounts', () => {
    expect(getMembershipName({ tier: 'free', period: null })).toBe(
      'The Seedling',
    );
  });

  it('returns period-specific names for premium accounts', () => {
    expect(
      getMembershipName({ tier: 'premium', period: 'monthly' }),
    ).toBe('The Steward');
    expect(getMembershipName({ tier: 'premium', period: 'annual' })).toBe(
      'The Heirloom',
    );
    expect(
      getMembershipName({ tier: 'premium', period: 'lifetime' }),
    ).toBe('The Endowment');
  });

  it('maps package types to membership names', () => {
    expect(getMembershipNameForPackageType('monthly')).toBe('The Steward');
    expect(getMembershipNameForPackageType('annual')).toBe('The Heirloom');
    expect(getMembershipNameForPackageType('lifetime')).toBe('The Endowment');
    expect(getMembershipNameForPackageType('unknown')).toBeNull();
  });
});
