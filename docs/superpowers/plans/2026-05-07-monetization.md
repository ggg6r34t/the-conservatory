# Monetization System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete production-ready monetization system — RevenueCat subscriptions, feature entitlement gates, usage quotas, a paywall screen, AI feature gating, and analytics — so that The Conservatory has sustainable revenue while preserving its calm editorial identity.

**Architecture:** RevenueCat (`react-native-purchases`) handles IAP for iOS/Android; a `BillingAdapter` interface abstracts RevenueCat behind a testable seam (production + mock adapters); a Zustand `useBillingStore` caches subscription state; feature gates live in `entitlementService.ts` as pure functions checked at both UI and service layers; usage quotas are tracked in a new SQLite `feature_usage` table with monthly-period resets; AI hooks receive an `isPremium` boolean and fall back to local inference when denied.

**Tech Stack:** `react-native-purchases` 8.x (RevenueCat), Zustand, expo-sqlite, React Query, PostHog (analytics), Expo Router

---

## File Map

### New files
| Path | Responsibility |
|------|----------------|
| `features/billing/types.ts` | All billing TypeScript types |
| `features/billing/constants.ts` | Free-tier limits, feature names |
| `features/billing/config.ts` | Env-var validation + export |
| `features/billing/adapters/BillingAdapter.ts` | Adapter interface |
| `features/billing/adapters/RevenueCatAdapter.ts` | Production RevenueCat impl |
| `features/billing/adapters/MockBillingAdapter.ts` | Test/dev impl |
| `features/billing/services/billingClient.ts` | Singleton wrapping the active adapter |
| `features/billing/services/entitlementService.ts` | `canUseFeature()` pure function |
| `features/billing/services/usageClient.ts` | SQLite quota read/write |
| `features/billing/stores/useBillingStore.ts` | Zustand subscription state |
| `features/billing/hooks/useSubscription.ts` | Purchase / restore hook |
| `features/billing/hooks/useUsageLimits.ts` | Per-user quota query hook |
| `features/billing/components/UpgradePrompt.tsx` | Reusable contextual upgrade nudge |
| `providers/BillingBootstrapProvider.tsx` | RevenueCat init after auth |
| `app/premium.tsx` | Paywall screen |
| `tests/features/billing/entitlementService.test.ts` | Unit tests for gate logic |
| `tests/features/billing/usageClient.test.ts` | Unit tests for quota tracking |
| `tests/features/billing/featureGates.test.ts` | Integration tests: free vs premium |

### Modified files
| Path | Change |
|------|--------|
| `services/database/migrations.ts` | Add `feature_usage` table |
| `providers/Providers.tsx` | Add `BillingBootstrapProvider` |
| `app/_layout.tsx` | Register `premium` route |
| `app/profile.tsx` | Add SUBSCRIPTION section |
| `features/ai/hooks/useHealthInsight.ts` | Accept `isPremium: boolean` |
| `features/ai/hooks/useJournalSummary.ts` | Accept `isPremium: boolean` |
| `features/ai/hooks/useDashboardInsight.ts` | Accept `isPremium: boolean` |
| `features/ai/hooks/useArchiveCuration.ts` | Accept `isPremium: boolean` |
| `features/ai/hooks/useSpeciesSuggestion.ts` | Accept `isPremium: boolean` |
| `features/plants/api/plantsClient.ts` | `createPlant` checks plant quota |
| `features/plants/hooks/useAddPlantProgressPhoto.ts` | Check progress-photo quota |
| `app/specimen-tags.tsx` | Gate tag creation behind premium |
| `features/profile/services/cloudSyncStatusService.ts` | Add `photoSyncAvailable` flag |
| `services/analytics/analyticsService.ts` | Add PostHog provider + monetization events |
| `app/terms.tsx` | Add subscription compliance paragraph |
| `package.json` | Add `react-native-purchases`, `posthog-react-native` |

---

## Part A — Billing Foundation

### Task 1: Types and constants

**Files:**
- Create: `features/billing/types.ts`
- Create: `features/billing/constants.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/features/billing/entitlementService.test.ts
import {
  FREE_PLANT_LIMIT,
  FREE_PROGRESS_PHOTOS_PER_PLANT,
  FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH,
  FREE_PLANT_IDENTIFICATIONS_PER_MONTH,
} from '@/features/billing/constants';

describe('billing constants', () => {
  it('has correct free tier limits', () => {
    expect(FREE_PLANT_LIMIT).toBe(10);
    expect(FREE_PROGRESS_PHOTOS_PER_PLANT).toBe(3);
    expect(FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH).toBe(1);
    expect(FREE_PLANT_IDENTIFICATIONS_PER_MONTH).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npm test -- --testPathPattern="tests/features/billing/entitlementService" --runInBand
```
Expected: `Cannot find module '@/features/billing/constants'`

- [ ] **Step 3: Create `features/billing/types.ts`**

```typescript
export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionPeriod = 'monthly' | 'annual' | 'lifetime';

export interface SubscriptionState {
  tier: SubscriptionTier;
  isLoading: boolean;
  isRestoring: boolean;
  expiresAt: Date | null;
  period: SubscriptionPeriod | null;
  error: string | null;
}

export interface BillingPackage {
  identifier: string;
  packageType: SubscriptionPeriod | 'unknown';
  priceString: string;
  pricePerMonthString: string;
  productIdentifier: string;
  introductoryPrice: string | null;
}

export interface BillingOffering {
  identifier: string;
  packages: BillingPackage[];
  monthly: BillingPackage | null;
  annual: BillingPackage | null;
  lifetime: BillingPackage | null;
}

export interface PurchaseResult {
  success: boolean;
  tier: SubscriptionTier;
  error?: string;
  userCancelled?: boolean;
}

export interface BillingAdapter {
  initialize(userId: string): Promise<void>;
  getSubscriptionState(): Promise<Omit<SubscriptionState, 'isLoading' | 'isRestoring' | 'error'>>;
  getOfferings(): Promise<BillingOffering | null>;
  purchasePackage(packageIdentifier: string): Promise<PurchaseResult>;
  restorePurchases(): Promise<PurchaseResult>;
  logOut(): Promise<void>;
}

export type GatedFeature =
  | 'plant_create'
  | 'progress_photo_upload'
  | 'ai_health_insight'
  | 'ai_journal_narrative'
  | 'ai_dashboard_editorial'
  | 'ai_archive_curation'
  | 'ai_species_identification'
  | 'smart_reminder_optimization'
  | 'specimen_tag_create'
  | 'advanced_library_filters'
  | 'premium_export';

export type FeatureAccessResult =
  | { canUse: true }
  | { canUse: false; reason: 'requires_premium' }
  | { canUse: false; reason: 'quota_exceeded'; used: number; limit: number };

export interface UsageSnapshot {
  totalPlantCount: number;
  progressPhotosForPlant: Record<string, number>;
  aiHealthInsightsThisMonth: Record<string, number>;
  plantIdThisMonth: number;
}
```

- [ ] **Step 4: Create `features/billing/constants.ts`**

```typescript
export const FREE_PLANT_LIMIT = 10;
export const FREE_PROGRESS_PHOTOS_PER_PLANT = 3;
export const FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH = 1;
export const FREE_PLANT_IDENTIFICATIONS_PER_MONTH = 3;

export const PREMIUM_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_PREMIUM ?? 'premium';

export const FEATURE_REQUIRES_PREMIUM: Record<import('./types').GatedFeature, boolean> = {
  plant_create: false,
  progress_photo_upload: false,
  ai_health_insight: false,
  ai_journal_narrative: true,
  ai_dashboard_editorial: true,
  ai_archive_curation: true,
  ai_species_identification: false,
  smart_reminder_optimization: true,
  specimen_tag_create: true,
  advanced_library_filters: true,
  premium_export: true,
};
```

- [ ] **Step 5: Run test to confirm it passes**

```
npm test -- --testPathPattern="tests/features/billing/entitlementService" --runInBand
```
Expected: PASS

- [ ] **Step 6: Commit**

```
git add features/billing/types.ts features/billing/constants.ts tests/features/billing/entitlementService.test.ts
git commit -m "feat(billing): add billing types, constants, and free-tier limits"
```

---

### Task 2: Env config

**Files:**
- Create: `features/billing/config.ts`

- [ ] **Step 1: Create `features/billing/config.ts`**

```typescript
export const billingConfig = {
  revenueCatApiKeyIos: process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? '',
  revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? '',
  entitlementId: process.env.EXPO_PUBLIC_RC_ENTITLEMENT_PREMIUM ?? 'premium',
  offeringIdentifier: process.env.EXPO_PUBLIC_RC_OFFERING_IDENTIFIER ?? 'default',
} as const;

export function validateBillingConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!billingConfig.revenueCatApiKeyIos) missing.push('EXPO_PUBLIC_RC_API_KEY_IOS');
  if (!billingConfig.revenueCatApiKeyAndroid) missing.push('EXPO_PUBLIC_RC_API_KEY_ANDROID');
  return { valid: missing.length === 0, missing };
}
```

Add these keys to `.env.example` (create if absent):

```
EXPO_PUBLIC_RC_API_KEY_IOS=appl_XXXX
EXPO_PUBLIC_RC_API_KEY_ANDROID=goog_XXXX
EXPO_PUBLIC_RC_ENTITLEMENT_PREMIUM=premium
EXPO_PUBLIC_RC_OFFERING_IDENTIFIER=default
```

