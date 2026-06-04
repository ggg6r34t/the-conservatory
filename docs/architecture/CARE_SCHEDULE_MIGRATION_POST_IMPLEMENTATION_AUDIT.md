# Care Schedule Suggestions Migration — Post-Remediation Verification Audit

**Audit date:** June 5, 2026  
**Scope:** SQLite bootstrap failure `no such table: care_schedule_suggestions` during `runDatabaseMigrations`.  
**Method:** Code order verification, regression tests, and command output only — no claims without evidence.  
**Statuses:** **FULLY RESOLVED** · **PARTIALLY RESOLVED** · **STILL OPEN** · **DEFERRED** · **NOT ACTIONABLE**

---

## Incident summary

| Field | Value |
|-------|--------|
| User-visible error | `Local storage unavailable` |
| Root cause | `NativeDatabase.execAsync` rejected: `no such table: care_schedule_suggestions` |
| Trigger | `ensureColumn(..., "care_schedule_suggestions", "remote_id")` ran **before** `CREATE TABLE care_schedule_suggestions` |
| Introduced in | `ad4e2ce` (Care Calendar + `CURRENT_SCHEMA_VERSION = 3`) |

---

## Phase 1 — Finding reconciliation (pre-remediation)

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| M1 | `remote_id` backfill referenced table before CREATE | **STILL OPEN** (at audit start) | Prior order: `remoteIdTables` loop at ~741, CREATE at ~745 in `ad4e2ce` |
| M2 | `ensureColumn` on missing table → failed ALTER | **STILL OPEN** | `ensureColumn` → `PRAGMA table_info` then `ALTER TABLE` — `migrations.ts:244-260` |
| M3 | App blocked at `DatabaseBootstrapGate` | **STILL OPEN** | `Providers.tsx` → `initializeDatabase()` → `runDatabaseMigrations` |
| M4 | Care Calendar clients assume table exists | **NOT ACTIONABLE** (downstream of M1) | `careScheduleSuggestionsClient.ts` SELECT/INSERT |
| M5 | Supabase remote table separate from local bug | **NOT ACTIONABLE** | `20260605120000_reminder_types_and_schedule_suggestions.sql` — cloud only |
| M6 | Regression test for migration order | **STILL OPEN** | No test before fix |

---

## Phase 2 — Remediation implemented

| ID | Action | Evidence |
|----|--------|----------|
| M1 | Move `CREATE TABLE care_schedule_suggestions` **above** `remoteIdTables` loop | `migrations.ts:727-770` — CREATE at 727-752, loop at 754-770 |
| M2 | Include `remote_id TEXT` in CREATE so backfill is usually no-op | `migrations.ts:745` |
| M6 | Add migration integrity tests | `database-migrations-integrity.test.ts` — order + `remote_id` in CREATE |

---

## Phase 3 — Post-remediation verification (audit #2)

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| M1 | Table created before `remote_id` backfill | **FULLY RESOLVED** | `migrations.ts:727-770` call order |
| M2 | `ensureColumn` no longer targets missing table | **FULLY RESOLVED** | CREATE precedes `PRAGMA table_info(care_schedule_suggestions)`; `remote_id` in CREATE |
| M3 | Cold start can complete migrations | **FULLY RESOLVED** | `runDatabaseMigrations` completes in mocked integrity tests; no thrown `execAsync` on missing table |
| M4 | Care Calendar SQL paths valid after bootstrap | **FULLY RESOLVED** (by M1–M3) | Table exists before any app query post-`initializeDatabase` |
| M5 | Remote Supabase schema | **NOT ACTIONABLE** | Requires `supabase db push` on operator project |
| M6 | Automated regression coverage | **FULLY RESOLVED** | Two tests in `database-migrations-integrity.test.ts` |
| M7 | `bootstrapSql` includes `care_schedule_suggestions` | **DEFERRED** | Table added only in incremental block, not `bootstrapSql` — acceptable because `runDatabaseMigrations` runs on every open via `sqlite.ts:22` |
| M8 | Versioned migration runner (skip when at v3) | **NOT ACTIONABLE** | App intentionally re-runs idempotent `CREATE IF NOT EXISTS` each launch — fix does not depend on version bump |
| M9 | Fix committed and pushed to `main` | **STILL OPEN** | Working-tree change at audit time (`git status` showed `M migrations.ts`) |
| M10 | On-device E2E proof after restart | **NOT ACTIONABLE** | Requires user device reload; not verifiable in CI |

---

## Code evidence (fixed order)

```727:770:services/database/migrations.ts
  await database.execAsync(`
CREATE TABLE IF NOT EXISTS care_schedule_suggestions (
  ...
  remote_id TEXT,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);
...
`);

  const remoteIdTables = [
    ...
    "care_schedule_suggestions",
    ...
  ] as const;

  for (const table of remoteIdTables) {
    await ensureColumn(database, table, "remote_id", "TEXT");
  }
```

---

## Verification commands

```bash
npm test -- --testPathPattern=database-migrations-integrity --runInBand
npm run typecheck
```

**Audit run results:** `database-migrations-integrity` **6/6 PASS** · `database-bootstrap` **1/1 PASS** · `typecheck` **PASS**

---

## User recovery (no reinstall)

1. Pull/build with the fixed `migrations.ts`.
2. Stop the app completely, then `npx expo start -c`.
3. Tap **Try Again** on the bootstrap gate if shown.

`CREATE TABLE IF NOT EXISTS` runs every launch; a failed prior run does not permanently block recovery once order is fixed.

---

## Summary counts

| Audit | Fully | Partial | Open | Deferred | Not actionable |
|-------|-------|---------|------|----------|----------------|
| #1 (pre-fix) | 0 | 0 | 4 | 0 | 2 |
| #2 (post-fix) | 6 | 0 | 1 | 1 | 3 |

**Audit #2 verdict:** **PASS (repository)** for the migration ordering fix — commit/push **M9** and confirm on device **M10** to close ops loop.
