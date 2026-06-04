# Sync Post-Implementation Verification Audit — June 4, 2026

Method: code + test evidence only. Statuses: **FULLY RESOLVED** · **PARTIALLY RESOLVED** · **DEFERRED** · **NOT ACTIONABLE** · **STILL OPEN**

---

## Audit pass 1 (pre–pass-2 remediation)

| ID | Original finding | Status | Evidence |
|----|------------------|--------|----------|
| F-01 | Premium-deferred photos blocked full sync + hydration | **FULLY RESOLVED** | `sync.ts` `markPremiumDeferred` + `countBlockingProcessable`; `userDataSync.ts` throws on `blockingRemaining` only; tests `sync-queue.test.ts`, `user-data-sync.test.ts` |
| F-02 | `deferred` queue status missing / diagnostics always 0 | **FULLY RESOLVED** | `SyncStatus` includes `deferred`; `getSyncQueueDiagnostics`; `profileClient` deferred counts |
| F-03 | Wrong-user sync possible | **FULLY RESOLVED** | `syncAuthGuard.ts` + `assertSyncItemMatchesAuthenticatedUser` in adapter; `sync-auth-guard.test.ts` |
| F-04 | `resolveRemoteId` lookup without `user_id` | **FULLY RESOLVED** | `clientIdMapping.ts:97-100` scoped `.eq("user_id", userId)` |
| F-05 | Backup UI treated deferred photos as generic pending/failure | **FULLY RESOLVED** | `syncHealthService.ts`, `cloudSyncStatusService.ts`, `useBackupStatus.ts` |
| F-06 | Repair did not retry `deferred` items | **FULLY RESOLVED** | `syncRepairService.ts` status list includes `deferred` |
| F-07 | Premium upgrade did not reactivate deferred queue rows | **FULLY RESOLVED** | `photoBackupRetry.ts` resets `deferred` → `pending` |
| F-08 | Users profile local→cloud bypassed outbox | **STILL OPEN** | `authClient.ts` direct `users` upsert (pre pass-2) |
| F-09 | `feature_usage` cloud→local hydration missing | **STILL OPEN** | No fetch in `hydrateRemoteUserData` (pre pass-2) |
| F-10 | Repair could not requeue orphaned `pending` rows | **STILL OPEN** | No orphan scanner (pre pass-2) |
| F-11 | Explicit `retrying` queue status | **DEFERRED** | `failed` + `next_retry_at` backoff used; UI label updated in `syncDiagnosticsService.ts` |
| F-12 | Production Supabase migrations deploy | **NOT ACTIONABLE** | Ops: `supabase db push` |
| F-13 | RLS / storage policies verification on live project | **NOT ACTIONABLE** | Ops / dashboard |
| F-14 | EAS production env vars | **NOT ACTIONABLE** | `config/env.ts` + EAS secrets |
| F-15 | client_id UUID mapping (historical) | **FULLY RESOLVED** | `CLIENT_ID_SYNC_POST_IMPLEMENTATION_AUDIT.md` + adapter tests |
| F-16 | Queue dependency ordering | **FULLY RESOLVED** | `syncEntityPriority.ts` + tests |
| F-17 | Sync instrumentation (safe ids/counts) | **FULLY RESOLVED** | `userDataSync.ts` `sync.run.*` / `sync.execution.*` logs |
| F-18 | False `synced` on premium skip | **FULLY RESOLVED** | Adapter returns `deferred`; no `markLocalSynced` for photos when deferred |
| F-19 | Parent-not-synced child rows | **FULLY RESOLVED** | `buildParentNotSyncedOutcome`; retryable `pending` deferral |
| F-20 | Conflict: pending local wins | **FULLY RESOLVED** | `conflictResolver.ts` + `remote-hydration.test.ts` |
| F-21 | `care_schedule_suggestions` sync | **FULLY RESOLVED** | `supabaseSyncAdapter.ts` branch + migration `20260605120000_*` |
| F-22 | Abandoned items visible | **FULLY RESOLVED** | `syncHealthService`, `sync-repair.tsx`, analytics in `sync.ts` |

