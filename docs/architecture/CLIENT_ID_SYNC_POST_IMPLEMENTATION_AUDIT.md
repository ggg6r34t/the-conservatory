# Client ID Sync — Post-Implementation Verification Audit

**Audit date:** June 3, 2026  
**Scope:** Local-first `client_id` / `remote_id` split, sync adapter, hydration, migrations, Backup Repair UUID failures, photo upload failures.  
**Method:** Code and test evidence only — no claims without file references.  
**Statuses:** **FULLY RESOLVED** · **PARTIALLY RESOLVED** · **STILL OPEN** · **DEFERRED** · **NOT ACTIONABLE**

---

## Release decision

### Audit #1 (pre-remediation pass)

**CONDITIONALLY CERTIFIED** — Core UUID mapping implemented in code; gaps in queue ordering, schema mirror, regression tests for reported IDs, and production migration deploy.

### Audit #2 (post-remediation pass)

**CONDITIONALLY CERTIFIED FOR SYNC ID FIX** — All code-verifiable findings **FULLY RESOLVED** except ops deploy and environmental photo/network issues (**NOT ACTIONABLE** in repo).

---

## Phase 1 — Finding reconciliation (audit #1)

| ID | Original finding | Status | Evidence |
|----|------------------|--------|----------|
| F1 | Plants sync fails: `invalid input syntax for type uuid` for `plant-{ts}-{rand}` | **FULLY RESOLVED** | `upsertByClientId` strips local `id`, sets `client_id`; `onConflict: user_id,client_id` — `clientIdMapping.ts:98-123`, `supabaseSyncAdapter.ts:527-534`; test `supabase-sync-adapter.test.ts` plant upsert |
| F2 | Care reminders fail with same UUID error for `reminder-{ts}-{rand}` | **FULLY RESOLVED** | `care_reminders` branch resolves `plant_id` to remote UUID — `supabaseSyncAdapter.ts:568-582`; test with production-shaped IDs `reminder-1780497725390-hkali992` |
| F3 | Supabase `id` must stay Postgres UUID; app IDs belong in separate column | **FULLY RESOLVED** | Migration `20260603160000_client_id_columns.sql`; docs `SYNC_AND_DATA_MODEL.md:74-83` |
| F4 | Local SQLite keeps custom `id`; cache cloud UUID in `remote_id` | **FULLY RESOLVED** | `migrations.ts` `CURRENT_SCHEMA_VERSION = 2`, `ensureColumn(..., remote_id)` — `migrations.ts:727-742`; `persistRemoteId` — `clientIdMapping.ts:45-57` |
| F5 | Child FK fields (`plant_id`, `care_log_id`, photo refs) must map to remote UUIDs on upload | **FULLY RESOLVED** | `resolveRemoteId` on all child entities — `supabaseSyncAdapter.ts:551-725` |
| F6 | Hydration must map remote rows back to local `client_id` keys | **FULLY RESOLVED** | `getLocalEntityId`, `buildRemoteToLocalIdMap` — `remoteHydration.ts:9-28`; inserts use `remote_id` — `remoteHydration.ts:724+` |
| F7 | Deletes must target `client_id`, not local id as uuid | **FULLY RESOLVED** | `deleteByClientId` — `clientIdMapping.ts:126-144`; test delete by `client_id` |
| F8 | Parent-not-synced should defer, not retry-fail UUID errors | **FULLY RESOLVED** | `PARENT_NOT_SYNCED` — `syncOutcomes.ts`; `buildParentNotSyncedOutcome`; deferred test for reminders |
| F9 | Remote hydration / adapter unit tests | **FULLY RESOLVED** | `client-id-mapping.test.ts`, `remote-hydration.test.ts`, `supabase-sync-adapter.test.ts` |
| F10 | Production Supabase migration not applied | **NOT ACTIONABLE** | Requires `supabase db push` / dashboard on user project |
| F11 | Photos: `Network request failed` on INSERT | **PARTIALLY RESOLVED** | Upload path unchanged for connectivity; improved error message on local `fetch` failure — `supabaseSyncAdapter.ts:436-448`; test rejects with readable message. Storage/network outages remain environmental |
| F12 | `database/schema.sql` missing `client_id` | **STILL OPEN** | Canonical file had no `client_id` before remediation |
| F13 | Sync queue FIFO only — children may run before plants | **STILL OPEN** | `sync.ts:155` `ORDER BY queued_at ASC` only |
| F14 | Certification test for `client_id` migration | **STILL OPEN** | No static test referenced migration file |
| F15 | SQLite migration test for `remote_id` columns | **STILL OPEN** | `database-migrations-integrity.test.ts` lacked assertion |
| F16 | `feature_usage` uses `client_id` upsert | **FULLY RESOLVED** | `supabaseSyncAdapter.ts:727-736`; migration includes `feature_usage` |

