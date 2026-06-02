# Blocker 03 — Premium Feature Truthfulness Certification

**Status:** PASS (repository certification)  
**Verified:** 2026-06-02

## Scope

Free vs premium promises must be enforced in data paths (export, journal/library/dashboard care-log reads, plant detail history), not only in marketing copy. Cloud photo backup remains premium-gated via sync.

## Remediation Summary

| Area | Action | Evidence |
|------|--------|----------|
| Export policy | Central `exportAccessPolicy.ts` resolves mode via `canUseFeature('premium_export')` | `features/export/services/exportAccessPolicy.ts` |
| Basic export | Care logs and summary counts scoped to `FREE_CARE_LOG_HISTORY_DAYS` (60) | `exportService.ts` SQL + `includes.careLogHistoryLimitDays` |
| Premium export | Full care-log history, photo metadata, tags, snapshots, specimen tags | `exportService.ts` |
| Journal / library / dashboard | `useCareLogsForPlantIds` applies display window for free users | Hooks + tab screens |
| Streak analytics | `collection-streak` scope keeps full local logs for streak math | `useCareLogsForPlantIds.ts` |
| Plant detail | Existing `getFreeCareLogHistorySince()` in `plantsClient` | Unchanged, verified |
| Per-plant logs | `useLogs` applies free window when not premium | `useLogs.ts` |
| Export UI | Summary counts and copy reflect 60-day basic care-log limit | `app/export-collection-data.tsx` |
| Cloud photo backup | Deferred without premium (`supabaseSyncAdapter`) | Existing tests in `tests/services/supabase-sync-adapter.test.ts` |

## Free Tier Limits (enforced)

| Feature | Limit |
|---------|-------|
| Care log history (view + basic export) | Last 60 days |
| Basic export photos | Count only |
| Basic export tags / premium sections | Stripped |
| Cloud photo upload | Premium only |

## Verification Commands

```bash
npm test -- --testPathPattern="tests/features/export|tests/features/care-logs/use-care-logs" --runInBand
npm run typecheck
npm test -- --runInBand
```

## Results

| Check | Result |
|-------|--------|
| `tests/features/export/export-access-policy.test.ts` | **PASS** |
| `tests/features/export/export-service.test.ts` | **PASS** |
| `tests/features/care-logs/use-care-logs-for-plant-ids.test.ts` | **PASS** |
| Full suite | **561** tests — **PASS** |
| `npm run typecheck` | **PASS** |

## Deployment Checklist

1. Smoke-test free account: journal shows no logs older than 60 days; export JSON `includes.careLogHistoryLimitDays` is `60`.
2. Smoke-test premium account: full journal history; export includes photo metadata and `careLogHistoryLimitDays: null`.
3. Confirm sync defers photo upload when subscription lapses (existing downgrade flow).
