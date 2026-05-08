# Enterprise Audit & Remediation — Design Spec

**Date:** 2026-05-08
**Status:** Approved
**Scope:** Comprehensive production-readiness audit and remediation of The Conservatory across all 13 feature modules, all providers, all services/database files, all 51 routes, all edge functions, and supporting infrastructure.

---

## Context

The May 2 (production-readiness) and May 4 (audit-remediation) implementation plans have been largely executed. This pass is a fresh verification audit that does not trust plan completion claims — every system is verified against actual runtime behaviour. Findings are classified by consequence and fixed in tier order, ensuring the app is production-safe at each tier boundary.

---

## Audit Approach: Risk-Ranked Depth-First

For each system: read the full implementation chain (UI → hook → service → DB → sync → edge function), identify gaps, classify the finding, implement the fix at the correct architectural layer, add or update tests, run typecheck + lint + jest, then move on. No finding is marked resolved without test evidence.

---

## Tier Definitions

| Tier | Label | Criteria | Gate |
|------|-------|----------|------|
| 1 | Critical | Bypassable quotas; incorrect revenue gating; data corruption paths | Must fix before any other tier |
| 2 | High | Works in ideal conditions; fails offline / on restart / on downgrade | Must fix before App Store submission |
| 3 | Medium | UI/copy claims exceed actual behaviour; minor data integrity gaps; operational gaps | Must fix before public beta |
| 4 | Low | Dead code, typos, missing analytics, cosmetic inconsistencies | Fix when convenient |

---

## Verification Contract

After every fix:
1. `npm run typecheck` — zero errors
2. `npm run lint` — zero errors
3. `npm test -- --testPathPattern="<affected area>" --runInBand` — all tests pass, new tests cover the fix

A fix is not marked done until all three pass.

---

## Tier 1 — Critical Targets

### 1.1 Progress Photo Quota — Service-Layer Bypass

**File chain:** `useAddPlantProgressPhoto` → `addPlantProgressPhoto` (plantsClient.ts)

**Issue:** `addPlantProgressPhoto` has zero quota enforcement. The only guard is in the hook, and it is conditional on `usageLimits.data` being defined. When the usage query is still loading (cold launch, first navigation to a plant), the check is skipped entirely and the user can upload beyond their 3-photo free limit.

**Fix:** Add quota enforcement inside `addPlantProgressPhoto` at the service layer. Accept `isPremium` + optional pre-fetched usage count as parameters; if not provided, read directly from SQLite. Throw with `code: 'PHOTO_LIMIT_REACHED'` if limit exceeded. Hook layer becomes a fast-path check only; service layer is the authoritative gate.

**Tests:** New test in `tests/features/plants/` verifying direct service call is rejected when free-tier photo count ≥ 3.

---

### 1.2 Plant Creation Quota — Call-Path Coverage

**File chain:** `useAddPlant` → `createPlant` (plantsClient.ts)

**Issue:** `createPlant` enforces the plant limit at the service layer (correct). Verify no other call path (import, hydration, debug routes) can create plants without going through this check.

**Fix:** Audit all callers of `createPlant`. Verify `importService.ts` either (a) calls `createPlant` with `isPremium` or (b) has its own equivalent guard. If import bypasses the limit, add enforcement.

**Tests:** Verify import rejects when free-tier plant count ≥ 10.

---

### 1.3 Advanced Library Filters — Missing Enforcement Point

**File chain:** `FEATURE_REQUIRES_PREMIUM['advanced_library_filters'] = true` → ??? → `listPlants` filter param

**Issue:** `listPlants` accepts any `PlantLibraryFilter` value. The `entitlementService` constant says this requires premium, but no hook or route has been confirmed to gate the filter before passing it to the query.

**Fix:** Trace all callers of `usePlants` / `listPlants` that pass a filter. Add a guard that maps premium-only filter values to `'all'` (the default) when `isPremium` is false, and surfaces an `UpgradePrompt`. Enforce in the hook layer (not just UI) so direct calls are safe.

**Tests:** Verify hook returns `'all'` results and surfaces upgrade state when a free user passes a premium filter.

---

### 1.4 Species Identification Quota — Full-Chain Verification

**File chain:** `useSpeciesSuggestion` → `plantIntelligenceService` / `aiClient` → `identify-plant` edge function

**Issue:** Usage is incremented in the hook or service, but the sequence of (check quota → call edge function → increment usage) must be atomic enough that a failed edge function call does not consume quota, and a successful call always increments it. Verify the edge function also enforces premium/quota server-side via `assertPremiumEntitlement`.

**Fix:** Ensure usage is only incremented after a confirmed successful cloud response. Verify the `identify-plant` edge function calls `assertPremiumEntitlement` for premium-only paths and has server-side rate limiting for free-tier usage.

**Tests:** Verify quota is not incremented on edge function failure; verify quota is enforced at edge function level.

---

### 1.5 AI Premium-Only Hooks — Gate Verification

**Hooks:** `useJournalSummary`, `useDashboardInsight`, `useArchiveCuration`, `useSmartReminder`

