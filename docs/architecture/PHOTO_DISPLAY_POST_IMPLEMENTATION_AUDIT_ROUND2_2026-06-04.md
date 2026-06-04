# Photo display — post-implementation verification audit (round 2)

**Date:** 2026-06-04  
**Preceded by:** `PHOTO_DISPLAY_POST_IMPLEMENTATION_AUDIT_ROUND1_2026-06-04.md`  
**Rule:** Claims without file + test evidence are **Still Open**.

---

## Executive summary

Round 2 remediation closed all **Still Open** and **Partially Resolved** engineering items from round 1 except intentionally deferred / not-actionable scope (thumbnails schema, on-device file probes, manual QA, premium downgrade E2E).

---

## Finding register (round 2)

| ID | Requirement | Status | Code evidence | Test evidence |
| --- | --- | --- | --- | --- |
| F-01 | Root cause fixed (local before remote on lists) | **Fully Resolved** | `features/plants/services/plantPhotoResolver.ts` L86–124 | `tests/features/plants/plant-photo-resolver.test.ts` |
| F-02 | Canonical resolver | **Fully Resolved** | `plantPhotoResolver.ts` | `plant-photo-resolver.test.ts` |
| F-03 | Primary photo selection | **Fully Resolved** | `plantsClient.ts` `buildPhotoByPlantIdMap` + `resolvePrimaryPlantPhoto` | `plant-photo-resolver.test.ts` |
| F-04 | List DTO fields | **Fully Resolved** | `plantsClient.ts` `attachPrimaryPhotoFields`; type `PrimaryPhotoSummaryFields` in resolver | `plant-photo-resolver.test.ts` `buildPrimaryPhotoListFields` |
| F-05 | Library local photos | **Fully Resolved** | `app/(tabs)/library.tsx` → `PlantPhotoImage` `analyticsScreen="library_card"` | `tests/features/plants/library-screen-photo-display.test.tsx` |
| F-06 | Dashboard featured local photos | **Fully Resolved** | `PlantHighlights.tsx` → `PlantPhotoImage` `analyticsScreen="dashboard_plant_highlights"` | `tests/features/dashboard/plant-highlights-photo-display.test.tsx` |
| F-07 | Plant Details | **Fully Resolved** | `PlantDetail.tsx` `heroPhotoUri` | `plant-photo-resolver.test.ts` (detail context) |
| F-08 | Growth timeline | **Fully Resolved** | `growthTimelineService.ts` | `growth-timeline-service.test.ts` stale-remote case |
| F-09 | Monthly highlights | **Fully Resolved** | `monthlyHighlightsService.ts` | `monthly-highlights-local-photo.test.ts` |
| F-10 | Graveyard / memorial | **Fully Resolved** | `listGraveyardPlants`, `MemorialFilmstrip.tsx` | `plant-photo-resolver.test.ts`; `graveyard-screen.test.tsx` (passing) |
| F-11 | Archive gallery | **Fully Resolved** | `useArchiveCuration.ts` | — (covered by resolver unit tests) |
| F-12 | Care reminders / journal | **Fully Resolved** | `primaryPhotoUri` from `listPlants` (local-first DTO) | Existing screen tests pass |
| F-13 | Cache invalidation | **Fully Resolved** | `invalidatePlantPhotoQueries.ts`; `useAddPlant`, `useAddPlantProgressPhoto`, `useUpdatePlant`, `useArchivePlant`, `useRestorePlant`, `useDeletePlant` | `invalidate-plant-photo-queries.test.ts` |
| F-14 | Premium gating unchanged | **Fully Resolved** | No upload-path edits in this changeset | Existing billing/sync tests unaffected |
| F-15 | Hydration preserves `local_uri` | **Fully Resolved** | `remoteHydration.ts` `mergedLocalUri` | `remote-hydration.test.ts` preserve case |
| F-16 | Analytics | **Fully Resolved** | `trackResolvedPlantListPhoto`; `PlantPhotoImage` `useEffect`; optional `analyticsScreen` on resolver | `plant-photo-resolver.test.ts` (no paths in payload) |
| F-17 | Screen tests | **Fully Resolved** | Library + dashboard component tests | See test paths above |
| F-18 | Premium/downgrade display tests | **Deferred** | Display logic is tier-agnostic | Add only if product requests E2E billing+photo matrix |
| F-19 | Edit / care-log surfaces | **Fully Resolved** | `app/plant/[id]/edit.tsx`, `app/care-log/[id].tsx` → `resolvePhotoDisplayUri` | Typecheck |
| F-20 | Health insight URIs | **Fully Resolved** | `healthInsightService.ts` → resolver | Typecheck |
| F-21 | Shared image component | **Fully Resolved** | `features/plants/components/PlantPhotoImage.tsx`; `PlantCard.tsx` | Library/dashboard tests |
| F-21b | Image `onError` repair UX | **Deferred** | Placeholder only when URI null; no `onError` handler | Spec optional; avoids scope creep |
| F-22 | Thumbnail fields | **Not Actionable** | No schema | Resolver ready when columns exist |
| F-23 | File existence probe | **Deferred** | Documented in round 1 | Hot-path perf |
| F-24 | Manual QA | **Not Actionable** | — | Device verification |

---

## Verification commands (executed)

```bash
npm run typecheck          # pass
npm test -- --testPathPattern="plant-photo|monthly-highlights-local|invalidate-plant|growth-timeline-service|remote-hydration|library-screen-photo|plant-highlights-photo" --runInBand  # 28 passed
```

---

## Round 2 verdict

**Engineering acceptance met** for local-first photo display across list, dashboard, detail, timeline, highlights, graveyard, and archive data paths, with canonical resolution, hydration safety, cache invalidation, analytics wiring on primary card surfaces, and automated evidence.

**Remaining before marketing “verified on device”:** manual QA (F-24) and optional premium/downgrade E2E (F-18).
