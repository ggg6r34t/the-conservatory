# Streak System Audit Report

**Date:** June 2, 2026  
**Status:** Remediated and verified

## Root Cause

The Profile streak appeared stuck because the app had **three incompatible streak implementations**:

| Location | Logic | Issue |
|----------|-------|-------|
| `app/profile.tsx` `computeCareStreak` | Local calendar days, all log types | Duplicated, DST-unsafe (`86400000` ms steps), not shared |
| `streakNudgeService.calculateCurrentStreakDays` | UTC `slice(0,10)` day keys | Wrong timezone vs Profile; ignored log type rules |
| `streakService.calculatePlantStreak` | Per-plant watering interval | Different metric entirely; unused in UI |

No SQLite streak table exists — streaks are **computed dynamically** from `care_logs` (correct for local-first).

## Business Logic (Post-Remediation)

- **Streak day:** At least one **qualifying** care action on a calendar day (user timezone).
- **Qualifying types:** water, feed, mist, prune, inspect, repot, pest — not `note`.
- **Multiple actions same day:** Count once.
- **Grace:** Activity today or yesterday keeps current streak alive.
- **Break:** No qualifying activity today or yesterday → current streak 0.
- **Longest streak:** Best consecutive run in history (computed, not persisted).

## Implementation

| Module | Role |
|--------|------|
| `features/plants/services/collectionStreakService.ts` | Single source of truth |
| `features/plants/hooks/useCollectionStreak.ts` | Shared hook; session `streak_broken` detection |
| `features/plants/services/streakAnalyticsHelpers.ts` | Timezone + event classification |
| `features/plants/services/streakAnalyticsService.ts` | Care-log and session analytics |
| `features/plants/components/StreakBadge.tsx` | Profile streak UI (`compact` variant) |
| `features/plants/hooks/useStreaks.ts` | Renamed to `useCollectionActivityCounts` (deprecated alias) |
| Profile | `useCollectionStreak` + `useFocusEffect` refetch + `StreakBadge` |
| Dashboard | `useCollectionStreak` (logs query retained for `UpcomingCare`) |
| AI nudge | Delegates to collection streak; timezone-aware cache day key |

## Post-Implementation Verification Matrix

Evidence standard: **code + tests**. Claims without both are unresolved.

| # | Finding | Round 1 | Round 2 | Evidence |
|---|---------|---------|---------|----------|
| 1 | Three incompatible streak calculators | Partially Resolved | **Fully Resolved** | `collectionStreakService.ts`; Profile/Dashboard/nudge all delegate |
| 2 | Profile inline `computeCareStreak` | Fully Resolved | **Fully Resolved** | Removed from `app/profile.tsx`; `profile-collection-streak.test.tsx` |
| 3 | UTC day keys in nudge service | Partially Resolved | **Fully Resolved** | `toLocalDayKeyFromDate` in `streakNudgeService.ts` + `useStreakRecoveryNudge.ts` |
| 4 | Qualifying log type filter | Fully Resolved | **Fully Resolved** | `QUALIFYING_STREAK_LOG_TYPES`; analytics ignores `note` |
| 5 | Profile refetch on focus | Fully Resolved | **Fully Resolved** | `useFocusEffect` → `refreshIfStale()` (respects 30s stale window) |
| 6 | Care log query invalidation | Fully Resolved | **Fully Resolved** | `invalidateCareLogQueries` in `useRecordCareEvent` |
| 7 | Analytics `streak_started/extended/maintained` | Partially Resolved | **Fully Resolved** | `streakAnalyticsService.ts` + `streak-analytics-service.test.ts` |
| 8 | Analytics `streak_broken` | Still Open | **Fully Resolved** | `trackStreakBrokenOnSession` in `useCollectionStreak.ts` |
| 9 | Analytics `streak_recovered` | Still Open | **Fully Resolved** | `classifyCareLogStreakEvent` when `beforeLongest > 0` |
| 10 | `useStreakRecoveryNudge` timezone | Partially Resolved | **Fully Resolved** | Passes `timeZone` from settings; query key uses local day key |
| 11 | Dashboard duplicate streak logic | Partially Resolved | **Fully Resolved** | Uses `useCollectionStreak`; separate logs query only for `UpcomingCare` |
| 12 | `useStreaks` hook misnamed | Still Open | **Fully Resolved** | Renamed `useCollectionActivityCounts`; deprecated alias retained |
| 13 | `StreakBadge` unused | Still Open | **Fully Resolved** | Wired in Profile stats card (`variant="compact"`) |
| 14 | `calculatePlantStreak` separate metric | Not Actionable | **Not Actionable** | Per-plant cadence; documented in `streakService.ts` |
| 15 | No SQLite streak table | Not Actionable | **Not Actionable** | Intentional local-first design |
| 16 | Streak test coverage | Partially Resolved | **Fully Resolved** | 11 collection + helpers + analytics + profile tests |
| 17 | Profile streak UI test | Still Open | **Fully Resolved** | `tests/features/profile/profile-collection-streak.test.tsx` |
| 18 | Longest streak in Profile UI | Deferred | **Deferred** | Computed; product chose current streak only |
| 19 | Onboarding “watering streaks” copy | Deferred | **Deferred** | Marketing copy; no functional impact |

## Round 3 — Profile Streak Flicker (June 2, 2026)

| # | Finding | Round 3 | Evidence |
|---|---------|---------|----------|
| 20 | Streak drops to 0 when `careLogsQuery.data` is undefined during refetch | **Fully Resolved** | `resolveDisplayStreak()` + `lastStableStreakRef` in `useCollectionStreak.ts`; `collection-streak-service.test.ts` |
| 21 | Unsorted plant IDs in care-log batch query key | **Fully Resolved** | `careLogsBatchQueryKey()` sorts IDs; `use-care-logs-for-plant-ids.test.ts` |
| 22 | No placeholder data during care-log refetch | **Fully Resolved** | `placeholderData: (previousData) => previousData` in `useCareLogsForPlantIds.ts` |
| 23 | Focus refetch bypassed stale window and forced redundant fetches | **Fully Resolved** | `refreshIfStale()` + 30s `staleTime` for `collection-streak` scope; `streak-flicker-remediation.test.ts` |
| 24 | Compact `StreakBadge` blended into stats card background | **Fully Resolved** | Compact variant uses transparent container; `StreakBadge.tsx` |
| 25 | Flicker regression test coverage | **Fully Resolved** | `streak-flicker-remediation.test.ts`, `resolveDisplayStreak` unit tests |

**Round 3 verdict:** **PASS** — 0 Still Open · 0 Partial

## Verification Commands

```bash
npm test -- --runInBand --testPathPattern="collection-streak|streak-analytics|streak-nudge|streak-service|profile-collection-streak|streak-flicker|use-care-logs"
npm run typecheck
```

## Launch Readiness

**PASS** — unified streak logic, timezone-safe day keys, qualifying actions only, full analytics surface, Profile refetch on focus, automated regression coverage.

## Retention Philosophy

**Keep:** Calm daily rhythm metric, gentle AI nudge copy, no guilt notifications.  
**Modify:** Unified logic, timezone-safe, qualifying actions only.  
**Remove:** Duplicate calculators, UTC-only day keys.