---

## Pass 2 remediation (this session)

| ID | Action | Evidence |
|----|--------|----------|
| F-08 | Profile updates enqueue `users` via `enqueueSyncOperation`; adapter upserts | `authClient.ts`, `supabaseSyncAdapter.ts` users branch, adapter test |
| F-09 | Hydrate `feature_usage` with `max(local, remote)` merge | `remoteHydration.ts`, `remote-hydration.test.ts` |
| F-10 | `requeueOrphanedPendingSyncRecords` on repair retry | `syncRepairOrphans.ts`, `syncRepairService.ts`, `sync-repair-orphans.test.ts` |

---

## Audit pass 2 (post–pass-2 remediation)

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| F-01 | Premium-deferred blocking hydration | **FULLY RESOLVED** | Unchanged; tests pass |
| F-02 | `deferred` status + diagnostics | **FULLY RESOLVED** | Unchanged; tests pass |
| F-03 | Auth user match | **FULLY RESOLVED** | Unchanged; tests pass |
| F-04 | `resolveRemoteId` user scope | **FULLY RESOLVED** | Unchanged; tests pass |
| F-05 | Backup UI deferred state | **FULLY RESOLVED** | Unchanged; tests pass |
| F-06 | Repair retries deferred | **FULLY RESOLVED** | Unchanged; tests pass |
| F-07 | Premium photo requeue | **FULLY RESOLVED** | Unchanged; `photo-backup-retry.test.ts` |
| F-08 | Users profile outbox | **FULLY RESOLVED** | `authClient.ts:810-816`, adapter users branch, test |
| F-09 | `feature_usage` hydration | **FULLY RESOLVED** | `remoteHydration.ts` merge loop, test |
| F-10 | Orphan pending requeue | **FULLY RESOLVED** | `syncRepairOrphans.ts`, test |
| F-11 | `retrying` status column | **DEFERRED** | Semantic: failed + backoff; not a separate DB enum |
| F-12 | Migrations deploy | **NOT ACTIONABLE** | Repository only |
| F-13 | RLS / storage live verify | **NOT ACTIONABLE** | Repository only |
| F-14 | EAS env | **NOT ACTIONABLE** | Repository only |
| F-15 | client_id mapping | **FULLY RESOLVED** | Prior audit + tests |
| F-16 | Queue priority | **FULLY RESOLVED** | `users: 5` added |
| F-17 | Instrumentation | **FULLY RESOLVED** | Logs in `userDataSync.ts` |
| F-18 | No false photo synced | **FULLY RESOLVED** | Adapter + tests |
| F-19 | Parent deferral | **FULLY RESOLVED** | Unchanged |
| F-20 | Conflict rules | **FULLY RESOLVED** | Unchanged |
| F-21 | Care schedule suggestions | **FULLY RESOLVED** | Unchanged |
| F-22 | Abandoned visibility | **FULLY RESOLVED** | Unchanged |

---

## Entity matrix (pass 2)

| Entity | Local→cloud | Cloud→local | Tests |
|--------|-------------|---------------|-------|
| plants, care_logs, tags, reminders, schedules, snapshots, specimen_tags, archive_overrides, graveyard, preferences | FULLY | FULLY | adapter + hydration |
| photos | FULLY (premium-gated) | FULLY | adapter + hydration |
| feature_usage | FULLY | FULLY | adapter + hydration merge |
| users (profile) | FULLY | FULLY | adapter + hydration users tests |
| account deletion | Edge/auth path | N/A | edge tests |

---

## Verification commands (pass 2)

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

**Pass 2 run:** `npm run typecheck` PASS · `npm test --runInBand` **826** tests PASS (212 suites)

---

## Release verdict

**PASS (repository)** — All code-verifiable sync findings resolved or explicitly deferred/not actionable. Deploy migrations and verify RLS/storage in production before claiming live row-level sync health.
