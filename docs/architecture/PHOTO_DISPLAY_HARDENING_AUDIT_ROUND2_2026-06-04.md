# Photo display hardening — post-implementation verification audit (round 2)

**Date:** 2026-06-04  
**Preceded by:** `PHOTO_DISPLAY_HARDENING_AUDIT_ROUND1_2026-06-04.md`  
**Rule:** Claims without file + test evidence are **Still Open**.

---

## Executive summary

Round 2 closes all code-actionable photo URI gaps identified after the graveyard regression: DB repair, import hygiene, resolver fallbacks, `PlantPhotoImage` load recovery, and memorial/archive UI adoption.

---

## Finding register (round 2)

| ID | Finding | Status | Code evidence | Test evidence |
| --- | --- | --- | --- | --- |
| H-01 | `managedPhotoFileExists` disk truthfulness | **Fully Resolved** | `photoStorageService.ts` | `photo-storage-service.test.ts` |
| H-02 | Graveyard list/detail photo resolution | **Fully Resolved** | `plantsClient.ts` `attachGraveyardPhotoFields` | `plants-client-list-photo-hydration.test.ts` |
| H-03 | `photoRepair` missing-file + cloud restore | **Fully Resolved** | `photoRepair.ts` | `photo-repair.test.ts` |
| H-04 | `PlantPhotoImage` `onError` fallback | **Fully Resolved** | `PlantPhotoImage.tsx`; `resolvePhotoDisplayFallbackUri` | `plant-photo-resolver.test.ts` |
| H-05 | Health signal ghost photo filter | **Fully Resolved** | `healthSignalAnalysisService.ts` | `health-signal-analysis-service.test.ts` |
| H-06 | Import ghost `localUri` persistence | **Fully Resolved** | `importService.ts` | `import-service.test.ts` |
| H-07 | Memorial/archive UI raw `Image` | **Fully Resolved** | `graveyard.tsx`, `MemorialHero`, `MemorialFilmstrip`, `archive-gallery`, `MemorialEntrySheet`, `care-reminders`, `journal` | `graveyard-screen.test.tsx`; `archive-gallery-screen.test.tsx` |
| H-08 | Archive curated pair images | **Fully Resolved** | `archive-gallery.tsx` curated row uses `PlantPhotoImage` | `archive-gallery-screen.test.tsx` |
| H-09 | Missing `storage_path` in SQLite | **Deferred** | Operator: sync + Backup Repair | Not fixable in display layer alone |
| H-10 | Profile avatar / feedback assets | **Not Actionable** | `profilePhotoService.ts` | Separate product surface |
| H-11 | Manual multi-device QA | **Not Actionable** | — | Production sign-off |

---

## Related audits (status carry-forward)

| Prior ID | Document | Round 2 status |
| --- | --- | --- |
| C-08 | `CLOUD_PHOTO_HYDRATION_AUDIT_ROUND2` Image onError | **Fully Resolved** (superseded by H-04) |
| F-21b | Photo-display audit shared component | **Fully Resolved** via H-04 + H-07 |

---

## Verification commands (executed)

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

**Results:** typecheck PASS · lint PASS (0 errors; pre-existing warnings in unrelated files) · **857** tests PASS (220 suites)

---

## Release verdict

**PASS (repository)** — All actionable photo hardening findings are resolved or explicitly deferred/not actionable. Run graveyard/archive manual QA on a device with legacy cache photo paths to confirm visual recovery.