**Issue:** All four are marked `FEATURE_REQUIRES_PREMIUM`. Verify each hook checks `isPremium` before enabling the query, and that the corresponding edge function calls `assertPremiumEntitlement` at entry.

**Fix:** Any hook that does not check `isPremium` before enabling the query gets the check added. Any edge function missing `assertPremiumEntitlement` gets it added.

**Tests:** Verify hooks return `undefined`/disabled state for free users; verify edge functions return 403 without valid premium entitlement.

---

### 1.6 Specimen Tag Creation — Service-Layer Gate

**File chain:** `useSpecimenTags` → `ensureSpecimenTag` (specimenTagsService)

**Issue:** `useSpecimenTags` gates the query on `isPremium` (correct). But `ensureSpecimenTag` is callable directly. Verify it checks premium status internally or that no non-premium path can call it.

**Fix:** Add an `isPremium` parameter to `ensureSpecimenTag` and throw if called without premium. Or add a guard inside the service that reads `getEntitlementState()`.

**Tests:** Verify `ensureSpecimenTag` throws for non-premium callers.

---

### 1.7 Export Premium Gating — Stale State Risk

**File:** `exportService.ts` — uses `getEntitlementState()` (module-level singleton)

**Issue:** `getEntitlementState()` returns a boolean that is set via `setEntitlementState()`. If `exportCollectionData` is called before `BillingBootstrapProvider` has finished initialising (e.g. very fast tap on cold launch), the singleton could return `false` for a paying user.

**Fix:** The export route/hook should pass `isPremium` from the Zustand billing store (already hydrated from cache before RevenueCat finishes) rather than relying on the singleton. Or add a guard that rejects the export until `isLoading` is false.

**Tests:** Verify export blocks when billing is still loading; verify premium export succeeds when billing store confirms premium.

---

## Tier 2 — High Targets

### 2.1 Photo Backup Retry on Upgrade

**File:** `services/database/photoBackupRetry.ts`

**Issue:** When a user upgrades to premium, `retryDeferredPremiumPhotoBackups` is called. Verify it: (a) finds all photos with `deferred_reason` set, (b) re-queues them into the sync outbox, (c) is idempotent if called multiple times, (d) survives a mid-retry app restart without double-uploading.

**Fix:** Any gap in the above gets implemented. Idempotency is enforced via `ON CONFLICT` or by checking `storage_path` before re-queuing.

---

### 2.2 Sync Outbox Completeness

**File:** `services/database/supabaseSyncAdapter.ts`

**Issue:** 10 `SyncableEntity` types are declared. Verify every entity that is written to SQLite via `runAtomicMutationWithSyncOutbox` is correctly handled by the sync adapter (insert/update/delete branches all present). Identify any entity type that has write operations in SQLite but no sync adapter branch.

**Fix:** Add any missing adapter branches.

---

### 2.3 Entitlement Downgrade Safety

**File chain:** `entitlementCache.ts` → `resolveEffectiveTier` → `BillingBootstrapProvider`

**Issue:** When a subscription lapses, the cache entry may still have `tier: 'premium'` with a future-looking `expiresAt`. `resolveEffectiveTier` correctly handles this. Verify the billing store is updated on next cold launch even if RevenueCat is slow to respond, so the correct (downgraded) tier is applied before any gated feature is accessed.

**Fix:** Ensure the cache-restoration path in `BillingBootstrapProvider` always calls `resolveEffectiveTier` (not raw `tier`) before setting Zustand state.

---

### 2.4 Offline Premium Persistence

**Scenario:** App purchased premium, then restarted with no network.

**Issue:** `BillingBootstrapProvider` reads cache before RevenueCat initialises — this looks correct. Verify the Zustand store is set from cache with `isLoading: true` (correct) and that gated features work while loading completes in the background.

**Fix:** Any path that gates on `!isLoading` instead of `isPremium` gets corrected.

---

### 2.5 `incrementUsage` Concurrency

**File:** `features/billing/services/usageClient.ts`

**Issue:** `ON CONFLICT DO UPDATE SET count = count + 1` is correct for SQLite serialised writes. Verify the surrounding `withTransactionAsync` is not nested inside another transaction, which would cause SQLite deadlock in Expo SQLite.

**Fix:** If nesting is found, extract the increment into the outer transaction.

---

### 2.6 Sync Queue Retry Ceiling

**File:** `services/database/sync.ts`

**Issue:** Items that exceed max retries should be marked `abandoned` and logged. Verify this is implemented and that the UI surfaces abandoned items so users know data failed to sync.

**Fix:** Add the retry ceiling log; surface abandoned item count in the backup/sync UI.

---

### 2.7 Remote Hydration Conflict Resolution

**File:** `services/database/remoteHydration.ts`

**Issue:** Clock skew detection and `local-newer-or-equal` semantics need verification under concurrent writes (two devices writing to the same plant simultaneously).

**Fix:** Any missing conflict case gets a correct resolution rule and test.

---

