# Phase 02 — Core Data Operations Certification

**Status:** PASS (repository certification)  
**Verified:** 2026-06-02

## Scope

Close audit gaps for graveyard restore, care-log deletion, and graveyard list accuracy. Sync hardening for `deleted_before_sync` was completed in Blocker 02 (see `tests/services/sync-queue.test.ts`).

## Remediation Summary

| Area | Action | Evidence |
|------|--------|----------|
| Plant restore | `restorePlantFromGraveyard()` sets `status = 'active'`, deletes memorial row, sync outbox | `features/plants/api/plantsClient.ts` |
| Free plant limit on restore | Same `FREE_PLANT_LIMIT` guard as create/import | `restorePlantFromGraveyard`, `useRestorePlant` |
| Memorial UI | "Return to Collection" on memorial detail with confirm + navigation | `app/memorial/[id].tsx`, `MemorialFooter.tsx` |
| Graveyard list | Only plants with `status = 'graveyard'` appear | `listGraveyardPlants` SQL |
| Care log delete | `deleteCareLog()` removes tags + log, queues sync deletes | `features/care-logs/api/careLogsClient.ts` |
| Delete UI | Long-press on activity timeline entries | `app/plant/[id]/activity.tsx`, `PlantActivityRow.tsx` |
| Misleading copy | Memorial footer "Restore Journal" renamed to "Edit Memorial" | `MemorialFooter.tsx` |

## Verification Commands

```bash
npm test -- --testPathPattern="plants-client-restore|care-logs-client-delete|sync-queue" --runInBand
npm run typecheck
npm test -- --runInBand
```

## Results

| Check | Result |
|-------|--------|
| `tests/features/plants/plants-client-restore.test.ts` | **PASS** |
| `tests/features/care-logs/care-logs-client-delete.test.ts` | **PASS** |
| `tests/services/sync-queue.test.ts` | **PASS** (existing) |
| Full suite | **572** tests — **PASS** |
| `npm run typecheck` | **PASS** |

## Manual Smoke Checklist

1. Archive a plant → appears in Graveyard.
2. Open memorial → **Return to Collection** → plant returns to Library.
3. Open plant activity → long-press a log → delete → entry disappears after sync invalidate.