---

## Phase 2 — Remediation implemented (audit #1 → #2)

| ID | Action | Evidence |
|----|--------|----------|
| F12 | Added `client_id` + unique indexes to `database/schema.sql` | `database/schema.sql` tables + `idx_*_user_client_id` |
| F13 | Dependency-ordered queue processing | `syncEntityPriority.ts`; `sync.ts` `sort(compareSyncQueueItems)`; `sync-entity-priority.test.ts` |
| F14 | Static certification for migration | `supabase-security-certification.test.ts` client_id test |
| F15 | Migration integrity for `remote_id` | `database-migrations-integrity.test.ts` schema v2 test |
| F2 | Regression test with user-reported reminder/plant id shapes | `supabase-sync-adapter.test.ts` care reminder tests |
| F8 | Deferred reminder when parent missing | Same file, `PARENT_NOT_SYNCED` test |
| F11 | Clearer photo read failure message | `supabaseSyncAdapter.ts` + network fetch test |
| — | Documentation queue ordering | `SYNC_AND_DATA_MODEL.md` sync behavior section |

---

## Phase 3 — Finding reconciliation (audit #2)

| ID | Original finding | Status | Evidence |
|----|------------------|--------|----------|
| F1 | Plants UUID sync error | **FULLY RESOLVED** | Unchanged; tests pass |
| F2 | Care reminders UUID sync error | **FULLY RESOLVED** | Production-shaped ID test |
| F3 | Separate `client_id` column on Supabase | **FULLY RESOLVED** | Migration + schema mirror + certification test |
| F4 | Local `remote_id` cache | **FULLY RESOLVED** | Migration test + adapter persist |
| F5 | FK resolution on upload | **FULLY RESOLVED** | Adapter branches + tests |
| F6 | Hydration mapping | **FULLY RESOLVED** | `remote-hydration.test.ts` |
| F7 | Delete by `client_id` | **FULLY RESOLVED** | Delete tests |
| F8 | Parent deferral | **FULLY RESOLVED** | Deferred reminder test + queue priority |
| F9 | Test coverage | **FULLY RESOLVED** | Full Jest run (see verification) |
| F10 | Migration deploy to production | **NOT ACTIONABLE** | Ops step outside repository |
| F11 | Photo network failures | **PARTIALLY RESOLVED** | Readable local-read errors; live network/storage still user-environment |
| F12 | Schema canonical parity | **FULLY RESOLVED** | `database/schema.sql` updated |
| F13 | Queue dependency order | **FULLY RESOLVED** | `syncEntityPriority.ts` + tests |
| F14 | Migration certification | **FULLY RESOLVED** | Security certification test |
| F15 | SQLite `remote_id` migration test | **FULLY RESOLVED** | Integrity test |
| F16 | `feature_usage` client_id | **FULLY RESOLVED** | Adapter + migration |

---

## Verification run (audit #2)

Commands (must pass for certification):

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

**Audit #2 run (2026-06-03):** `npm run typecheck` PASS · `npm run lint` 0 errors (9 pre-existing warnings) · `npm test -- --runInBand` **746** tests PASS (191 suites)

Target suites for this feature:

- `tests/services/supabase-sync-adapter.test.ts`
- `tests/services/client-id-mapping.test.ts`
- `tests/services/remote-hydration.test.ts`
- `tests/services/sync-entity-priority.test.ts`
- `tests/services/database-migrations-integrity.test.ts`
- `tests/supabase/supabase-security-certification.test.ts`

---

## User recovery checklist (post-deploy)

1. Apply `supabase/migrations/20260603160000_client_id_columns.sql` to the Supabase project.
2. Open **Backup Repair** → **Retry All** (or **Sync Now**).
3. Confirm plants succeed first; reminders and photos should follow in the same or next pass.
4. For photos still failing with network errors: verify device connectivity, `EXPO_PUBLIC_SUPABASE_URL`, storage bucket `photos`, and premium entitlement for photo backup.

---

## Summary counts

| Audit | Fully | Partial | Open | Deferred | Not actionable |
|-------|-------|---------|------|----------|----------------|
| #1 | 11 | 1 | 4 | 0 | 1 |
| #2 | 15 | 1 | 0 | 0 | 1 |

**Audit #2 verdict:** **PASS (repository)** for client ID sync — deploy migration and verify photo/network in production environment.
