# Photo display hardening — post-implementation verification audit (round 1)

**Date:** 2026-06-04  
**Scope:** Graveyard regression follow-up, remaining photo URI gaps from cloud-hydration work  
**Rule:** Claims without file + test evidence are **Still Open**.

---

## Finding register (round 1)

| ID | Finding | Status | Code evidence | Test evidence |
| --- | --- | --- | --- | --- |
| H-01 | `managedPhotoFileExists` assumed any `file://` URI existed | **Fully Resolved** | `photoStorageService.ts` `File.info()` for all local URIs | `photo-storage-service.test.ts` legacy temp missing |
| H-02 | Graveyard/archive used stale list URIs without detail resolution | **Fully Resolved** | `attachGraveyardPhotoFields`; `listGraveyardPlants` detail context | `plants-client-list-photo-hydration.test.ts` graveyard case |
| H-03 | `photoRepair` did not clear missing managed files or re-download | **Fully Resolved** | `photoRepair.ts` `managedPhotoFileExists` + `downloadRemotePhotoAsset` | `tests/services/photo-repair.test.ts` |
| H-04 | `PlantPhotoImage` had no `onError` fallback | **Fully Resolved** | `PlantPhotoImage.tsx` `onError` + resolver fallbacks + `getStorageAssetUrl` | `plant-photo-resolver.test.ts` fallback helpers |
| H-05 | `healthSignalAnalysisService` counted ghost `localUri` rows | **Fully Resolved** | `healthSignalAnalysisService.ts` `resolvePhotoDisplayUri` filter | Existing `health-signal-analysis-service.test.ts` |
| H-06 | Import persisted ghost `localUri` when restore failed | **Fully Resolved** | `importService.ts` `managedPhotoFileExists` gate | `import-service.test.ts` ghost local case |
| H-07 | Graveyard/memorial/archive UI used raw `Image` without fallback | **Fully Resolved** | `graveyard.tsx`, `MemorialHero`, `MemorialFilmstrip`, `archive-gallery`, `MemorialEntrySheet`, `care-reminders`, `journal` → `PlantPhotoImage` | `graveyard-screen.test.tsx` (unchanged mocks) |
| H-08 | Archive curated pair `beforeUri`/`afterUri` raw images | **Partially Resolved** | URIs pre-resolved in `useArchiveCuration` via `resolvePhotoDisplayUri`; curated row still uses `Image` | `archive-gallery-screen.test.tsx` |
| H-09 | Missing `storage_path` in SQLite | **Deferred** | Requires sync/repair operator path | Backup Repair + Sync Now |
| H-10 | Profile avatar / feedback screenshots | **Not Actionable** | Separate `profilePhotoService` / upload flows | Out of plant photo scope |
| H-11 | Manual multi-device QA | **Not Actionable** | — | Production sign-off |

---

## Verification commands (round 1)

```bash
npm run typecheck
npm run lint
npm test -- --runInBand --testPathPattern="photo|graveyard|import-service|health-signal"
```
