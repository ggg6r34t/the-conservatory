# Cloud / stale photo hydration — verification audit (round 1)

**Date:** 2026-06-04  
**Trigger:** User with 10 active plants; one plant photo visible in cloud but not in app lists.  
**Rule:** Claims without file + test evidence are **Still Open**.

---

## Root cause (confirmed)

| Failure mode | Why list/detail failed |
| --- | --- |
| **Selective list hydration** | `listPlants` only called `hydratePhotosForDisplay` when `remote_url` and `local_uri` were both empty. Cloud rows with a **stale** `https://` `remote_url` never refreshed from `storage_path`. |
| **Ghost `local_uri`** | DB still pointed at a deleted managed file; resolver preferred local over cloud. |
| **Non-URL `remote_url`** | Storage path stored in `remote_url` was not re-signed. |

**Not a cause:** `FREE_PLANT_LIMIT` (10) — no code hides photos at the plant cap.

---

## Finding register (round 1 — before round 2 remediation)

| ID | Finding | Status | Evidence / gap |
| --- | --- | --- | --- |
| C-01 | Full `listPlants` photo hydration (parity with `getPlantById`) | **Partially Resolved** | `hydratePhotosForDisplay` on all rows added locally; **not committed**; no test yet |
| C-02 | Refresh display URL from `storage_path` when local absent | **Partially Resolved** | `resolvePhotoRowForDisplay` in `plantsClient.ts`; uncommitted |
| C-03 | Clear missing managed `local_uri` | **Partially Resolved** | `managedPhotoFileExists` added; uncommitted; no unit test |
| C-04 | 10-plant limit blocks photos | **Not Actionable** | `FREE_PLANT_LIMIT` only gates create; `listPlants` loads all active IDs |
| C-05 | Signed URL fetched on every list photo (perf) | **Still Open** | `getStorageAssetUrl` called whenever `storage_path` set, even with valid local file |
| C-06 | Automated list hydration test | **Still Open** | No `plants-client-list-photo-hydration.test.ts` in repo yet |
| C-07 | `getPlantById` / list parity test | **Still Open** | — |
| C-08 | Image `onError` fallback for broken URLs | **Deferred** | Out of cloud-hydration scope |
| C-09 | Photo row missing `storage_path` in SQLite | **Deferred** | Requires sync/repair on device; cannot fix in resolver alone |
| C-10 | Manual device QA | **Not Actionable** | — |

---

## Round 1 verdict

Engineering fix was **implemented locally** but **not fully verified** (tests, perf guard, audit docs, commit). Treat C-01–C-03 as **Partially Resolved** until tests pass and changes land on `main`.

See `CLOUD_PHOTO_HYDRATION_AUDIT_ROUND2_2026-06-04.md` after remediation.