## Tier 3 — Medium Targets

### 3.1 UI/Copy Truthfulness

Audit every screen that displays: "backed up", "synced", "premium", quota counts, or backup timestamps. Verify the displayed state matches the actual SQLite/Zustand/RevenueCat state. Any screen displaying a claim that cannot be runtime-verified gets the copy updated to be conservative.

### 3.2 Care Log History Depth Gating

The monetisation audit recommends a 60-day history limit for free users. Verify whether this is implemented or only documented. If documented but not implemented, either implement it (if the product decision is to ship it) or remove the copy claim.

### 3.3 Downgrade Photo Visibility

Verify no read path is gated on `isPremium`. Existing photos must be viewable after subscription cancellation. Any `isPremium` check on a *read* path (not upload) gets removed.

### 3.4 AppState Listener Deduplication

`SyncBootstrapProvider` registers an AppState listener. Verify the cleanup function is always called before re-registration on auth user changes, and that switching users does not create duplicate listeners.

### 3.5 Notification Scheduling Failure Handling

`plantsClient` catches scheduling errors with `logger.warn`. Verify the warning is surfaced to an observable analytics event and does not silently leave a reminder in an inconsistent state.

---

## Tier 4 — Low Targets

### 4.1 `privavcy.tsx` Typo Route

`app/privavcy.tsx` is a live `LegalDocumentScreen` with a misspelled filename. Audit whether any navigation link points to this route. Remove the file and redirect any link to the correct `app/privacy.tsx`.

### 4.2 Unused Location Permission Exports

`features/onboarding/services/permissionsService.ts` exports unused location-related functions (identified in May 4 plan). Remove them.

### 4.3 Analytics Event Coverage

Verify PostHog events fire for: upgrade, quota hit (each feature), sync failure, AI call (each type), photo upload, export. Add any missing `trackMonetizationEvent` or equivalent calls.

### 4.4 Memory Update

After the full audit and remediation pass, update `MEMORY.md` and project memory files with any architectural insights discovered.

---

## File Map (anticipated changes)

| File | Change |
|------|--------|
| `features/plants/api/plantsClient.ts` | Add quota enforcement to `addPlantProgressPhoto` |
| `features/plants/hooks/useAddPlantProgressPhoto.ts` | Remove loading-state bypass |
| `features/export/services/exportService.ts` | Guard against stale entitlement singleton |
| `features/export/hooks/useExportCollectionData.ts` | Pass `isPremium` from store instead of singleton |
| `features/plants/services/specimenTagsService.ts` | Add premium guard to `ensureSpecimenTag` |
| `features/ai/hooks/useJournalSummary.ts` | Verify/add `isPremium` gate |
| `features/ai/hooks/useDashboardInsight.ts` | Verify/add `isPremium` gate |
| `features/ai/hooks/useArchiveCuration.ts` | Verify/add `isPremium` gate |
| `features/ai/hooks/useSmartReminder.ts` | Verify/add `isPremium` gate |
| `supabase/functions/generate-journal-summary/index.ts` | Verify `assertPremiumEntitlement` |
| `supabase/functions/generate-dashboard-insight/index.ts` | Verify `assertPremiumEntitlement` |
| `supabase/functions/curate-archive-gallery/index.ts` | Verify `assertPremiumEntitlement` |
| `supabase/functions/optimize-reminders/index.ts` | Verify `assertPremiumEntitlement` |
| `features/billing/services/entitlementCache.ts` | Verify `resolveEffectiveTier` used on cache restore |
| `providers/BillingBootstrapProvider.tsx` | Verify downgrade-safe cache restoration |
| `services/database/photoBackupRetry.ts` | Verify idempotency and restart safety |
| `services/database/supabaseSyncAdapter.ts` | Verify all 10 entity types handled |
| `services/database/sync.ts` | Verify retry ceiling and abandoned-item logging |
| `features/export/services/importService.ts` | Verify plant-limit enforcement on import |
| `app/privavcy.tsx` | Remove (redirect any links to `privacy.tsx`) |
| `features/onboarding/services/permissionsService.ts` | Remove unused location exports |
| `tests/features/plants/` | New tests: photo quota bypass prevention |
| `tests/features/billing/` | New tests: export gating, specimen tag gate |
| `tests/features/ai/` | New/updated tests: premium gate per hook |

---

## Implementation Order

1. Tier 1 items (1.1–1.7) — verified and committed as a batch
2. Tier 2 items (2.1–2.7) — verified and committed as a batch
3. Tier 3 items (3.1–3.5) — verified and committed as a batch
4. Tier 4 items (4.1–4.4) — verified and committed as a batch
5. Final: run full test suite (`npm test -- --runInBand`), typecheck, lint

---

## Out of Scope

- New features not currently implemented (Memorial Book PDF, Year in Review, web companion, physical specimen tags)
- Performance optimisation beyond what is needed to fix a correctness issue
- RevenueCat pricing/offering configuration (external to codebase)
- Supabase RLS policy audit (infrastructure layer, separate engagement)