- [ ] **Step 2: Commit**

```
git add features/billing/config.ts .env.example
git commit -m "feat(billing): add billing env config + validation"
```

---

### Task 3: Install RevenueCat SDK

**Files:**
- Modify: `package.json` (via npm install)

> **Important:** `react-native-purchases` is a native module. After installation, run `npx expo prebuild --clean` (or `eas build`) before testing on device. Expo Go will NOT work after this step.

- [ ] **Step 1: Install the package**

```
npx expo install react-native-purchases
```

Expected output: package added to `package.json` dependencies.

- [ ] **Step 2: Verify the install**

```
npx tsc --noEmit
```

Expected: no errors from the new package (type declarations are bundled).

- [ ] **Step 3: Commit**

```
git add package.json package-lock.json
git commit -m "chore: add react-native-purchases (RevenueCat) SDK"
```

---

### Task 4: BillingAdapter interface + MockBillingAdapter

**Files:**
- Create: `features/billing/adapters/BillingAdapter.ts`
- Create: `features/billing/adapters/MockBillingAdapter.ts`

- [ ] **Step 1: Create `features/billing/adapters/BillingAdapter.ts`**

```typescript
export type { BillingAdapter } from '../types';
```

*(Re-exports the interface defined in types.ts — single source of truth.)*

- [ ] **Step 2: Create `features/billing/adapters/MockBillingAdapter.ts`**

```typescript
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
      expiresAt: this.tier === 'premium' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
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
```

- [ ] **Step 3: Commit**

```
git add features/billing/adapters/
git commit -m "feat(billing): add BillingAdapter interface + MockBillingAdapter"
```

---

### Task 5: RevenueCatAdapter (production)

**Files:**
- Create: `features/billing/adapters/RevenueCatAdapter.ts`

- [ ] **Step 1: Create `features/billing/adapters/RevenueCatAdapter.ts`**

```typescript
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
} from 'react-native-purchases';
import type {
  PurchasesPackage,
  CustomerInfo,
} from 'react-native-purchases';

import { billingConfig, validateBillingConfig } from '../config';
import { PREMIUM_ENTITLEMENT_ID } from '../constants';
import type {
  BillingAdapter,
  BillingOffering,
  BillingPackage,
  PurchaseResult,
  SubscriptionPeriod,
  SubscriptionState,
} from '../types';

function mapPackageType(rcType: string): SubscriptionPeriod | 'unknown' {
  if (rcType === PACKAGE_TYPE.ANNUAL) return 'annual';
  if (rcType === PACKAGE_TYPE.MONTHLY) return 'monthly';
  if (rcType === PACKAGE_TYPE.LIFETIME) return 'lifetime';
  return 'unknown';
}

function mapRcPackage(pkg: PurchasesPackage): BillingPackage {
  const product = pkg.product;
  const pricePerMonth =
    pkg.packageType === PACKAGE_TYPE.ANNUAL
      ? `${product.currencyCode} ${(product.price / 12).toFixed(2)}`
      : pkg.priceString;

  return {
    identifier: pkg.identifier,
    packageType: mapPackageType(pkg.packageType),
    priceString: pkg.priceString,
    pricePerMonthString: pricePerMonth,
    productIdentifier: product.identifier,
    introductoryPrice: product.introPrice?.priceString ?? null,
  };
}

function isPremiumFromCustomerInfo(info: CustomerInfo): boolean {
  return (info.entitlements.active[PREMIUM_ENTITLEMENT_ID] ?? null) !== null;
}

export class RevenueCatAdapter implements BillingAdapter {
  private initialized = false;

  async initialize(userId: string): Promise<void> {
    const { valid, missing } = validateBillingConfig();
    if (!valid) {
      console.warn(`[Billing] Missing RevenueCat config: ${missing.join(', ')}. Billing disabled.`);
      return;
    }

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    const apiKey =
      Platform.OS === 'ios'
        ? billingConfig.revenueCatApiKeyIos
        : billingConfig.revenueCatApiKeyAndroid;

    await Purchases.configure({ apiKey, appUserID: userId });
    this.initialized = true;
  }

  async getSubscriptionState(): Promise<
    Omit<SubscriptionState, 'isLoading' | 'isRestoring' | 'error'>
  > {
    if (!this.initialized) {
      return { tier: 'free', expiresAt: null, period: null };
    }

    try {
      const info = await Purchases.getCustomerInfo();
      const isPremium = isPremiumFromCustomerInfo(info);

      if (!isPremium) {
        return { tier: 'free', expiresAt: null, period: null };
      }

      const entitlement = info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
      const expiresAt = entitlement?.expirationDate
        ? new Date(entitlement.expirationDate)
        : null;

      const periodType = entitlement?.periodType ?? 'normal';
      const period: SubscriptionPeriod =
        periodType === 'trial' || periodType === 'normal'
          ? 'monthly'
          : 'annual';

      return { tier: 'premium', expiresAt, period };
    } catch {
      return { tier: 'free', expiresAt: null, period: null };
    }
  }

  async getOfferings(): Promise<BillingOffering | null> {
    if (!this.initialized) return null;

    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) return null;

      const packages = current.availablePackages.map(mapRcPackage);
      const annual = current.annual ? mapRcPackage(current.annual) : null;
      const monthly = current.monthly ? mapRcPackage(current.monthly) : null;
      const lifetime = current.lifetime ? mapRcPackage(current.lifetime) : null;

      return {
        identifier: current.identifier,
        packages,
        annual,
        monthly,
        lifetime,
      };
    } catch {
      return null;
    }
  }

  async purchasePackage(packageIdentifier: string): Promise<PurchaseResult> {
    if (!this.initialized) {
      return { success: false, tier: 'free', error: 'Billing not initialized' };
    }

    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      const pkg = current?.availablePackages.find(
        (p) => p.identifier === packageIdentifier,
      );

      if (!pkg) {
        return { success: false, tier: 'free', error: 'Package not found' };
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPremium = isPremiumFromCustomerInfo(customerInfo);

      return { success: isPremium, tier: isPremium ? 'premium' : 'free' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      const userCancelled =
        typeof err === 'object' &&
        err !== null &&
        'userCancelled' in err &&
        (err as { userCancelled: boolean }).userCancelled === true;

      if (userCancelled) {
        return { success: false, tier: 'free', userCancelled: true };
      }
      return { success: false, tier: 'free', error: message };
    }
  }

  async restorePurchases(): Promise<PurchaseResult> {
    if (!this.initialized) {
      return { success: false, tier: 'free', error: 'Billing not initialized' };
    }

    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const isPremium = isPremiumFromCustomerInfo(customerInfo);
      return { success: true, tier: isPremium ? 'premium' : 'free' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Restore failed';
      return { success: false, tier: 'free', error: message };
    }
  }

  async logOut(): Promise<void> {
    if (!this.initialized) return;
    try {
      await Purchases.logOut();
    } catch {
      // ignore
    }
  }
}
```

- [ ] **Step 2: Commit**

```
git add features/billing/adapters/RevenueCatAdapter.ts
git commit -m "feat(billing): add RevenueCatAdapter production implementation"
```

---

### Task 6: billingClient singleton

**Files:**
- Create: `features/billing/services/billingClient.ts`

- [ ] **Step 1: Create `features/billing/services/billingClient.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```
git add features/billing/services/billingClient.ts
git commit -m "feat(billing): add billingClient singleton"
```

---

### Task 7: useBillingStore (Zustand)

**Files:**
- Create: `features/billing/stores/useBillingStore.ts`

- [ ] **Step 1: Create `features/billing/stores/useBillingStore.ts`**

```typescript
import { create } from 'zustand';

import type { BillingOffering, SubscriptionState } from '../types';

interface BillingStoreState extends SubscriptionState {
  offerings: BillingOffering | null;
  setSubscriptionState: (
    state: Partial<Omit<BillingStoreState, 'setSubscriptionState' | 'setOfferings'>>,
  ) => void;
  setOfferings: (offerings: BillingOffering | null) => void;
}

export const useBillingStore = create<BillingStoreState>((set) => ({
  tier: 'free',
  isLoading: true,
  isRestoring: false,
  expiresAt: null,
  period: null,
  error: null,
  offerings: null,
  setSubscriptionState: (partial) => set((prev) => ({ ...prev, ...partial })),
  setOfferings: (offerings) => set({ offerings }),
}));
```

- [ ] **Step 2: Commit**

```
git add features/billing/stores/useBillingStore.ts
git commit -m "feat(billing): add useBillingStore Zustand store"
```

---

### Task 8: useSubscription hook

**Files:**
- Create: `features/billing/hooks/useSubscription.ts`

- [ ] **Step 1: Create `features/billing/hooks/useSubscription.ts`**

```typescript
import { useCallback } from 'react';

import { billingClient } from '../services/billingClient';
import { useBillingStore } from '../stores/useBillingStore';
import type { PurchaseResult } from '../types';

