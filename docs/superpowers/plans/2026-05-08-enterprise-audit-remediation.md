# Enterprise Audit & Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every confirmed production bug found in the May 2026 enterprise audit: quota bypasses in photo upload and plant import, an export-version validation mismatch, a misleading empty state for free-tier archive curation, a misclassified "premium" feature that runs for all users, a missing analytics event on sync failure, and a live misspelled route.

**Architecture:** Risk-ranked depth-first — Tier 1 critical bugs first (revenue integrity, data integrity), Tier 2 operational gaps second, Tier 4 cleanup last. Each task: write the failing test → confirm it fails → implement the fix → confirm it passes → commit.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router, SQLite via `expo-sqlite`, React Query, Zustand, TypeScript strict, Jest / jest-expo.

---

## Confirmed Findings Summary

| # | Finding | Tier | File(s) |
|---|---------|------|---------|
| 1 | `addPlantProgressPhoto` has no quota enforcement at service layer | 1-Critical | `features/plants/api/plantsClient.ts` |
| 2 | `useAddPlantProgressPhoto` skips quota check when usage data is loading | 1-Critical | `features/plants/hooks/useAddPlantProgressPhoto.ts` |
| 3 | `restoreCollectionImport` bypasses the 10-plant free limit via direct SQL | 1-Critical | `features/export/services/importService.ts` |
| 4 | `validateCollectionImportPayload` rejects `exportVersion: 2` exports | 1-Critical | `features/export/services/importService.ts` |
| 5 | `getArchiveCuration` returns `[]` for free users instead of local fallback | 1-Critical | `features/ai/services/archiveCurationService.ts` |
| 6 | `smart_reminder_optimization` marked premium but runs for all users always | 1-Misleading | `features/billing/constants.ts`, `features/ai/services/reminderOptimizationService.ts` |
| 7 | Sync `markAbandoned` fires `logger.warn` only — no analytics event | 2-High | `services/database/sync.ts` |
| 8 | `app/privavcy.tsx` is a live misspelled route duplicate | 4-Low | `app/privavcy.tsx` |

**Not-a-bug (confirmed as-designed):**
- `ensureSpecimenTag` correctly checks `getEntitlementState()` — no fix needed
- `retryDeferredPremiumPhotoBackups` is idempotent — no fix needed
- All 10 `SyncableEntity` types have adapter branches — no fix needed
- `BillingBootstrapProvider` correctly uses `resolveEffectiveTier` on cache restore — no fix needed
- `useExportCollectionData` reads `isPremium` from Zustand store, not stale singleton — no fix needed
- Species ID quota: free users default to `cloudAllowed=false` when usage is loading — no fix needed
- `useJournalSummary` / `useDashboardInsight` pass `isPremium` as `cloudAllowed` correctly — no fix needed
- `permissionsService.ts` has no unused location exports — already resolved in prior pass

---

## File Map

| File | Change |
|------|--------|
| `features/plants/api/plantsClient.ts` | Add quota enforcement inside `addPlantProgressPhoto`; accept `isPremium` + optional precount |
| `features/plants/hooks/useAddPlantProgressPhoto.ts` | Remove loading-state bypass; throw instead of silently skip |
| `features/export/services/importService.ts` | Add plant-limit guard; accept `exportVersion` 1 or 2 |
| `features/ai/services/archiveCurationService.ts` | Return local fallback when `cloudAllowed` is false |
| `features/billing/constants.ts` | Remove `smart_reminder_optimization` from `FEATURE_REQUIRES_PREMIUM` |
| `services/database/sync.ts` | Add analytics event alongside `logger.warn` in `markAbandoned` path |
| `app/privavcy.tsx` | Delete; verify no navigation links point to it |
| `tests/features/plants/plants-client-photo-quota.test.ts` | New — photo quota enforcement at service layer |
| `tests/features/export/import-service.test.ts` | New — plant quota enforcement + exportVersion acceptance |
| `tests/features/ai/archive-curation-free-tier.test.ts` | New — local fallback for free users |
| `tests/features/billing/smart-reminder-classification.test.ts` | New — `smart_reminder_optimization` not in FEATURE_REQUIRES_PREMIUM |
| `tests/services/sync-abandoned-analytics.test.ts` | New — analytics fires on item abandonment |

---

## Task 1: Photo Quota — Service-Layer Enforcement

**Files:**
- Modify: `features/plants/api/plantsClient.ts` (function `addPlantProgressPhoto`, ~line 867)
- Create: `tests/features/plants/plants-client-photo-quota.test.ts`

