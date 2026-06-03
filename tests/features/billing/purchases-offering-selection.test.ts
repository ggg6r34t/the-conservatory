import { logEmptyOfferingsDiagnostics, resolvePurchasesOffering } from '@/features/billing/services/purchasesOfferingSelection';

describe('purchasesOfferingSelection', () => {
  const originalDev = (global as { __DEV__?: boolean }).__DEV__;

  beforeEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it('prefers offerings.current when present', () => {
    const current = {
      identifier: 'default',
      availablePackages: [{}],
    };

    expect(
      resolvePurchasesOffering({
        current,
        all: { default: current, promo: { identifier: 'promo', availablePackages: [] } },
      }),
    ).toBe(current);
  });

  it('falls back to configured offering identifier when current is missing', () => {
    const configured = {
      identifier: 'default',
      availablePackages: [{}],
    };

    expect(
      resolvePurchasesOffering({
        current: null,
        all: { default: configured },
      }),
    ).toBe(configured);
  });

  it('falls back to the only offering when current and configured id are missing', () => {
    const only = {
      identifier: 'launch',
      availablePackages: [{}],
    };

    expect(
      resolvePurchasesOffering({
        current: null,
        all: { launch: only },
      }),
    ).toBe(only);
  });

  it('returns null when no offering can be resolved', () => {
    expect(resolvePurchasesOffering({ current: null, all: {} })).toBeNull();
  });

  it('logs diagnostics helper for empty configured offering packages', () => {
    logEmptyOfferingsDiagnostics({
      current: null,
      all: {
        default: { identifier: 'default', availablePackages: [] },
      },
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Configured offering has 0 package(s).'),
    );
  });
});