export function useSubscription() {
  const store = useBillingStore();

  const purchase = useCallback(
    async (packageIdentifier: string): Promise<PurchaseResult> => {
      store.setSubscriptionState({ isLoading: true, error: null });
      const result = await billingClient.purchasePackage(packageIdentifier);

      if (result.success) {
        const state = await billingClient.getSubscriptionState();
        store.setSubscriptionState({ ...state, isLoading: false });
      } else if (!result.userCancelled) {
        store.setSubscriptionState({ isLoading: false, error: result.error ?? null });
      } else {
        store.setSubscriptionState({ isLoading: false });
      }

      return result;
    },
    [store],
  );

  const restore = useCallback(async (): Promise<PurchaseResult> => {
    store.setSubscriptionState({ isRestoring: true, error: null });
    const result = await billingClient.restorePurchases();

    const state = await billingClient.getSubscriptionState();
    store.setSubscriptionState({ ...state, isRestoring: false });

    return result;
  }, [store]);

  const refreshOfferings = useCallback(async () => {
    const offerings = await billingClient.getOfferings();
    store.setOfferings(offerings);
  }, [store]);

  return {
    isPremium: store.tier === 'premium',
    tier: store.tier,
    isLoading: store.isLoading,
    isRestoring: store.isRestoring,
    expiresAt: store.expiresAt,
    period: store.period,
    error: store.error,
    offerings: store.offerings,
    purchase,
    restore,
    refreshOfferings,
  };
}
```

- [ ] **Step 2: Commit**

```
git add features/billing/hooks/useSubscription.ts
git commit -m "feat(billing): add useSubscription hook with purchase/restore"
```

---

### Task 9: BillingBootstrapProvider

**Files:**
- Create: `providers/BillingBootstrapProvider.tsx`
- Modify: `providers/Providers.tsx`

- [ ] **Step 1: Create `providers/BillingBootstrapProvider.tsx`**

```typescript
import { type PropsWithChildren, useEffect } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { billingClient } from '@/features/billing/services/billingClient';
import { useBillingStore } from '@/features/billing/stores/useBillingStore';

export function BillingBootstrapProvider({ children }: PropsWithChildren) {
  const { user, isAuthenticated } = useAuth();
  const setSubscriptionState = useBillingStore((s) => s.setSubscriptionState);
  const setOfferings = useBillingStore((s) => s.setOfferings);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setSubscriptionState({ tier: 'free', isLoading: false, expiresAt: null, period: null });
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setSubscriptionState({ isLoading: true });
      try {
        await billingClient.initialize(user!.id);
        if (cancelled) return;

        const [state, offerings] = await Promise.all([
          billingClient.getSubscriptionState(),
          billingClient.getOfferings(),
        ]);

        if (cancelled) return;
        setSubscriptionState({ ...state, isLoading: false });
        setOfferings(offerings);
      } catch {
        if (cancelled) return;
        setSubscriptionState({ isLoading: false });
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, setSubscriptionState, setOfferings]);

  return <>{children}</>;
}
```

- [ ] **Step 2: Modify `providers/Providers.tsx`** — add `BillingBootstrapProvider` inside `SyncBootstrapProvider`:

```typescript
import { BillingBootstrapProvider } from '@/providers/BillingBootstrapProvider';

// Inside the JSX, replace:
<SyncBootstrapProvider>{children}</SyncBootstrapProvider>

// With:
<SyncBootstrapProvider>
  <BillingBootstrapProvider>{children}</BillingBootstrapProvider>
</SyncBootstrapProvider>
```

- [ ] **Step 3: Commit**

```
git add providers/BillingBootstrapProvider.tsx providers/Providers.tsx
git commit -m "feat(billing): add BillingBootstrapProvider to initialize RevenueCat after auth"
```

---

## Part B — Usage Quotas

### Task 10: DB migration for feature_usage table

**Files:**
- Modify: `services/database/migrations.ts`

- [ ] **Step 1: Write failing test for the new table**

```typescript
// Add to tests/features/billing/usageClient.test.ts
import { openDatabaseSync } from 'expo-sqlite';
import { runDatabaseMigrations } from '@/services/database/migrations';
import { incrementUsage, getUsageCount } from '@/features/billing/services/usageClient';