**Context:** `addPlantProgressPhoto` inserts a progress photo into SQLite with no quota check. The free limit (3 progress photos per plant) is only checked in the React hook, which skips the check when `usageLimits.data` is undefined. Any direct service call bypasses the limit entirely.

- [ ] **Step 1: Write the failing test**

Create `tests/features/plants/plants-client-photo-quota.test.ts`:

```typescript
const mockGetDatabase = jest.fn();

jest.mock('@/services/database/sqlite', () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));
jest.mock('@/services/database/syncOutbox', () => ({
  runAtomicMutationWithSyncOutbox: jest.fn(),
  insertSyncOutboxOperationInTransaction: jest.fn(),
}));
jest.mock('@/features/plants/services/photoStorageService', () => ({
  persistPhotoAsset: jest.fn().mockResolvedValue({ localUri: 'file://photo.jpg', storagePath: 'path/photo.jpg' }),
}));

describe('addPlantProgressPhoto service-layer quota', () => {
  it('throws PHOTO_LIMIT_REACHED when free user has 3+ progress photos for plant', async () => {
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn()
        // First call: getPlantById check
        .mockResolvedValueOnce({
          id: 'plant-1', user_id: 'user-1', name: 'Monstera', species_name: 'M. deliciosa',
          nickname: null, status: 'active', location: null, watering_interval_days: 7,
          last_watered_at: null, next_water_due_at: null, notes: null,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
          updated_by: null, pending: 0, synced_at: null, sync_error: null,
        })
        // Second call: photo count query
        .mockResolvedValueOnce({ count: 3 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
    });

    const { addPlantProgressPhoto } = require('@/features/plants/api/plantsClient');

    await expect(
      addPlantProgressPhoto({
        userId: 'user-1',
        plantId: 'plant-1',
        photoUri: 'file://new.jpg',
        isPremium: false,
      }),
    ).rejects.toMatchObject({ code: 'PHOTO_LIMIT_REACHED' });
  });

  it('allows upload when free user has fewer than 3 progress photos', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce({
          id: 'plant-1', user_id: 'user-1', name: 'Monstera', species_name: 'M. deliciosa',
          nickname: null, status: 'active', location: null, watering_interval_days: 7,
          last_watered_at: null, next_water_due_at: null, notes: null,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
          updated_by: null, pending: 0, synced_at: null, sync_error: null,
        })
        .mockResolvedValueOnce({ count: 2 })
        .mockResolvedValue(null),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync,
      withTransactionAsync,
    });

    const { runAtomicMutationWithSyncOutbox } = require('@/services/database/syncOutbox');
    (runAtomicMutationWithSyncOutbox as jest.Mock).mockImplementation(
      async (_db: unknown, opts: { perform: (iso: string) => Promise<unknown> }) => {
        return opts.perform('2026-05-08T00:00:00.000Z');
      },
    );

    const { addPlantProgressPhoto } = require('@/features/plants/api/plantsClient');
    await expect(
      addPlantProgressPhoto({
        userId: 'user-1',
        plantId: 'plant-1',
        photoUri: 'file://new.jpg',
        isPremium: false,
      }),
    ).resolves.not.toThrow();
  });

  it('never blocks a premium user regardless of photo count', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce({
          id: 'plant-1', user_id: 'user-1', name: 'Monstera', species_name: 'M. deliciosa',
          nickname: null, status: 'active', location: null, watering_interval_days: 7,
          last_watered_at: null, next_water_due_at: null, notes: null,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
          updated_by: null, pending: 0, synced_at: null, sync_error: null,
        })
        .mockResolvedValue(null),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync,
      withTransactionAsync,
    });

    const { runAtomicMutationWithSyncOutbox } = require('@/services/database/syncOutbox');
    (runAtomicMutationWithSyncOutbox as jest.Mock).mockImplementation(
      async (_db: unknown, opts: { perform: (iso: string) => Promise<unknown> }) => {
        return opts.perform('2026-05-08T00:00:00.000Z');
      },
    );

    const { addPlantProgressPhoto } = require('@/features/plants/api/plantsClient');
    await expect(
      addPlantProgressPhoto({
        userId: 'user-1',
        plantId: 'plant-1',
        photoUri: 'file://new.jpg',
        isPremium: true,
      }),
    ).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npm test -- --testPathPattern="plants-client-photo-quota" --runInBand
```

Expected: FAIL — `addPlantProgressPhoto` does not accept `isPremium` and has no quota check.

- [ ] **Step 3: Add quota enforcement to `addPlantProgressPhoto`**

