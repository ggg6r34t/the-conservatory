# Dev Runtime Remediation — Post-Implementation Verification Audit

**Audit date:** July 1, 2026 (round 1 pre-remediation · round 2 post-remediation)  
**Method:** Terminal log findings reconciled against repository code and Jest output only.  
**Scope:** Expo Go / dev-client runtime errors observed during `npx expo start` sessions.

---

## Round 1 — Finding Reconciliation (Pre-Remediation)

| ID | Original finding | Status (round 1) | Evidence |
|----|------------------|------------------|----------|
| R1 | `specimen-scan` route fails in Expo Go (`Cannot find native module 'ExpoCamera'`) | **STILL OPEN** | `app/specimen-scan.tsx` top-level `import` from `expo-camera` |
| R2 | RevenueCat `setLogLevel` of null in Expo Go | **STILL OPEN** | `RevenueCatAdapter.ts` called `Purchases.setLogLevel` without native guard |
| R3 | Intermittent sync hydration `cannot rollback - no transaction is active` | **STILL OPEN** | Back-to-back `auto-queue` + `auto-bootstrap` hydration; no debounce/mutex |
| R4 | Photo restore HTTP 400 during hydration | **NOT ACTIONABLE** (code) | Missing/invalid Supabase Storage objects — operator/data repair |
| R5 | `origin` of undefined in expo-router `Sitemap.js` | **NOT ACTIONABLE** | Dev-only expo-router sitemap noise |
| R6 | `sync.conflict.observed` + `clockSkewSuspected` | **NOT ACTIONABLE** | Expected conflict resolver behavior (local wins) |
| R7 | AI manual test checklist doc | **PARTIALLY RESOLVED** | Doc authored; not yet committed |

---

## Remediation Implemented

| ID | Fix |
|----|-----|
| R1 | Thin route re-export; `SpecimenScanEntry` checks `isExpoCameraNativeAvailable()` and defers `require()` of camera screen to `useEffect` |
| R2 | `isRevenueCatNativeAvailable()` guard before `setLogLevel` / `configure` |
| R3 | 60s automatic hydration cooldown in `userDataSync.ts`; per-user hydration mutex in `remoteHydration.ts` |
| R7 | `docs/engineering/AI_MANUAL_TEST_CHECKLIST.md` + `docs/README.md` link |

---

## Round 2 — Finding Reconciliation (Post-Remediation)

| ID | Original finding | Status (round 2) | Evidence |
|----|------------------|------------------|----------|
| R1 | `specimen-scan` Expo Go crash | **FULLY RESOLVED** | `app/specimen-scan.tsx:1` re-exports entry only; `SpecimenScanEntry.tsx:4-6,34-36` native check + deferred require; `SpecimenScanCameraScreen.tsx` owns `expo-camera` |
| R2 | RevenueCat null native crash | **FULLY RESOLVED** | `revenueCatNative.ts:8-15`; `RevenueCatAdapter.ts:134-142` early return |
| R3 | Intermittent hydration transaction failure | **FULLY RESOLVED** | `userDataSync.ts:48-66,178-193` cooldown + skip log; `remoteHydration.ts:452-474` mutex |
| R4 | Photo restore HTTP 400 | **NOT ACTIONABLE** | Logged in `remoteHydration.ts:711-715`; requires storage object repair in Supabase |
| R5 | Sitemap `origin` undefined | **NOT ACTIONABLE** | Unchanged dev tooling noise |
| R6 | Sync conflict telemetry | **NOT ACTIONABLE** | Working as designed |
| R7 | AI manual test checklist | **FULLY RESOLVED** | `docs/engineering/AI_MANUAL_TEST_CHECKLIST.md`; linked from `docs/README.md` |

---

## Verification Run (Round 2)

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** |
| `npm test -- --runInBand` | **864/866 PASS** (2 failures unrelated to this remediation — see note) |
| Targeted remediation tests | **PASS** (`dev-runtime-remediation`, `user-data-sync`, `revenue-cat-*`, `specimen-scan`, `alert-screen-migrations`) |

**Note:** `tests/e2e/care-calendar-flow.test.tsx` fails to find visible text `Monstera` (calendar renders plant name in accessibility labels only). Pre-existing UI/test mismatch; not introduced by this changeset. `alert-screen-migrations` updated to assert camera pre-prompt on `SpecimenScanCameraScreen.tsx`.

---

## Release Decision

**Dev-runtime remediation: CERTIFIED** for the six log-derived findings within scope. Photo storage 400s remain an operational data task, not an app-code blocker for Expo Go stability.