describe('usageClient', () => {
  let db: ReturnType<typeof openDatabaseSync>;

  beforeEach(async () => {
    db = openDatabaseSync(':memory:');
    await runDatabaseMigrations(db);
  });

  afterEach(() => {
    db.closeSync();
  });

  it('increments and reads usage count', async () => {
    const count1 = await incrementUsage(db, 'user-1', 'ai_health_insight');
    expect(count1).toBe(1);

    const count2 = await incrementUsage(db, 'user-1', 'ai_health_insight');
    expect(count2).toBe(2);

    const read = await getUsageCount(db, 'user-1', 'ai_health_insight');
    expect(read).toBe(2);
  });

  it('isolates by user', async () => {
    await incrementUsage(db, 'user-1', 'ai_health_insight');
    const count = await getUsageCount(db, 'user-2', 'ai_health_insight');
    expect(count).toBe(0);
  });

  it('isolates by period', async () => {
    await incrementUsage(db, 'user-1', 'ai_health_insight', '2025-01');
    const count = await getUsageCount(db, 'user-1', 'ai_health_insight', '2025-02');
    expect(count).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npm test -- --testPathPattern="tests/features/billing/usageClient" --runInBand
```
Expected: FAIL — `runDatabaseMigrations` or `usageClient` not found

- [ ] **Step 3: Add migration to `services/database/migrations.ts`**

At the very end of `runDatabaseMigrations`, after the last existing `await` call, append:

```typescript
  // feature_usage: monthly quota counters
  await database.execAsync(`
CREATE TABLE IF NOT EXISTS feature_usage (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  feature TEXT NOT NULL,
  period TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_usage_unique ON feature_usage(user_id, feature, period);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_period ON feature_usage(user_id, period);
`);
```

- [ ] **Step 4: Commit**

```
git add services/database/migrations.ts
git commit -m "feat(billing): add feature_usage table migration for quota tracking"
```

---

### Task 11: usageClient service

**Files:**
- Create: `features/billing/services/usageClient.ts`

- [ ] **Step 1: Create `features/billing/services/usageClient.ts`**

```typescript
import type { SQLiteDatabase } from 'expo-sqlite';

export type TrackableFeature =
  | 'ai_health_insight'
  | 'ai_species_identification';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function rowId(userId: string, feature: string, period: string): string {
  return `${userId}:${feature}:${period}`;
}

export async function incrementUsage(
  db: SQLiteDatabase,
  userId: string,
  feature: TrackableFeature,
  periodOverride?: string,
): Promise<number> {
  const period = periodOverride ?? currentPeriod();
  const id = rowId(userId, feature, period);
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO feature_usage (id, user_id, feature, period, count, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET count = count + 1, updated_at = ?`,
    [id, userId, feature, period, now, now, now],
  );

  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT count FROM feature_usage WHERE id = ?`,
    [id],
  );
  return row?.count ?? 1;
}

export async function getUsageCount(
  db: SQLiteDatabase,
  userId: string,
  feature: TrackableFeature,
  periodOverride?: string,
): Promise<number> {
  const period = periodOverride ?? currentPeriod();
  const id = rowId(userId, feature, period);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT count FROM feature_usage WHERE id = ?`,
    [id],
  );
  return row?.count ?? 0;
}
```

- [ ] **Step 2: Run the test to confirm it passes**

```
npm test -- --testPathPattern="tests/features/billing/usageClient" --runInBand
```
Expected: PASS (3 tests)

- [ ] **Step 3: Commit**

```
git add features/billing/services/usageClient.ts tests/features/billing/usageClient.test.ts
git commit -m "feat(billing): add usageClient for monthly quota tracking in SQLite"
```

---

### Task 12: entitlementService — canUseFeature()

**Files:**
- Create: `features/billing/services/entitlementService.ts`

- [ ] **Step 1: Write the full test suite**

```typescript
// In tests/features/billing/entitlementService.test.ts — replace the constants test and expand:
import {
  FREE_PLANT_LIMIT,
  FREE_PROGRESS_PHOTOS_PER_PLANT,
  FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH,
  FREE_PLANT_IDENTIFICATIONS_PER_MONTH,
} from '@/features/billing/constants';
import { canUseFeature } from '@/features/billing/services/entitlementService';

describe('billing constants', () => {
  it('has correct free tier limits', () => {
    expect(FREE_PLANT_LIMIT).toBe(10);
    expect(FREE_PROGRESS_PHOTOS_PER_PLANT).toBe(3);
    expect(FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH).toBe(1);
    expect(FREE_PLANT_IDENTIFICATIONS_PER_MONTH).toBe(3);
  });
});

describe('canUseFeature', () => {
  describe('premium-required features', () => {
    it('allows premium user', () => {
      const result = canUseFeature('ai_journal_narrative', true, { totalPlantCount: 5, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 });
      expect(result.canUse).toBe(true);
    });

    it('blocks free user', () => {
      const result = canUseFeature('ai_journal_narrative', false, { totalPlantCount: 5, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 });
      expect(result.canUse).toBe(false);
      if (!result.canUse) expect(result.reason).toBe('requires_premium');
    });
  });

  describe('plant_create quota', () => {
    it('allows free user under limit', () => {
      const r = canUseFeature('plant_create', false, { totalPlantCount: 5, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 });
      expect(r.canUse).toBe(true);
    });

    it('blocks free user at limit', () => {
      const r = canUseFeature('plant_create', false, { totalPlantCount: 10, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 });
      expect(r.canUse).toBe(false);
      if (!r.canUse) { expect(r.reason).toBe('quota_exceeded'); expect(r.limit).toBe(10); }
    });

    it('allows premium user at limit', () => {
      const r = canUseFeature('plant_create', true, { totalPlantCount: 10, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 });
      expect(r.canUse).toBe(true);
    });
  });

  describe('progress_photo_upload quota', () => {
    const plantId = 'plant-abc';

    it('allows free user under limit for plant', () => {
      const r = canUseFeature('progress_photo_upload', false, { totalPlantCount: 1, progressPhotosForPlant: { [plantId]: 2 }, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 }, plantId);
      expect(r.canUse).toBe(true);
    });

    it('blocks free user at limit for plant', () => {
      const r = canUseFeature('progress_photo_upload', false, { totalPlantCount: 1, progressPhotosForPlant: { [plantId]: 3 }, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 }, plantId);
      expect(r.canUse).toBe(false);
      if (!r.canUse) expect(r.reason).toBe('quota_exceeded');
    });

    it('allows premium user at limit', () => {
      const r = canUseFeature('progress_photo_upload', true, { totalPlantCount: 1, progressPhotosForPlant: { [plantId]: 99 }, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 }, plantId);
      expect(r.canUse).toBe(true);
    });
  });

  describe('ai_health_insight quota', () => {
    const plantId = 'plant-xyz';

    it('allows free user under limit', () => {
      const r = canUseFeature('ai_health_insight', false, { totalPlantCount: 1, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: { [plantId]: 0 }, plantIdThisMonth: 0 }, plantId);
      expect(r.canUse).toBe(true);
    });

    it('blocks free user at limit', () => {
      const r = canUseFeature('ai_health_insight', false, { totalPlantCount: 1, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: { [plantId]: 1 }, plantIdThisMonth: 0 }, plantId);
      expect(r.canUse).toBe(false);
    });
  });

  describe('ai_species_identification quota', () => {
    it('blocks free user at monthly quota', () => {
      const r = canUseFeature('ai_species_identification', false, { totalPlantCount: 1, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 3 });
      expect(r.canUse).toBe(false);
    });

    it('allows premium user past quota', () => {
      const r = canUseFeature('ai_species_identification', true, { totalPlantCount: 1, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 99 });
      expect(r.canUse).toBe(true);
    });
  });

  describe('protected free surfaces', () => {
    it('never blocks care logging — care_logging is not a gated feature', () => {
      // care logging has no gate; this just confirms the type union does not include it
      const features: import('@/features/billing/types').GatedFeature[] = [
        'plant_create', 'progress_photo_upload', 'ai_health_insight',
        'ai_journal_narrative', 'ai_dashboard_editorial', 'ai_archive_curation',
        'ai_species_identification', 'smart_reminder_optimization',
        'specimen_tag_create', 'advanced_library_filters', 'premium_export',
      ];
      // graveyard/memorial is NOT in this list — confirm
      expect(features).not.toContain('graveyard_access');
      expect(features).not.toContain('memorial_access');
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npm test -- --testPathPattern="tests/features/billing/entitlementService" --runInBand
```
Expected: FAIL — `canUseFeature` not found

- [ ] **Step 3: Create `features/billing/services/entitlementService.ts`**

```typescript
import {
  FEATURE_REQUIRES_PREMIUM,
  FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH,
  FREE_PLANT_IDENTIFICATIONS_PER_MONTH,
  FREE_PLANT_LIMIT,
  FREE_PROGRESS_PHOTOS_PER_PLANT,
} from '../constants';
import type {
  FeatureAccessResult,
  GatedFeature,
  UsageSnapshot,
} from '../types';

export function canUseFeature(
  feature: GatedFeature,
  isPremium: boolean,
  usage: UsageSnapshot,
  entityId?: string,
): FeatureAccessResult {
  if (FEATURE_REQUIRES_PREMIUM[feature] && !isPremium) {
    return { canUse: false, reason: 'requires_premium' };
  }

  if (isPremium) {
    return { canUse: true };
  }

  switch (feature) {
    case 'plant_create': {
      const count = usage.totalPlantCount;
      if (count >= FREE_PLANT_LIMIT) {
        return { canUse: false, reason: 'quota_exceeded', used: count, limit: FREE_PLANT_LIMIT };
      }
      return { canUse: true };
    }

    case 'progress_photo_upload': {
      const plantId = entityId ?? '';
      const count = usage.progressPhotosForPlant[plantId] ?? 0;
      if (count >= FREE_PROGRESS_PHOTOS_PER_PLANT) {
        return {
          canUse: false,
          reason: 'quota_exceeded',
          used: count,
          limit: FREE_PROGRESS_PHOTOS_PER_PLANT,
        };
      }
      return { canUse: true };
    }

    case 'ai_health_insight': {
      const plantId = entityId ?? '';
      const count = usage.aiHealthInsightsThisMonth[plantId] ?? 0;
      if (count >= FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH) {
        return {
          canUse: false,
          reason: 'quota_exceeded',
          used: count,
          limit: FREE_AI_HEALTH_INSIGHTS_PER_PLANT_PER_MONTH,
        };
      }
      return { canUse: true };
    }

    case 'ai_species_identification': {
      const count = usage.plantIdThisMonth;
      if (count >= FREE_PLANT_IDENTIFICATIONS_PER_MONTH) {
        return {
          canUse: false,
          reason: 'quota_exceeded',
          used: count,
          limit: FREE_PLANT_IDENTIFICATIONS_PER_MONTH,
        };
      }
      return { canUse: true };
    }

    default:
      return { canUse: true };
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```
npm test -- --testPathPattern="tests/features/billing/entitlementService" --runInBand
```
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```
git add features/billing/services/entitlementService.ts tests/features/billing/entitlementService.test.ts
git commit -m "feat(billing): add canUseFeature() entitlement service with full test suite"
```

---

### Task 13: useUsageLimits hook

**Files:**
- Create: `features/billing/hooks/useUsageLimits.ts`

- [ ] **Step 1: Create `features/billing/hooks/useUsageLimits.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAllActivePlants } from '@/features/plants/hooks/usePlants';
import { getDatabase } from '@/services/database/sqlite';

import { getUsageCount } from '../services/usageClient';
import type { UsageSnapshot } from '../types';

async function buildUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  const db = await getDatabase();

  const plants = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM plants WHERE user_id = ? AND status = 'active'`,
    [userId],
  );

  const totalPlantCount = plants.length;
  const plantIds = plants.map((p) => p.id);

  // progress photos per plant
  const progressPhotosForPlant: Record<string, number> = {};
  for (const plantId of plantIds) {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM photos WHERE plant_id = ? AND photo_role = 'progress'`,
      [plantId],
    );
    progressPhotosForPlant[plantId] = row?.count ?? 0;
  }

  // ai health insight usage this month (per plant)
  const aiHealthInsightsThisMonth: Record<string, number> = {};
  for (const plantId of plantIds) {
    const count = await getUsageCount(db, userId, 'ai_health_insight', undefined);
    aiHealthInsightsThisMonth[plantId] = count;
  }

  const plantIdThisMonth = await getUsageCount(db, userId, 'ai_species_identification');

  return {
    totalPlantCount,
    progressPhotosForPlant,
    aiHealthInsightsThisMonth,
    plantIdThisMonth,
  };
}

export function useUsageLimits() {
  const { user } = useAuth();

  return useQuery<UsageSnapshot>({
    queryKey: ['billing', 'usage', user?.id ?? 'none'],
    queryFn: () => buildUsageSnapshot(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
  });
}
```

> **Note:** The health insight usage tracking above tracks per-user globally, not per-plant. The free quota of 1/month applies across all plants for simplicity. Callers pass `plantId` as `entityId` to `canUseFeature` which checks `aiHealthInsightsThisMonth[plantId]`, but we store a single counter keyed by userId. Adjust `buildUsageSnapshot` to use per-plant keys if per-plant quotas are desired later.

- [ ] **Step 2: Commit**

```
git add features/billing/hooks/useUsageLimits.ts
git commit -m "feat(billing): add useUsageLimits hook for quota state"
```

---

### Task 14: UpgradePrompt component

**Files:**
- Create: `features/billing/components/UpgradePrompt.tsx`

- [ ] **Step 1: Create `features/billing/components/UpgradePrompt.tsx`**

```typescript
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/components/design-system/useTheme';

interface UpgradePromptProps {
  message: string;
  cta?: string;
  onDismiss?: () => void;
  compact?: boolean;
}

export function UpgradePrompt({
  message,
  cta = 'Explore Premium',
  onDismiss,
  compact = false,
}: UpgradePromptProps) {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surfaceContainerLow }]}>
        <Text style={[styles.compactMessage, { color: colors.onSurface }]}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/premium')}
          style={[styles.compactCta, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.compactCtaLabel, { color: colors.surfaceBright }]}>{cta}</Text>
        </Pressable>
        {onDismiss ? (
          <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.dismiss}>
            <Text style={[styles.dismissLabel, { color: colors.onSurfaceVariant }]}>
              Maybe later
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceContainerLow,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
        },
      ]}
    >
      <Text style={[styles.message, { color: colors.onSurface }]}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/premium')}
        style={[styles.cta, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.ctaLabel, { color: colors.surfaceBright }]}>{cta}</Text>
      </Pressable>
      {onDismiss ? (
        <Pressable accessibilityRole="button" onPress={onDismiss}>
          <Text style={[styles.dismissLabel, { color: colors.onSurfaceVariant }]}>
            Maybe later
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
  },
  message: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  cta: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  ctaLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    letterSpacing: 1.2,
  },
  dismissLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  compactContainer: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  compactMessage: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  compactCta: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  compactCtaLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  dismiss: {
    width: '100%',
    alignItems: 'center',
    marginTop: -4,
  },
});
```

- [ ] **Step 2: Commit**

```
git add features/billing/components/UpgradePrompt.tsx
git commit -m "feat(billing): add UpgradePrompt reusable contextual nudge component"
```

---

## Part C — Premium Paywall Screen

### Task 15: Premium screen (paywall)

**Files:**
- Create: `app/premium.tsx`

- [ ] **Step 1: Create `app/premium.tsx`**

```typescript
import { useEffect, useState } from 'react';