In `features/plants/api/plantsClient.ts`, update the function signature and add a quota check at the top of `addPlantProgressPhoto`. The existing function starts at approximately line 867. Change:

```typescript
export async function addPlantProgressPhoto(input: {
  userId: string;
  plantId: string;
  photoUri: string;
  capturedAt?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
}) {
  const database = await getDatabase();
  const current = await getPlantById(input.userId, input.plantId);
  if (!current) {
    throw new Error("Plant not found.");
  }
```

To:

```typescript
export async function addPlantProgressPhoto(input: {
  userId: string;
  plantId: string;
  photoUri: string;
  isPremium?: boolean;
  capturedAt?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
}) {
  const database = await getDatabase();
  const current = await getPlantById(input.userId, input.plantId);
  if (!current) {
    throw new Error("Plant not found.");
  }

  if (!input.isPremium) {
    const photoCountRow = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM photos WHERE plant_id = ? AND photo_role = 'progress'`,
      [input.plantId],
    );
    const currentCount = photoCountRow?.count ?? 0;
    if (currentCount >= FREE_PROGRESS_PHOTOS_PER_PLANT) {
      throw Object.assign(new Error("Photo limit reached"), {
        code: "PHOTO_LIMIT_REACHED" as const,
        limit: FREE_PROGRESS_PHOTOS_PER_PLANT,
        current: currentCount,
      });
    }
  }
