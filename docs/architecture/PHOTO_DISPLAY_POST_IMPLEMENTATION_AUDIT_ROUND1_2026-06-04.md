# Photo display — post-implementation verification audit (round 1)

**Date:** 2026-06-04  
**Scope:** Original 12-phase photo display remediation spec  
**Rule:** Claims without file + test evidence are **Still Open**.

---

## Executive summary

The first implementation fixed the core list-vs-detail URI priority bug and unified most data paths. Several spec items were **Partially Resolved** or **Still Open** because analytics was not wired to UI, cache invalidation was incomplete, screen-level tests were missing, and a few surfaces still used inline `localUri ?? remoteUrl` instead of the canonical resolver.

---

## Finding register (round 1)

| ID | Original finding / requirement | Status | Evidence (round 1) | Gap |
| --- | --- | --- | --- | --- |
| F-01 | Root cause: list preferred `remoteUrl` over `localUri` | **Fully Resolved** | `features/plants/services/plantPhotoResolver.ts` (`resolvePhotoDisplayUri`); removed remote-first logic from `plantsClient.ts` | — |
| F-02 | Canonical resolver with card/detail priority | **Fully Resolved** | `plantPhotoResolver.ts`; `growthTimelineService.ts` delegates | — |
| F-03 | Primary photo selection (not first row only) | **Fully Resolved** | `resolvePrimaryPlantPhoto` + `buildPhotoByPlantIdMap` in `plantsClient.ts` | — |
| F-04 | Plant list DTO fields (`primaryPhotoLocalUri`, etc.) | **Fully Resolved** | `buildPrimaryPhotoListFields` / `attachPrimaryPhotoFields` in `plantsClient.ts` | — |
| F-05 | Library cards show local photos | **Fully Resolved** (data) / **Partially Resolved** (UI telemetry) | `app/(tabs)/library.tsx` uses `primaryPhotoUri`; resolver tests | No `PlantPhotoImage`; no library screen test |
| F-06 | Dashboard / Garden featured photos | **Fully Resolved** (data) / **Partially Resolved** (UI telemetry) | `PlantHighlights.tsx` → `primaryPhotoUri` | No dashboard screen test; no analytics wiring |
| F-07 | Plant Details unchanged / correct | **Fully Resolved** | `PlantDetail.tsx` `heroPhotoUri` + resolver | — |
| F-08 | Growth timeline local progress photos | **Fully Resolved** | `resolveGrowthTimelinePhotoUri` → resolver | No stale-remote vs local timeline test |
| F-09 | Monthly highlights local URIs when eligible | **Fully Resolved** | `monthlyHighlightsService.ts` + `monthly-highlights-local-photo.test.ts` | — |
| F-10 | Graveyard / memorial list photos | **Fully Resolved** | `listGraveyardPlants` + `MemorialFilmstrip.tsx` resolver | — |
| F-11 | Archive gallery before/after local URIs | **Fully Resolved** | `useArchiveCuration.ts` `resolvePhotoDisplayUri` | — |
| F-12 | Care reminders / journal list photos | **Fully Resolved** (data) | Consume `primaryPhotoUri` from `listPlants` | Raw `Image`, no shared component |
| F-13 | Cache invalidation on photo change | **Partially Resolved** | `invalidatePlantPhotoQueries.ts`; wired in add/update/progress hooks only | Missing archive/restore/delete; no `["photos"]` on archive |
| F-14 | Premium cloud backup gating unchanged | **Fully Resolved** | No changes to upload deferral paths | — |
| F-15 | Hydration must not wipe `local_uri` | **Partially Resolved** | `remoteHydration.ts` `mergedLocalUri` | No automated test |
| F-16 | Analytics events (`plant_photo_*`) | **Partially Resolved** | Events defined in resolver behind `analyticsScreen` | **No production screen passed `analyticsScreen`** |
| F-17 | Screen tests (library, dashboard, detail, timeline, highlights, graveyard) | **Partially Resolved** | Resolver + highlights service tests only | No library/dashboard component tests |
| F-18 | Premium/downgrade display tests | **Still Open** | — | Not implemented |
| F-19 | Edit plant / care-log modal photo URI | **Partially Resolved** | Inline `localUri ?? remoteUrl` (correct order, not canonical) | `app/plant/[id]/edit.tsx`, `app/care-log/[id].tsx` |
| F-20 | Health insight photo URIs | **Partially Resolved** | `healthInsightService.ts` inline local-first map | Not using resolver |
| F-21 | Shared image component + load failure UX | **Still Open** | — | No `PlantPhotoImage`; no `onError` placeholder |
| F-22 | Thumbnail URI fields | **Not Actionable** | No DB columns | Per spec: do not block |
| F-23 | Local file existence probe on list path | **Deferred** | Intentionally omitted (perf) | Per audit acceptance |
| F-24 | Manual QA checklist | **Not Actionable** | Requires device | — |

---

## Round 1 verdict

**Not launch-complete** against the original enterprise checklist: analytics wiring, full cache invalidation, screen tests, and canonical resolver adoption on remaining surfaces were incomplete.

---

## Remediation queued (round 2)

1. `PlantPhotoImage` + analytics on library/dashboard/card  
2. Canonical resolver on edit, care-log, health insight  
3. `invalidatePlantPhotoQueries` on archive/restore/delete  
4. Hydration preservation test  
5. Timeline stale-remote test  
6. Library + dashboard screen tests  

See `PHOTO_DISPLAY_POST_IMPLEMENTATION_AUDIT_ROUND2_2026-06-04.md`.