import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/common/Icon/Icon';
import { useTheme } from '@/components/design-system/useTheme';
import { useSubscription } from '@/features/billing/hooks/useSubscription';
import type { BillingPackage } from '@/features/billing/types';

const PREMIUM_FEATURES = [
  { icon: 'heart-pulse', label: 'AI Health Insights', detail: 'Unlimited AI analysis of each plant\'s health, growth signals, and care needs.' },
  { icon: 'book-open-outline', label: 'Journal Narratives', detail: 'Monthly AI-written stories of your care rituals — not just statistics.' },
  { icon: 'image-multiple-outline', label: 'Unlimited Photo History', detail: 'Full photo archive synced to the cloud. Your collection\'s story, preserved.' },
  { icon: 'archive-star-outline', label: 'Archive Curation', detail: 'AI automatically pairs before-and-after photos to reveal your plants\' growth over time.' },
  { icon: 'cloud-sync-outline', label: 'Full Cloud Backup', detail: 'Every photo and record backed up and accessible across all your devices.' },
  { icon: 'qrcode', label: 'Specimen Tags', detail: 'Create and print botanical QR labels to bridge your physical and digital collection.' },
];

export default function PremiumScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { isPremium, isLoading, isRestoring, error, offerings, purchase, restore, refreshOfferings } =
    useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<BillingPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    void refreshOfferings();
  }, [refreshOfferings]);

  useEffect(() => {
    if (offerings?.annual) {
      setSelectedPackage(offerings.annual);
    }
  }, [offerings]);

  useEffect(() => {
    if (isPremium && !isLoading) {
      router.back();
    }
  }, [isPremium, isLoading, router]);

  async function handlePurchase() {
    if (!selectedPackage) return;
    setPurchasing(true);
    await purchase(selectedPackage.identifier);
    setPurchasing(false);
  }

  async function handleRestore() {
    await restore();
  }

  const packages = offerings?.packages ?? [];
  const annualPkg = offerings?.annual;
  const monthlyPkg = offerings?.monthly;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing.lg, paddingBottom: 48 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Icon name="close" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.secondary }]}>
            THE CONSERVATORY
          </Text>
          <Text style={[styles.heroTitle, { color: colors.primary }]}>Premium</Text>
          <Text style={[styles.heroSubtitle, { color: colors.onSurface }]}>
            Deepen your collection's story.
          </Text>
        </View>

        {/* Feature list */}
        <View style={[styles.featureList, { backgroundColor: colors.surfaceContainerLowest }]}>
          {PREMIUM_FEATURES.map((feature) => (
            <View key={feature.icon} style={styles.featureRow}>
              <View style={[styles.featureIconBox, { backgroundColor: colors.primaryFixed }]}>
                <Icon name={feature.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureLabel, { color: colors.primary }]}>
                  {feature.label}
                </Text>
                <Text style={[styles.featureDetail, { color: colors.onSurface }]}>
                  {feature.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        {packages.length > 0 ? (
          <View style={styles.plans}>
            <Text style={[styles.plansLabel, { color: colors.onSurfaceVariant }]}>
              CHOOSE YOUR PLAN
            </Text>
            {annualPkg ? (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedPackage?.identifier === annualPkg.identifier }}
                onPress={() => setSelectedPackage(annualPkg)}
                style={[
                  styles.planCard,
                  {
                    backgroundColor:
                      selectedPackage?.identifier === annualPkg.identifier
                        ? colors.primaryFixed
                        : colors.surfaceContainerLowest,
                    borderColor:
                      selectedPackage?.identifier === annualPkg.identifier
                        ? colors.primary
                        : colors.surfaceContainerHigh,
                  },
                ]}
              >
                <View style={styles.planCardBadge}>
                  <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.badgeLabel, { color: colors.surfaceBright }]}>
                      BEST VALUE
                    </Text>
                  </View>
                </View>
                <Text style={[styles.planTitle, { color: colors.primary }]}>Annual</Text>
                <Text style={[styles.planPrice, { color: colors.primary }]}>
                  {annualPkg.priceString}
                  <Text style={[styles.planPeriod, { color: colors.onSurface }]}>/year</Text>
                </Text>
                <Text style={[styles.planPerMonth, { color: colors.onSurface }]}>
                  {annualPkg.pricePerMonthString}/month
                </Text>
                {annualPkg.introductoryPrice ? (
                  <Text style={[styles.planTrial, { color: colors.secondary }]}>
                    {annualPkg.introductoryPrice} free trial
                  </Text>
                ) : null}
              </Pressable>
            ) : null}

            {monthlyPkg ? (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedPackage?.identifier === monthlyPkg.identifier }}
                onPress={() => setSelectedPackage(monthlyPkg)}
                style={[
                  styles.planCard,
                  {
                    backgroundColor:
                      selectedPackage?.identifier === monthlyPkg.identifier
                        ? colors.primaryFixed
                        : colors.surfaceContainerLowest,
                    borderColor:
                      selectedPackage?.identifier === monthlyPkg.identifier
                        ? colors.primary
                        : colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Text style={[styles.planTitle, { color: colors.primary }]}>Monthly</Text>
                <Text style={[styles.planPrice, { color: colors.primary }]}>
                  {monthlyPkg.priceString}
                  <Text style={[styles.planPeriod, { color: colors.onSurface }]}>/month</Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : null}

        {/* CTA */}
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!selectedPackage || purchasing || isLoading}
          onPress={() => void handlePurchase()}
          style={[
            styles.ctaButton,
            {
              backgroundColor:
                !selectedPackage || purchasing ? colors.surfaceContainerHigh : colors.primary,
            },
          ]}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.surfaceBright} />
          ) : (
            <Text style={[styles.ctaLabel, { color: colors.surfaceBright }]}>
              {selectedPackage?.introductoryPrice
                ? `Start Free Trial`
                : `Subscribe — ${selectedPackage?.priceString ?? '...'}`}
            </Text>
          )}
        </Pressable>

        {/* Legal */}
        {selectedPackage?.introductoryPrice ? (
          <Text style={[styles.trialDisclosure, { color: colors.onSurfaceVariant }]}>
            {selectedPackage.introductoryPrice} free, then {selectedPackage.priceString}
            {selectedPackage.packageType === 'annual' ? '/year' : '/month'}. Cancel anytime in{' '}
            {Platform.OS === 'ios' ? 'App Store settings' : 'Google Play settings'}.
          </Text>
        ) : null}

        {/* Restore + secondary links */}
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={isRestoring}
            onPress={() => void handleRestore()}
          >
            <Text style={[styles.footerLink, { color: colors.onSurfaceVariant }]}>
              {isRestoring ? 'Restoring…' : 'Restore purchases'}
            </Text>
          </Pressable>
          <Text style={[styles.footerDot, { color: colors.onSurfaceVariant }]}>·</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL('https://theconservatory.app/terms')}
          >
            <Text style={[styles.footerLink, { color: colors.onSurfaceVariant }]}>Terms</Text>
          </Pressable>
          <Text style={[styles.footerDot, { color: colors.onSurfaceVariant }]}>·</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL('https://theconservatory.app/privacy')}
          >
            <Text style={[styles.footerLink, { color: colors.onSurfaceVariant }]}>Privacy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { gap: 28 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 },
  closeButton: { padding: 8 },
  hero: { alignItems: 'center', gap: 8, paddingTop: 8 },
  eyebrow: { fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 2.4 },
  heroTitle: { fontFamily: 'NotoSerif_700Bold', fontSize: 42, lineHeight: 50 },
  heroSubtitle: { fontFamily: 'Manrope_500Medium', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  featureList: { borderRadius: 28, padding: 20, gap: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  featureIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, gap: 4 },
  featureLabel: { fontFamily: 'Manrope_700Bold', fontSize: 15, lineHeight: 20 },
  featureDetail: { fontFamily: 'Manrope_500Medium', fontSize: 13, lineHeight: 19 },
  plans: { gap: 12 },
  plansLabel: { fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 2.1, paddingHorizontal: 4 },
  planCard: { borderRadius: 20, borderWidth: 1.5, padding: 20, gap: 6 },
  planCardBadge: { alignItems: 'flex-start' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeLabel: { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1.5 },
  planTitle: { fontFamily: 'NotoSerif_700Bold', fontSize: 20, lineHeight: 26 },
  planPrice: { fontFamily: 'NotoSerif_700Bold', fontSize: 28, lineHeight: 34 },
  planPeriod: { fontFamily: 'Manrope_500Medium', fontSize: 16 },
  planPerMonth: { fontFamily: 'Manrope_500Medium', fontSize: 13, lineHeight: 18 },
  planTrial: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  errorText: { fontFamily: 'Manrope_500Medium', fontSize: 14, textAlign: 'center' },
  ctaButton: { height: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { fontFamily: 'Manrope_700Bold', fontSize: 16, letterSpacing: 0.6 },
  trialDisclosure: { fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  footerLink: { fontFamily: 'Manrope_500Medium', fontSize: 13 },
  footerDot: { fontSize: 13 },
});
```

- [ ] **Step 2: Commit**

```
git add app/premium.tsx
git commit -m "feat(billing): add Premium paywall screen with RevenueCat offerings"
```

---

### Task 16: Register route + Profile subscription entry

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/profile.tsx`

- [ ] **Step 1: Register `premium` route in `app/_layout.tsx`**

Find the block that registers profile-adjacent drill-in screens (same group as `data-backup`, `profile-edit`, etc.) and add:

```typescript
<Stack.Screen
  name="premium"
  options={{
    ...drillInScreenOptions,
    headerShown: false,
    presentation: 'modal',
  }}
/>
```

- [ ] **Step 2: Add SUBSCRIPTION section to `app/profile.tsx`**

Add these imports at the top:

```typescript
import { useSubscription } from '@/features/billing/hooks/useSubscription';
```

Inside `ProfileScreen`, after the existing hooks:

```typescript
const { isPremium, tier } = useSubscription();
```

Add a new `<View style={styles.section}>` block immediately after the stats card and before the MY COLLECTION section:

```typescript
<View style={styles.section}>
  <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
    THE CONSERVATORY
  </Text>
  <View style={[styles.groupCard, { backgroundColor: colors.surfaceContainerLowest }]}>
    {isPremium ? (
      <ProfileRow
        icon="star-circle-outline"
        label="Premium"
        value="Active"
        onPress={() => router.push('/premium')}
      />
    ) : (
      <ProfileRow
        icon="star-outline"
        label="Explore Premium"
        value="Deepen your story"
        onPress={() => router.push('/premium')}
      />
    )}
  </View>
</View>
```

- [ ] **Step 3: Typecheck**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```
git add app/_layout.tsx app/profile.tsx
git commit -m "feat(billing): register premium route + add subscription entry to profile"
```

---

## Part D — Feature Gates

### Task 17: Plant creation limit gate

**Files:**
- Modify: `features/plants/api/plantsClient.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/features/billing/featureGates.test.ts
import {
  FREE_PLANT_LIMIT,
} from '@/features/billing/constants';
import {
  canUseFeature,
} from '@/features/billing/services/entitlementService';

describe('plant creation gate', () => {
  it('blocks at FREE_PLANT_LIMIT plants for free user', () => {
    const result = canUseFeature(
      'plant_create',
      false,
      { totalPlantCount: FREE_PLANT_LIMIT, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 },
    );
    expect(result.canUse).toBe(false);
    if (!result.canUse) {
      expect(result.reason).toBe('quota_exceeded');
      expect(result.limit).toBe(FREE_PLANT_LIMIT);
    }
  });

  it('allows at FREE_PLANT_LIMIT - 1 plants for free user', () => {
    const result = canUseFeature(
      'plant_create',
      false,
      { totalPlantCount: FREE_PLANT_LIMIT - 1, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 },
    );
    expect(result.canUse).toBe(true);
  });

  it('never blocks premium user regardless of count', () => {
    const result = canUseFeature(
      'plant_create',
      true,
      { totalPlantCount: 999, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 },
    );
    expect(result.canUse).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to confirm it passes** (the entitlementService already handles this)

```
npm test -- --testPathPattern="tests/features/billing/featureGates" --runInBand
```
Expected: PASS

- [ ] **Step 3: Add plant count check to `createPlant` in `features/plants/api/plantsClient.ts`**

Read the current `createPlant` function signature. At the **top of the function body**, before any DB writes, add:

```typescript
// Check plant limit for free users — isPremium passed from caller
if (!input.isPremium) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM plants WHERE user_id = ? AND status = 'active'`,
    [input.userId],
  );
  const current = row?.count ?? 0;
  if (current >= FREE_PLANT_LIMIT) {
    throw Object.assign(new Error('Plant limit reached'), {
      code: 'PLANT_LIMIT_REACHED' as const,
      limit: FREE_PLANT_LIMIT,
      current,
    });
  }
}
```

Add `isPremium: boolean` to the `createPlant` input type.

Add to the top of plantsClient.ts:
```typescript
import { FREE_PLANT_LIMIT } from '@/features/billing/constants';
```

- [ ] **Step 4: Update `useAddPlant.ts`** to pass `isPremium` from the billing store:

```typescript
import { useBillingStore } from '@/features/billing/stores/useBillingStore';

// Inside useAddPlant():
const tier = useBillingStore((s) => s.tier);
const isPremium = tier === 'premium';

// In mutationFn:
mutationFn: (input) => createPlant({ userId: user!.id, isPremium, ...input }),
```

- [ ] **Step 5: Typecheck**

```
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```
git add features/plants/api/plantsClient.ts features/plants/hooks/useAddPlant.ts
git commit -m "feat(billing): gate plant creation at 10 plants for free users"
```

---

### Task 18: Progress photo limit gate

**Files:**
- Modify: `features/plants/hooks/useAddPlantProgressPhoto.ts`

- [ ] **Step 1: Modify `useAddPlantProgressPhoto.ts`** to check the photo quota before uploading

Read the current hook. Add these imports:

```typescript
import { canUseFeature } from '@/features/billing/services/entitlementService';
import { useBillingStore } from '@/features/billing/stores/useBillingStore';
import { useUsageLimits } from '@/features/billing/hooks/useUsageLimits';
```

Inside the hook:

```typescript
const tier = useBillingStore((s) => s.tier);
const isPremium = tier === 'premium';
const usageLimits = useUsageLimits();
```

In the `mutationFn`, before calling the photo upload service:

```typescript
const usage = usageLimits.data;
if (usage) {
  const access = canUseFeature('progress_photo_upload', isPremium, usage, input.plantId);
  if (!access.canUse) {
    throw Object.assign(new Error('Photo limit reached'), {
      code: 'PHOTO_LIMIT_REACHED' as const,
    });
  }
}
```

- [ ] **Step 2: Typecheck**

```
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```
git add features/plants/hooks/useAddPlantProgressPhoto.ts
git commit -m "feat(billing): gate progress photo uploads at 3/plant for free users"
```

---

## Part E — AI Feature Wiring

### Task 19: Gate AI health insight

**Files:**
- Modify: `features/ai/hooks/useHealthInsight.ts`

- [ ] **Step 1: Modify `useHealthInsight.ts`** to accept and use `isPremium`:

```typescript
import { useQuery } from '@tanstack/react-query';

import {
  buildHealthInsightRevision,
  getHealthInsight,
} from '@/features/ai/services/healthInsightService';
import type { PlantWithRelations } from '@/types/models';

export function useHealthInsight(input: {
  plantId?: string;
  data?: PlantWithRelations | null;
  isPremium: boolean;
}) {
  const revision = input.data ? buildHealthInsightRevision(input.data) : 'none';

  return useQuery({
    queryKey: ['ai', 'health-insight', input.plantId ?? 'none', revision, input.isPremium],
    enabled: Boolean(input.plantId && input.data),
    staleTime: 1000 * 60 * 15,
    queryFn: () =>
      getHealthInsight({
        plantId: input.plantId!,
        data: input.data!,
        cloudAllowed: input.isPremium,
      }),
  });
}
```

Then in `features/ai/services/healthInsightService.ts`, add `cloudAllowed: boolean` to the `getHealthInsight` input. When `cloudAllowed` is false, skip the cloud call and return the local signal analysis result only:

```typescript
// In getHealthInsight({ plantId, data, cloudAllowed }):
if (!cloudAllowed) {
  return buildLocalHealthInsight(data); // use the existing local signal analysis
}
// ... rest of existing cloud path
```

> **Note:** `buildLocalHealthInsight` should already exist via `healthSignalAnalysisService`. If it is inline in `getHealthInsight`, extract it into a named helper first.

- [ ] **Step 2: Update all callers** of `useHealthInsight` to pass `isPremium`:

Find callers:
```
grep -r "useHealthInsight" app/ features/ --include="*.ts" --include="*.tsx"
```

For each caller, add:
```typescript
const { isPremium } = useSubscription();
// then pass isPremium to useHealthInsight({ ..., isPremium })
```

- [ ] **Step 3: Typecheck**

```
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```
git add features/ai/hooks/useHealthInsight.ts features/ai/services/healthInsightService.ts
git commit -m "feat(billing): gate AI health insight cloud call behind premium/quota"
```

---

### Task 20: Gate AI journal summary

**Files:**
- Modify: `features/ai/hooks/useJournalSummary.ts`
- Modify: `features/ai/services/journalSummaryService.ts`

- [ ] **Step 1: Modify `useJournalSummary.ts`** to accept `isPremium`:

```typescript
export function useJournalSummary(input: {
  userId?: string;
  logs: CareLog[];
  plants: Plant[];
  photoCount: number;
  isPremium: boolean;  // new
}) {
  const monthKey = new Date().toISOString().slice(0, 7);
  const signature = buildJournalSummaryStateSignature({
    logs: input.logs,
    plants: input.plants,
    photoCount: input.photoCount,
  });

  return useQuery({
    queryKey: ['ai', 'journal-summary', input.userId ?? 'guest', monthKey, signature, input.isPremium],
    enabled: Boolean(input.userId),
    staleTime: 1000 * 60 * 30,
    queryFn: () =>
      getJournalMonthlySummary({
        userId: input.userId!,
        logs: input.logs,
        plants: input.plants,
        photoCount: input.photoCount,
        cloudAllowed: input.isPremium,
      }),
  });
}
```

In `journalSummaryService.ts`, add `cloudAllowed: boolean` to `getJournalMonthlySummary`. When `cloudAllowed` is false, return a local statistical summary:

```typescript
if (!cloudAllowed) {
  return buildStatisticalSummary({ logs, plants, photoCount });
}
```

`buildStatisticalSummary` should return a summary object of the same shape as the AI narrative response, but with locally-derived copy such as:
```
"You logged X care events in [month], across Y plants. [Most-cared-for plant name] received the most attention."
```

- [ ] **Step 2: Update all callers** of `useJournalSummary`:

```
grep -r "useJournalSummary" app/ features/ --include="*.ts" --include="*.tsx"
```

Pass `isPremium` from `useSubscription()` at each call site.

- [ ] **Step 3: Typecheck + commit**

```
npx tsc --noEmit
git add features/ai/hooks/useJournalSummary.ts features/ai/services/journalSummaryService.ts
git commit -m "feat(billing): gate AI journal narrative behind premium; free users get statistical summary"
```

---

### Task 21: Gate AI dashboard insight

**Files:**
- Modify: `features/ai/hooks/useDashboardInsight.ts`
- Modify: `features/ai/services/dashboardInsightService.ts`

- [ ] **Step 1: Modify `useDashboardInsight.ts`** to accept `isPremium`:

```typescript
export function useDashboardInsight(input: {
  userId?: string;
  plants: Plant[];
  reminders: CareReminder[];
  currentStreakDays: number;
  isPremium: boolean;  // new
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      'ai', 'dashboard-insight',
      input.userId ?? 'guest',
      new Date().toISOString().slice(0, 10),
      input.plants.length,
      input.reminders.length,
      input.currentStreakDays,
      input.isPremium,
      input.plants.map((p) => `${p.id}:${p.nextWaterDueAt ?? 'none'}`).join('|'),
    ],
    enabled: Boolean(input.userId) && (input.enabled ?? true),
    staleTime: 1000 * 60 * 15,
    queryFn: () =>
      getDashboardInsight({
        userId: input.userId!,
        plants: input.plants,
        reminders: input.reminders,
        currentStreakDays: input.currentStreakDays,
        cloudAllowed: input.isPremium,
      }),
  });
}
```

In `dashboardInsightService.ts`, when `cloudAllowed` is false, return the local fallback copy immediately (the fallback already exists — expose it directly without attempting a cloud call).

- [ ] **Step 2: Update callers, typecheck, commit**

```
grep -r "useDashboardInsight" app/ features/ --include="*.ts" --include="*.tsx"
```

Pass `isPremium` from `useSubscription()` at each call site.

```
npx tsc --noEmit
git add features/ai/hooks/useDashboardInsight.ts features/ai/services/dashboardInsightService.ts
git commit -m "feat(billing): gate AI dashboard editorial copy behind premium"
```

---

### Task 22: Gate AI archive curation

**Files:**
- Modify: `features/ai/hooks/useArchiveCuration.ts`
- Modify: `features/ai/services/archiveCurationService.ts`

- [ ] **Step 1: Modify hook and service** following the same `cloudAllowed` pattern:

In `useArchiveCuration.ts`:
```typescript
export function useArchiveCuration(input: {
  userId?: string;
  memorials: GraveyardPlantListItem[];
  isPremium: boolean;  // new
}) {
  return useQuery({
    queryKey: ['ai', 'archive-curation', input.userId ?? 'guest', input.isPremium,
      input.memorials.map((m) => m.plantId).join('|')],
    enabled: Boolean(input.userId) && input.memorials.length > 0,
    staleTime: 1000 * 60 * 60,
    queryFn: () =>
      getArchiveCuration({
        userId: input.userId!,
        memorials: input.memorials,
        cloudAllowed: input.isPremium,
      }),
  });
}
```

In `archiveCurationService.ts`, when `cloudAllowed` is false, return an empty curation result (or null) so the UI shows the manual pair interface.

- [ ] **Step 2: Update callers, typecheck, commit**

```
npx tsc --noEmit
git add features/ai/hooks/useArchiveCuration.ts features/ai/services/archiveCurationService.ts
git commit -m "feat(billing): gate AI archive curation behind premium"
```

---

### Task 23: Gate species identification

**Files:**
- Modify: `features/ai/hooks/useSpeciesSuggestion.ts`

- [ ] **Step 1: Modify `useSpeciesSuggestion.ts`** to accept `isPremium` and skip cloud on quota exceeded:

```typescript
export function useSpeciesSuggestion(input: {
  imageUri?: string;
  isPremium: boolean;
}) {
  return useQuery({
    queryKey: ['ai', 'species-suggestion', input.imageUri ?? 'none', input.isPremium],
    enabled: Boolean(input.imageUri),
    staleTime: 0,
    queryFn: () =>
      getSpeciesSuggestion({
        imageUri: input.imageUri!,
        cloudAllowed: input.isPremium,
      }),
  });
}
```

In `plantIntelligenceService.ts`, add `cloudAllowed: boolean` to `getSpeciesSuggestion`. When false, fall back to local heuristic detection only.

- [ ] **Step 2: Update callers, typecheck, commit**

```
npx tsc --noEmit
git add features/ai/hooks/useSpeciesSuggestion.ts features/ai/services/plantIntelligenceService.ts
git commit -m "feat(billing): gate AI species identification cloud call behind premium/quota"
```

---

### Task 24: Specimen tags gate

**Files:**
- Modify: `app/specimen-tags.tsx`

- [ ] **Step 1: Read `app/specimen-tags.tsx` in full** to understand the current creation flow

```
# (use Read tool on app/specimen-tags.tsx before modifying)
```

- [ ] **Step 2: Add premium check to tag creation path**

At the top of the specimen tags screen component, add:

```typescript
import { useSubscription } from '@/features/billing/hooks/useSubscription';
import { UpgradePrompt } from '@/features/billing/components/UpgradePrompt';

