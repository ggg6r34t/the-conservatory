# Cloud / stale photo hydration — verification audit (round 2)

**Date:** 2026-06-04  
**Preceded by:** `CLOUD_PHOTO_HYDRATION_AUDIT_ROUND1_2026-06-04.md`  
**Rule:** Claims without file + test evidence are **Still Open**.

---

## Executive summary

Round 2 closes cloud/stale photo display gaps for list and detail: unified hydration, managed-file existence check, conditional signed-URL fetch, and automated tests.

---

## Finding register (round 2)

| ID | Finding | Status | Code evidence | Test evidence |
| --- | --- | --- | --- | --- |
| C-01 | Full `listPlants` hydration | **Fully Resolved** | `plantsClient.ts` L490–491 `hydratePhotosForDisplay(photos)` | `plants-client-list-photo-hydration.test.ts` |
| C-02 | Refresh from `storage_path` when local absent / invalid remote | **Fully Resolved** | `resolvePhotoRowForDisplay` L270–305 | Same test file (cloud-only case) |
| C-03 | Missing managed file cleared | **Fully Resolved** | `photoStorageService.ts` `managedPhotoFileExists`; used in `resolvePhotoRowForDisplay` | `photo-storage-service.test.ts`; hydration test |
| C-04 | 10-plant limit | **Not Actionable** | `FREE_PLANT_LIMIT` in `constants.ts`; unrelated to photo SELECT | — |
| C-05 | Conditional signed URL (no network when local OK) | **Fully Resolved** | `needsStorageSignedUrl` gate L281–286 | `plants-client-list-photo-hydration.test.ts` “does not request a signed URL…” |
| C-06 | List hydration test | **Fully Resolved** | — | `tests/features/plants/plants-client-list-photo-hydration.test.ts` |
| C-07 | `getPlantById` parity | **Fully Resolved** | `getPlantById` L635 `hydratePhotosForDisplay` | Same test file `hydrates getPlantById…` |
| C-08 | Image `onError` fallback | **Fully Resolved** | `PlantPhotoImage.tsx` `onError` + `PHOTO_DISPLAY_HARDENING_AUDIT_ROUND2_2026-06-04.md` H-04 | `plant-photo-resolver.test.ts` |
| C-09 | Missing `storage_path` in DB | **Deferred** | Sync/repair must restore metadata | User: Backup Repair + Sync Now |
| C-10 | Manual device QA | **Not Actionable** | — | Required for production sign-off |

---

## Related photo-display work (unchanged, still valid)

Local-first URI priority and `PlantPhotoImage` remain **Fully Resolved** per `PHOTO_DISPLAY_POST_IMPLEMENTATION_AUDIT_ROUND2_2026-06-04.md` (commit `5083b4c`). This audit adds **cloud/stale** hydration on top.

---

## Verification commands (executed)

```bash
npm run typecheck
npm test -- --testPathPattern="plants-client-list-photo-hydration|photo-storage-service|plant-photo-resolver|remote-hydration" --runInBand
```

---

## Round 2 verdict

**Engineering acceptance met** for “cloud-backed photo visible on Library/Dashboard when local file is missing or stale,” subject to `storage_path` existing in SQLite and Supabase being reachable.

**Device follow-up:** Reload app; run Sync Now; confirm affected plant on Library + Plant Details.