```

Also add the import at the top of the file if not already present:

```typescript
import { FREE_PROGRESS_PHOTOS_PER_PLANT } from "@/features/billing/constants";
```

- [ ] **Step 4: Run test to confirm it passes**

```
npm test -- --testPathPattern="plants-client-photo-quota" --runInBand
```

Expected: PASS all 3 tests.

- [ ] **Step 5: Typecheck and lint**

```
npm run typecheck && npm run lint
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add features/plants/api/plantsClient.ts tests/features/plants/plants-client-photo-quota.test.ts
git commit -m "fix(billing): enforce progress photo quota at service layer in addPlantProgressPhoto"
```

---

## Task 2: Photo Quota — Hook Loading-State Bypass

**Files:**
- Modify: `features/plants/hooks/useAddPlantProgressPhoto.ts`

**Context:** The hook's `mutationFn` only checks the quota when `usageLimits.data` is defined. When the usage query is still loading (undefined), the check is silently skipped and the upload proceeds. Now that the service layer enforces the quota, the hook guard becomes a fast-path optimistic check — but it must not silently bypass when data is loading. The correct behaviour: if usage data is not yet loaded, let the service-layer check handle it (which it now does).

- [ ] **Step 1: Remove the loading-state bypass from the hook**

Replace the current `mutationFn` body in `features/plants/hooks/useAddPlantProgressPhoto.ts`:

```typescript
  return useMutation({
    mutationFn: (photo: PlantImageAsset & { caption?: string | null }) => {
      const usage = usageLimits.data;
      if (usage) {
        const access = canUseFeature('progress_photo_upload', isPremium, usage, plantId);
        if (!access.canUse) {
          throw Object.assign(new Error('Photo limit reached'), {
            code: 'PHOTO_LIMIT_REACHED' as const,
          });
        }
      }
      return addPlantProgressPhoto({
        userId: user!.id,
        plantId,
        photoUri: photo.uri,
        capturedAt: photo.capturedAt ?? null,
        mimeType: photo.mimeType ?? null,
        width: photo.width ?? null,
        height: photo.height ?? null,
        caption: photo.caption ?? null,
      });
    },
```

With:

```typescript
  return useMutation({
    mutationFn: (photo: PlantImageAsset & { caption?: string | null }) => {
      // Optimistic fast-path: if usage data is already loaded, gate eagerly in the
      // hook to surface a friendly error before hitting the DB. If data isn't loaded
      // yet, the service layer enforces the quota.
      const usage = usageLimits.data;
      if (usage) {
        const access = canUseFeature('progress_photo_upload', isPremium, usage, plantId);
        if (!access.canUse) {
          throw Object.assign(new Error('Photo limit reached'), {
            code: 'PHOTO_LIMIT_REACHED' as const,
          });
        }
      }
      return addPlantProgressPhoto({
        userId: user!.id,
        plantId,
        isPremium,
        photoUri: photo.uri,
        capturedAt: photo.capturedAt ?? null,
        mimeType: photo.mimeType ?? null,
        width: photo.width ?? null,
        height: photo.height ?? null,
        caption: photo.caption ?? null,
      });
    },
```

The only change is adding `isPremium` to the `addPlantProgressPhoto` call so the service layer receives it.

- [ ] **Step 2: Typecheck**

```
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Run existing photo-related tests**

```
npm test -- --testPathPattern="plants-client-photo-quota|photo-storage" --runInBand
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add features/plants/hooks/useAddPlantProgressPhoto.ts
git commit -m "fix(billing): pass isPremium to addPlantProgressPhoto so service-layer quota runs"
```

---

## Task 3: Import Service — Plant Quota Bypass + exportVersion Mismatch

**Files:**
- Modify: `features/export/services/importService.ts`
- Create: `tests/features/export/import-service.test.ts`

**Context:** Two bugs in `importService.ts`:
1. `restoreCollectionImport` uses `INSERT OR REPLACE INTO plants` directly, bypassing the 10-plant free limit. A free user can import unlimited plants.
2. `validateCollectionImportPayload` rejects anything with `exportVersion !== 1`, but `exportService.ts` creates files with `exportVersion: 2`. Users cannot self-import their own exports.

- [ ] **Step 1: Write the failing tests**

Create `tests/features/export/import-service.test.ts`:

```typescript
jest.mock('@/services/database/sqlite', () => ({
  getDatabase: jest.fn(),
}));
jest.mock('@/features/care-logs/services/careLogTagsService', () => ({
  replaceCareLogTagsInTransaction: jest.fn().mockResolvedValue(undefined),
  serializeCareLogTags: jest.fn().mockReturnValue('[]'),
}));
jest.mock('@/features/plants/services/photoStorageService', () => ({
  downloadRemotePhotoAsset: jest.fn().mockRejectedValue(new Error('no-op')),
}));
jest.mock('@/services/database/syncOutbox', () => ({
  insertSyncOutboxOperationInTransaction: jest.fn().mockResolvedValue(undefined),
}));

import {
  validateCollectionImportPayload,
  restoreCollectionImport,
  type CollectionImportPayload,
} from '@/features/export/services/importService';
import { getDatabase } from '@/services/database/sqlite';

const mockGetDatabase = getDatabase as jest.Mock;

function makeMinimalPayload(overrides: Partial<CollectionImportPayload> = {}): CollectionImportPayload {
  return {
    exportVersion: 2,
    format: 'json',
    plants: [],
    careLogs: [],
    photos: [],
    reminders: [],
    memorialEntries: [],
    ...overrides,
  };
}

describe('validateCollectionImportPayload', () => {
  it('accepts exportVersion 1', () => {
    expect(() =>
      validateCollectionImportPayload(makeMinimalPayload({ exportVersion: 1 })),
    ).not.toThrow();
  });

  it('accepts exportVersion 2', () => {
    expect(() =>
      validateCollectionImportPayload(makeMinimalPayload({ exportVersion: 2 })),
    ).not.toThrow();
  });

  it('rejects unknown exportVersion', () => {
    expect(() =>
      validateCollectionImportPayload(makeMinimalPayload({ exportVersion: 99 as never })),
    ).toThrow('not a Conservatory export');
  });
});

describe('restoreCollectionImport plant quota', () => {
  it('throws when free user already has 10 plants and import contains active plants', async () => {
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ count: 10 }),
      withTransactionAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue(undefined),
    });

    const payload = makeMinimalPayload({
      plants: [
        { id: 'p-1', name: 'Plant 1', speciesName: 'S1', status: 'active' },
      ],
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload, isPremium: false }),
    ).rejects.toMatchObject({ code: 'PLANT_LIMIT_REACHED' });
  });

  it('allows import when free user is under the limit', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ count: 5 }),
      withTransactionAsync,
      runAsync,
    });

    const payload = makeMinimalPayload({
      plants: [
        { id: 'p-1', name: 'Plant 1', speciesName: 'S1', status: 'active' },
      ],
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload, isPremium: false }),
    ).resolves.not.toThrow();
  });

  it('never blocks a premium user regardless of plant count', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ count: 99 }),
      withTransactionAsync,
      runAsync,
    });

    const payload = makeMinimalPayload({
      plants: Array.from({ length: 20 }, (_, i) => ({
        id: `p-${i}`, name: `Plant ${i}`, speciesName: 'S', status: 'active' as const,
      })),
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload, isPremium: true }),
    ).resolves.not.toThrow();
  });

  it('skips quota check when all imported plants are graveyard status', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ count: 10 }),
      withTransactionAsync,
      runAsync,
    });

    const payload = makeMinimalPayload({
      plants: [
        { id: 'p-1', name: 'Dead Plant', speciesName: 'S1', status: 'graveyard' },
      ],
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload, isPremium: false }),
    ).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm test -- --testPathPattern="import-service" --runInBand
```

Expected: multiple FAILs — `validateCollectionImportPayload` rejects v2; `restoreCollectionImport` has no `isPremium` param and no quota check.

- [ ] **Step 3: Fix `validateCollectionImportPayload`**

In `features/export/services/importService.ts`, change the `exportVersion` check from:

```typescript
  if (
    payload.exportVersion !== 1 ||
    payload.format !== "json" ||
```

To:

```typescript
  if (
    (payload.exportVersion !== 1 && payload.exportVersion !== 2) ||
    payload.format !== "json" ||
```

- [ ] **Step 4: Add `isPremium` parameter and plant quota guard to `restoreCollectionImport`**

Add the import at the top of `features/export/services/importService.ts`:

```typescript
import { FREE_PLANT_LIMIT } from "@/features/billing/constants";
```

Change the function signature from:

```typescript
export async function restoreCollectionImport(input: {
  userId: string;
  payload: CollectionImportPayload;
}) {
  validateCollectionImportPayload(input.payload);
  const database = await getDatabase();
  const now = new Date().toISOString();
  const importRunId = createId("import");
  const summary = previewCollectionImport(input.payload);
```

To:

```typescript
export async function restoreCollectionImport(input: {
  userId: string;
  payload: CollectionImportPayload;
  isPremium?: boolean;
}) {
  validateCollectionImportPayload(input.payload);
  const database = await getDatabase();
  const now = new Date().toISOString();
  const importRunId = createId("import");
  const summary = previewCollectionImport(input.payload);

  if (!input.isPremium) {
    const activePlantsInImport = input.payload.plants.filter(
      (p) => !p.status || p.status === "active",
    );
    if (activePlantsInImport.length > 0) {
      const row = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM plants WHERE user_id = ? AND status = 'active'`,
        [input.userId],
      );
      const currentCount = row?.count ?? 0;
      if (currentCount >= FREE_PLANT_LIMIT) {
        throw Object.assign(
          new Error(
            `Plant limit reached. Free accounts can hold up to ${FREE_PLANT_LIMIT} plants. Upgrade to Premium to import your full collection.`,
          ),
          {
            code: "PLANT_LIMIT_REACHED" as const,
            limit: FREE_PLANT_LIMIT,
            current: currentCount,
          },
        );
      }
    }
  }
```

- [ ] **Step 5: Run tests to confirm they pass**

```
npm test -- --testPathPattern="import-service" --runInBand
```

Expected: all 5 tests pass.

- [ ] **Step 6: Find callers of `restoreCollectionImport` and pass `isPremium`**

Search for callers:

```
npm run typecheck 2>&1 | grep -i "restoreCollectionImport\|isPremium"
```

The caller is `app/import-collection-data.tsx`. Open that file and find the call to `restoreCollectionImport`. Add `isPremium` from the subscription hook. The hook `useSubscription` is likely already imported or can be added:

```typescript
import { useSubscription } from '@/features/billing/hooks/useSubscription';
// ...
const { isPremium } = useSubscription();
// ...
await restoreCollectionImport({ userId: user.id, payload, isPremium });
```

- [ ] **Step 7: Typecheck and lint**

```
npm run typecheck && npm run lint
```

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add features/export/services/importService.ts tests/features/export/import-service.test.ts app/import-collection-data.tsx
git commit -m "fix(billing): enforce plant quota on import; accept exportVersion 1 and 2"
```

---

## Task 4: Archive Curation — Local Fallback for Free Users

**Files:**
- Modify: `features/ai/services/archiveCurationService.ts`
- Create: `tests/features/ai/archive-curation-free-tier.test.ts`

**Context:** `getArchiveCuration` returns `[]` when `cloudAllowed` is false. Free users see a completely empty archive gallery instead of the locally-curated before/after pairs that are calculated using only on-device data. `curateArchiveLocally` already exists and is correct — it just isn't called for free users.

- [ ] **Step 1: Write the failing test**

Create `tests/features/ai/archive-curation-free-tier.test.ts`:

```typescript
jest.mock('@/features/ai/api/aiClient', () => ({
  requestArchiveCuration: jest.fn(),
}));
jest.mock('@/features/ai/services/aiCache', () => ({
  getCachedValue: jest.fn().mockResolvedValue(null),
  setCachedValue: jest.fn().mockResolvedValue(undefined),
}));

import { getArchiveCuration, type ArchiveCurationItem } from '@/features/ai/services/archiveCurationService';

const twoPhotoItem: ArchiveCurationItem = {
  plantId: 'plant-1',
  plantName: 'Monstera',
  photoUris: ['file://before.jpg', 'file://after.jpg'],
  photos: [
    { id: 'photo-before', uri: 'file://before.jpg' },
    { id: 'photo-after', uri: 'file://after.jpg' },
  ],
};

describe('getArchiveCuration free-tier fallback', () => {
  it('returns locally curated pairs for free users (cloudAllowed=false)', async () => {
    const result = await getArchiveCuration([twoPhotoItem], false);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].plantId).toBe('plant-1');
    expect(result[0].source).toBe('local');
  });

  it('returns empty array when items have fewer than 2 photos (free user)', async () => {
    const singlePhoto: ArchiveCurationItem = {
      plantId: 'plant-2',
      plantName: 'Pothos',
      photoUris: ['file://only.jpg'],
      photos: [{ id: 'photo-1', uri: 'file://only.jpg' }],
    };
    const result = await getArchiveCuration([singlePhoto], false);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npm test -- --testPathPattern="archive-curation-free-tier" --runInBand
```

Expected: FAIL — `getArchiveCuration` returns `[]` for free users.

- [ ] **Step 3: Fix `getArchiveCuration` to return local fallback when not cloud-allowed**

In `features/ai/services/archiveCurationService.ts`, replace:

```typescript
export async function getArchiveCuration(items: ArchiveCurationItem[], cloudAllowed = true) {
  if (!cloudAllowed) return [];

  const revision = buildRevision(items);
```

With:

```typescript
export async function getArchiveCuration(items: ArchiveCurationItem[], cloudAllowed = true) {
  if (!cloudAllowed) {
    return curateArchiveLocally(items);
  }

  const revision = buildRevision(items);
```

- [ ] **Step 4: Run test to confirm it passes**

```
npm test -- --testPathPattern="archive-curation-free-tier" --runInBand
```

Expected: all 2 tests pass.

- [ ] **Step 5: Run broader AI test suite to catch regressions**

```
npm test -- --testPathPattern="tests/features/ai" --runInBand
```

Expected: all pass.

- [ ] **Step 6: Typecheck and lint**

```
npm run typecheck && npm run lint
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add features/ai/services/archiveCurationService.ts tests/features/ai/archive-curation-free-tier.test.ts
git commit -m "fix(ai): return local archive curation fallback for free users instead of empty array"
```

---

## Task 5: Declassify `smart_reminder_optimization` from Premium

**Files:**
- Modify: `features/billing/constants.ts`
- Create: `tests/features/billing/smart-reminder-classification.test.ts`

**Context:** `FEATURE_REQUIRES_PREMIUM['smart_reminder_optimization'] = true` but `optimizeReminderTiming` is called unconditionally inside `createPlant` and `updatePlant` for every user. The feature has always been free in practice. Keeping it in `FEATURE_REQUIRES_PREMIUM` is misleading — any UI that checks this constant tells free users they can't use something they already have. The correct fix is to remove it from the premium map.

- [ ] **Step 1: Write the failing test**

Create `tests/features/billing/smart-reminder-classification.test.ts`:

```typescript
import { FEATURE_REQUIRES_PREMIUM } from '@/features/billing/constants';
import { canUseFeature } from '@/features/billing/services/entitlementService';

describe('smart_reminder_optimization classification', () => {
  it('is not in FEATURE_REQUIRES_PREMIUM (it runs for all users)', () => {
    expect(FEATURE_REQUIRES_PREMIUM['smart_reminder_optimization']).toBeFalsy();
  });

  it('canUseFeature allows free users to use smart_reminder_optimization', () => {
    const result = canUseFeature(
      'smart_reminder_optimization',
      false,
      { totalPlantCount: 5, progressPhotosForPlant: {}, aiHealthInsightsThisMonth: {}, plantIdThisMonth: 0 },
    );
    expect(result.canUse).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npm test -- --testPathPattern="smart-reminder-classification" --runInBand
```

Expected: FAIL — `FEATURE_REQUIRES_PREMIUM.smart_reminder_optimization` is `true`.

- [ ] **Step 3: Remove `smart_reminder_optimization` from `FEATURE_REQUIRES_PREMIUM`**

In `features/billing/constants.ts`, find the `FEATURE_REQUIRES_PREMIUM` object. Change:

```typescript
  smart_reminder_optimization: true,
```

To:

```typescript
  smart_reminder_optimization: false,
```

- [ ] **Step 4: Run test to confirm it passes**

```
npm test -- --testPathPattern="smart-reminder-classification" --runInBand
```

Expected: both tests pass.

- [ ] **Step 5: Run full billing test suite**

```
npm test -- --testPathPattern="tests/features/billing" --runInBand
```

Expected: all pass.

- [ ] **Step 6: Typecheck and lint**

```
npm run typecheck && npm run lint
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add features/billing/constants.ts tests/features/billing/smart-reminder-classification.test.ts
git commit -m "fix(billing): declassify smart_reminder_optimization — it has always run for all users"
```

---

## Task 6: Sync Abandoned Items — Analytics Event

**Files:**
- Modify: `services/database/sync.ts`
- Create: `tests/services/sync-abandoned-analytics.test.ts`

**Context:** When a sync queue item exceeds 10 retries, `markAbandoned` is called and `logger.warn("sync.item_abandoned", ...)` fires. No analytics event is tracked, so ops has no visibility into abandoned items — these represent data that silently failed to sync to Supabase.

- [ ] **Step 1: Write the failing test**

Create `tests/services/sync-abandoned-analytics.test.ts`:

```typescript
const mockTrackMonetizationEvent = jest.fn();

jest.mock('@/services/analytics/analyticsService', () => ({
  trackMonetizationEvent: (...args: unknown[]) => mockTrackMonetizationEvent(...args),
}));
jest.mock('@/config/env', () => ({
  env: { isSupabaseConfigured: false },
}));
jest.mock('@/services/database/sqlite', () => ({
  getDatabase: jest.fn(),
}));
jest.mock('@/services/database/supabaseSyncAdapter', () => ({
  processSyncQueueItemWithSupabase: jest.fn(),
}));

import { createSyncQueueService } from '@/services/database/sync';
import type { SyncQueueItem, SyncQueueStorage } from '@/services/database/sync';

function makeMockStorage(overrides: Partial<SyncQueueStorage> = {}): SyncQueueStorage {
  return {
    insert: jest.fn().mockResolvedValue(undefined),
    listProcessable: jest.fn().mockResolvedValue([]),
    countProcessable: jest.fn().mockResolvedValue(0),
    reclaimStaleProcessing: jest.fn().mockResolvedValue(0),
    markProcessing: jest.fn().mockResolvedValue(undefined),
    markCompleted: jest.fn().mockResolvedValue(undefined),
    markDeferred: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
    markAbandoned: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeQueueItem(attemptCount: number): SyncQueueItem {
  return {
    id: 'sync-1',
    entity: 'plants',
    entityId: 'plant-1',
    operation: 'update',
    payload: null,
    status: 'failed',
    attemptCount,
    lastError: 'Network error',
    nextRetryAt: null,
    queuedAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
  };
}

describe('sync queue abandoned item analytics', () => {
  beforeEach(() => {
    mockTrackMonetizationEvent.mockClear();
  });

  it('fires a sync_item_abandoned analytics event when an item exceeds max retries', async () => {
    const failingItem = makeQueueItem(9);
    const storage = makeMockStorage({
      listProcessable: jest.fn().mockResolvedValue([failingItem]),
    });

    const service = createSyncQueueService(storage);
    await service.syncPendingChanges({
      processOperation: async () => {
        throw new Error('Persistent failure');
      },
    });

    expect(storage.markAbandoned).toHaveBeenCalledWith(
      'sync-1',
      expect.any(String),
      expect.any(String),
    );
    expect(mockTrackMonetizationEvent).toHaveBeenCalledWith(
      'sync_item_abandoned',
      expect.objectContaining({
        entity: 'plants',
        entityId: 'plant-1',
        attemptCount: expect.any(Number),
      }),
    );
  });

  it('does not fire analytics for items that fail but are below max retries', async () => {
    const failingItem = makeQueueItem(5);
    const storage = makeMockStorage({
      listProcessable: jest.fn().mockResolvedValue([failingItem]),
    });

    const service = createSyncQueueService(storage);
    await service.syncPendingChanges({
      processOperation: async () => {
        throw new Error('Transient failure');
      },
    });

    expect(storage.markFailed).toHaveBeenCalled();
    expect(mockTrackMonetizationEvent).not.toHaveBeenCalledWith(
      'sync_item_abandoned',
      expect.anything(),
    );
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
npm test -- --testPathPattern="sync-abandoned-analytics" --runInBand
```

Expected: FAIL — `trackMonetizationEvent` is not called in the abandoned path.

- [ ] **Step 3: Add analytics import and event to `sync.ts`**

In `services/database/sync.ts`, add the import at the top:

```typescript
import { trackMonetizationEvent } from "@/services/analytics/analyticsService";
```

Find the `markAbandoned` call in `syncPendingChanges` (approximately line 351):

```typescript
          if (newAttemptCount >= 10) {
            await storage.markAbandoned(
              item.id,
              errorMessage,
              new Date().toISOString(),
            );
            logger.warn("sync.item_abandoned", {
              entity: item.entity,
              entityId: item.entityId,
              attemptCount: newAttemptCount,
            });
```

Change to:

```typescript
          if (newAttemptCount >= 10) {
            await storage.markAbandoned(
              item.id,
              errorMessage,
              new Date().toISOString(),
            );
            logger.warn("sync.item_abandoned", {
              entity: item.entity,
              entityId: item.entityId,
              attemptCount: newAttemptCount,
            });
            trackMonetizationEvent("sync_item_abandoned", {
              entity: item.entity,
              entityId: item.entityId,
              attemptCount: newAttemptCount,
              lastError: errorMessage,
            });
```

- [ ] **Step 4: Run test to confirm it passes**

```
npm test -- --testPathPattern="sync-abandoned-analytics" --runInBand
```

Expected: both tests pass.

- [ ] **Step 5: Run broader sync test suite**

```
npm test -- --testPathPattern="tests/services" --runInBand
```

Expected: all pass.

- [ ] **Step 6: Typecheck and lint**

```
npm run typecheck && npm run lint
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add services/database/sync.ts tests/services/sync-abandoned-analytics.test.ts
git commit -m "fix(sync): track analytics event when sync item is abandoned after max retries"
```

---

## Task 7: Remove Typo Route `privavcy.tsx`

**Files:**
- Delete: `app/privavcy.tsx`

**Context:** `app/privavcy.tsx` is a live `LegalDocumentScreen` with a misspelled filename. The correct route is `app/privacy.tsx`. Any navigation link pointing to `privavcy` would silently 404 in production.

- [ ] **Step 1: Search for any navigation links pointing to the typo route**

```
npm run typecheck 2>&1; grep -r "privavcy" --include="*.ts" --include="*.tsx" "C:\Users\ghyor\OneDrive\Desktop\Projects\the-conservatory" --exclude-dir="node_modules"
```

If any files reference `privavcy`, fix them to reference `privacy` instead before deleting.

- [ ] **Step 2: Delete the file**

```bash
git rm app/privavcy.tsx
```

- [ ] **Step 3: Typecheck and lint**

```
npm run typecheck && npm run lint
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove misspelled privavcy.tsx route (correct route is privacy.tsx)"
```

---

## Task 8: Full Verification Pass

Run the complete test suite and verify all fixes hold together.

- [ ] **Step 1: Run full test suite**

```
npm test -- --runInBand
```

Expected: all tests pass, no regressions.

- [ ] **Step 2: Typecheck**

```
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Lint**

```
npm run lint
```

Expected: zero errors.

- [ ] **Step 4: Verify test count increased**

After the full run, confirm the new test files were executed. Look for these test file names in the output:
- `plants-client-photo-quota`
- `import-service`
- `archive-curation-free-tier`
- `smart-reminder-classification`
- `sync-abandoned-analytics`

- [ ] **Step 5: Final commit if any loose ends**

```bash
git add -p
git commit -m "chore(audit): verification pass — all tier 1/2/4 findings resolved"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] 1.1 Photo quota service-layer bypass → Task 1
- [x] 1.2 Hook loading-state bypass → Task 2
- [x] 1.3 Plant creation quota (import path) → Task 3
- [x] 1.4 exportVersion v2 acceptance → Task 3
- [x] 1.5 Archive curation free-user fallback → Task 4
- [x] 1.6 Smart reminder misclassification → Task 5
- [x] 2.1 Sync abandoned analytics → Task 6
- [x] 4.1 Privavcy typo route → Task 7
- [x] Full verification → Task 8

**Not implemented (confirmed as-designed during audit — no action needed):**
- Specimen tag service-layer guard: `getEntitlementState()` already enforces at service layer ✓
- Photo backup retry idempotency: already correctly implemented ✓
- Sync outbox completeness: all 10 entity types present ✓
- Downgrade cache restoration: `resolveEffectiveTier` correctly used ✓
- Export stale singleton: hook reads from Zustand store, not singleton ✓
- `permissionsService.ts` unused exports: already removed in prior pass ✓