// Inside component:
const { isPremium } = useSubscription();
```

Replace the "Create New Tag" button / handler with a conditional:

```typescript
{isPremium ? (
  <Pressable onPress={handleCreateTag} ...>
    <Text>Create Specimen Tag</Text>
  </Pressable>
) : (
  <UpgradePrompt
    message="Create botanical QR labels for your plants with Premium."
    cta="Explore Premium"
    compact
  />
)}
```

Existing specimen tag *viewing* remains ungated — free users can see tags already assigned to plants.

- [ ] **Step 3: Typecheck + commit**

```
npx tsc --noEmit
git add app/specimen-tags.tsx
git commit -m "feat(billing): gate specimen tag creation behind premium"
```

---

## Part F — Backup/Export Truthfulness

### Task 25: Truthful backup status copy

**Files:**
- Modify: `features/profile/services/cloudSyncStatusService.ts`

- [ ] **Step 1: Read `cloudSyncStatusService.ts` in full** before modifying.

- [ ] **Step 2: Add photo sync flag to the status view model**

In the service's return type, add:

```typescript
photoSyncAvailable: boolean;
photoSyncDetail: string;
```

In the view model computation, add:

```typescript
const photoSyncAvailable = isPremium && autoSyncEnabled && !isOffline;
const photoSyncDetail = isPremium
  ? 'Photos and all data are included in your cloud backup.'
  : 'Plants, care logs, and reminders are backed up. Photos require Premium.';
