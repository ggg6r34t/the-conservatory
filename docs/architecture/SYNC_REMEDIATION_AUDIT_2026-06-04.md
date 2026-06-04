# Sync Remediation Audit — June 4, 2026

## Root cause (confirmed)

**Premium-deferred photo queue items were re-queued as `pending`, counted in `remaining`, and caused `runUserDataSync` to throw before cloud hydration.**

Evidence:

- `sync.ts` `markDeferred` reset status to `pending` for all deferrals.
- `userDataSync.ts` threw when `report.remaining > 0`, blocking `hydrateRemoteUserData`.
- Free users with progress photos therefore saw repeated sync failures and no cloud→local reconciliation.

## Remediation

| Change | File(s) |
|--------|---------|
| Premium deferrals use terminal `deferred` queue status | `sync.ts` |
| `blockingRemaining` excludes `deferred` from sync-run failure | `sync.ts`, `userDataSync.ts` |
| Hydration runs when only premium-deferred work remains | `userDataSync.ts` |
| Auth user must match queue item owner | `syncAuthGuard.ts`, `supabaseSyncAdapter.ts` |
| `resolveRemoteId` scopes lookup by `user_id` | `clientIdMapping.ts` |
| Backup UI surfaces deferred photos separately | `syncHealthService.ts`, `cloudSyncStatusService.ts`, `profileClient.ts` |
| Repair + premium upgrade requeue `deferred` photos | `syncRepairService.ts`, `photoBackupRetry.ts` |

## Verification

```bash
npm run typecheck
npm run lint
npm test -- --runInBand --testPathPattern="sync|hydration|supabase|backup"
```

## Ops checklist (not actionable in repo)

1. Apply Supabase migrations (`client_id` unique constraints, reminder types, etc.).
2. Confirm RLS `auth.uid() = user_id` on all synced tables.
3. Confirm `photos` storage bucket policies for authenticated paths.
4. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` on EAS production.