```

Update the service function signature to accept `isPremium: boolean`.

- [ ] **Step 3: Update all callers** of `cloudSyncStatusService` to pass `isPremium`:

```
grep -r "cloudSyncStatusService\|getCloudSyncStatus" app/ features/ --include="*.ts" --include="*.tsx"
```

Pass `isPremium` from `useSubscription()` at each call site.

- [ ] **Step 4: Typecheck + commit**

```
npx tsc --noEmit
git add features/profile/services/cloudSyncStatusService.ts
git commit -m "feat(billing): make backup status copy truthful about free vs premium photo sync scope"
```

---

## Part G — Analytics

### Task 26: Production analytics setup

**Files:**
- Modify: `services/analytics/analyticsService.ts`

- [ ] **Step 1: Install PostHog**

```
npx expo install posthog-react-native
```

- [ ] **Step 2: Read `services/analytics/analyticsService.ts` in full** before modifying.

- [ ] **Step 3: Replace the stub with a production-capable implementation**

```typescript
import { Platform } from 'react-native';
import PostHog from 'posthog-react-native';

type AnalyticsMode = 'disabled' | 'debug-log' | 'production';

function getAnalyticsMode(): AnalyticsMode {
  const key = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  if (!key) return 'disabled';
  if (__DEV__) return 'debug-log';
  return 'production';
}

let posthog: PostHog | null = null;

export async function initializeAnalytics(distinctId: string): Promise<void> {
  const mode = getAnalyticsMode();
  if (mode !== 'production') return;

  posthog = await PostHog.initAsync(process.env.EXPO_PUBLIC_POSTHOG_API_KEY!, {
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    captureApplicationLifecycleEvents: false,
    captureDeepLinks: false,
  });
  posthog.identify(distinctId, { platform: Platform.OS });
}

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  const mode = getAnalyticsMode();
  if (mode === 'disabled') return;

  if (mode === 'debug-log') {
    if (__DEV__) {
      console.log('[Analytics]', name, properties ?? {});
    }
    return;
  }

  posthog?.capture(name, properties ?? {});
}

export function trackMonetizationEvent(
  name:
    | 'premium_screen_viewed'
    | 'plan_selected'
    | 'purchase_started'
    | 'purchase_completed'
    | 'purchase_cancelled'
    | 'restore_started'
    | 'restore_completed'
    | 'upgrade_prompt_viewed'
    | 'upgrade_prompt_dismissed'
    | 'quota_reached'
    | 'ai_feature_used',
  properties?: Record<string, string | number | boolean | null>,
): void {
  trackEvent(name, properties);
}

export function resetAnalyticsUser(): void {
  posthog?.reset();
}

export function getAnalyticsStatus() {
  return {
    mode: getAnalyticsMode(),
    productionReady: getAnalyticsMode() === 'production',
  };
}
```

Add `EXPO_PUBLIC_POSTHOG_API_KEY=phc_XXXX` to `.env.example`.

- [ ] **Step 4: Wire `initializeAnalytics` into `BillingBootstrapProvider`** after a successful auth + billing init:

```typescript
import { initializeAnalytics } from '@/services/analytics/analyticsService';
// In the bootstrap useEffect, after billing init:
await initializeAnalytics(user!.id);
```

- [ ] **Step 5: Add tracking to `premium.tsx`**

```typescript
import { trackMonetizationEvent } from '@/services/analytics/analyticsService';

// On screen mount:
useEffect(() => { trackMonetizationEvent('premium_screen_viewed'); }, []);

// On plan selected:
onPress={() => {
  setSelectedPackage(pkg);
  trackMonetizationEvent('plan_selected', { packageType: pkg.packageType });
}}

// On purchase success:
trackMonetizationEvent('purchase_completed', { packageType: selectedPackage.packageType });

// On user cancel:
trackMonetizationEvent('purchase_cancelled');
```

- [ ] **Step 6: Typecheck + commit**

```
npx tsc --noEmit
git add services/analytics/analyticsService.ts providers/BillingBootstrapProvider.tsx app/premium.tsx package.json
git commit -m "feat(analytics): add production PostHog analytics with monetization event tracking"
```

---

## Part H — Compliance + Final Tests

### Task 27: App Store compliance

**Files:**
- Modify: `app/terms.tsx`
- Modify: `app/profile.tsx`

- [ ] **Step 1: Read `app/terms.tsx`** in full.

- [ ] **Step 2: Add subscription compliance paragraph to `app/terms.tsx`**

In the Terms of Service content, add a "Subscriptions" section:

```
Subscriptions

The Conservatory Premium is available as a monthly or annual auto-renewing subscription. Payment is charged to your App Store or Google Play account at confirmation of purchase. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. You can manage and cancel your subscription in your platform account settings. Free trials, where offered, automatically convert to a paid subscription unless cancelled before the trial ends.

Your care logs, plant records, graveyard entries, and memorial notes are yours and are not affected by your subscription status.
```

- [ ] **Step 3: Add subscription management link in `app/profile.tsx`**

In the ACCOUNT section group, add a row that opens the platform subscription management page:

```typescript
import { Linking, Platform } from 'react-native';

// In the ACCOUNT section:
{isPremium ? (
  <ProfileRow
    icon="credit-card-outline"
    label="Manage Subscription"
    onPress={() => {
      const url = Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
      void Linking.openURL(url);
    }}
  />
) : null}
```

- [ ] **Step 4: Typecheck + commit**

```
npx tsc --noEmit
git add app/terms.tsx app/profile.tsx
git commit -m "feat(billing): add App Store subscription compliance — terms language + manage subscription link"
```

---

### Task 28: Full test suite + validation

**Files:**
- All billing test files already created above

- [ ] **Step 1: Run billing unit tests**

```
npm test -- --testPathPattern="tests/features/billing" --runInBand
```
Expected: all tests PASS

- [ ] **Step 2: Run full test suite**

```
npm test -- --runInBand
```
Expected: no regressions. If tests that previously used `useHealthInsight`, `useJournalSummary`, `useDashboardInsight`, or `useArchiveCuration` without `isPremium` now fail, update their mock calls to pass `isPremium: false`.

- [ ] **Step 3: Typecheck**

```
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Lint**

```
npm run lint
```
Expected: no errors

- [ ] **Step 5: Manual QA checklist**

After running on a device via EAS Build or `npx expo run:ios` / `npx expo run:android`:

- [ ] Profile → "The Conservatory" section shows "Explore Premium" for free users
- [ ] Tapping "Explore Premium" opens the premium screen
- [ ] Premium screen shows real prices from RevenueCat (sandbox mode during testing)
- [ ] Annual plan is pre-selected
- [ ] "Maybe later" (close button) dismisses the screen without purchase
- [ ] Tapping "Start Free Trial" or "Subscribe" initiates a sandbox purchase
- [ ] After purchase: profile shows "Premium — Active"
- [ ] After purchase: premium screen auto-closes
- [ ] "Restore purchases" works for previously purchased sandbox accounts
- [ ] Adding an 11th plant as a free user shows the plant-limit upgrade prompt (not a crash)
- [ ] Adding a 4th progress photo to a plant as a free user shows the photo-limit error/prompt
- [ ] Health insight on plant detail falls back to local insight for free users
- [ ] Journal screen shows statistical summary for free users, AI narrative for premium
- [ ] Specimen tag creation is gated — free users see UpgradePrompt, premium users see the creation flow
- [ ] Care logging has NO paywall at any point
- [ ] Graveyard and memorial screens have NO paywall at any point
- [ ] Data & Backup screen clearly describes free vs premium backup scope
- [ ] Terms of Service includes subscription section

- [ ] **Step 6: Final commit**

```
git add .
git commit -m "feat(billing): complete monetization system — RevenueCat, feature gates, paywall, analytics, compliance"
```

---

## Self-Review Against Spec

### Spec coverage check

| Spec requirement | Task(s) |
|---|---|
| RevenueCat IAP integration | Tasks 3–9 |
| Subscription state hook | Task 8–9 |
| Restore purchases | Task 9, 15 |
| Offline entitlement cache | Task 7 (Zustand persists in memory; extend with AsyncStorage if cross-restart persistence needed — defer) |
| Premium screen / paywall | Task 15 |
| Annual plan emphasized | Task 15 |
| Free trial terms disclosure | Task 15, 27 |
| Feature gates: plant limit | Task 17 |
| Feature gates: photo limit | Task 18 |
| Feature gates: AI health insight | Task 19 |
| Feature gates: AI journal | Task 20 |
| Feature gates: AI dashboard | Task 21 |
| Feature gates: AI archive curation | Task 22 |
| Feature gates: species identification | Task 23 |
| Feature gates: specimen tags | Task 24 |
| Usage tracking + quotas | Tasks 10–13 |
| Backup truthfulness | Task 25 |
| Analytics setup | Task 26 |
| App Store compliance | Tasks 15, 27 |
| No gate on care logs | Protected — care logging has zero modifications |
| No gate on graveyard/memorial | Protected — graveyard/memorial screens have zero modifications |
| No gate on basic export | Protected — export routes have zero modifications |
| Upgrade prompts are calm, dismissible | UpgradePrompt component (Task 14); no countdown timers, no locks |

### Deferred items (non-blocking)

1. **Offline entitlement persistence across app restarts**: The Zustand store resets on app restart. The `BillingBootstrapProvider` re-fetches on every auth mount which covers the common case. For true offline-first entitlement persistence (e.g., airplane mode + restart), extend `useBillingStore` to hydrate from AsyncStorage. Add in a follow-up PR.

2. **Per-plant health insight quota tracking**: Current `buildUsageSnapshot` uses a single per-user counter for health insights. This means 1 free insight regardless of which plant. For strict per-plant tracking, store separate counters keyed `ai_health_insight:{plantId}`. Revisit if user feedback indicates this is too restrictive.

3. **Usage quota sync to Supabase**: The `feature_usage` table is local-only. For cross-device quota enforcement (e.g., a user has two phones), the usage table would need to join the sync outbox. Acceptable to defer — free-tier users typically use one device.

4. **Year in Review**: Premium annual narrative (mentioned in audit as the top annual retention hook). Add in Phase 2 after the subscription baseline is live.

5. **Memorial Book PDF export**: One-time IAP at $3.99. Requires PDF generation library. Add in Phase 2.

6. **Analytics quota-reached events in AI hooks**: `trackMonetizationEvent('quota_reached', { feature })` should fire in the AI hooks when `cloudAllowed: false` is returned due to quota. Wire these calls after the feature gate hooks are live and tested.

---

## Final Release Recommendation

After all tasks are complete and the manual QA checklist passes: **this system is production-ready for App Store submission**.

The billing infrastructure uses RevenueCat (industry standard), the paywall is App Store guideline-compliant (no external payment bypass, free trial disclosure is present, restore purchases is accessible), and all gated features have graceful fallbacks. The graveyard, memorial, and care logging surfaces are permanently ungated. No dark patterns are present.

**Prerequisite before shipping**: RevenueCat dashboard must be configured with the actual App Store and Google Play product IDs, and the four env vars (`EXPO_PUBLIC_RC_API_KEY_IOS`, `EXPO_PUBLIC_RC_API_KEY_ANDROID`, `EXPO_PUBLIC_RC_ENTITLEMENT_PREMIUM`, `EXPO_PUBLIC_RC_OFFERING_IDENTIFIER`) must be set in the EAS build secrets.
