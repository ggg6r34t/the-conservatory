# Photo display verification audit (2026-06-04)

> **Superseded for strict status tracking by:**  
> - Round 1: [`PHOTO_DISPLAY_POST_IMPLEMENTATION_AUDIT_ROUND1_2026-06-04.md`](./PHOTO_DISPLAY_POST_IMPLEMENTATION_AUDIT_ROUND1_2026-06-04.md)  
> - Round 2: [`PHOTO_DISPLAY_POST_IMPLEMENTATION_AUDIT_ROUND2_2026-06-04.md`](./PHOTO_DISPLAY_POST_IMPLEMENTATION_AUDIT_ROUND2_2026-06-04.md)  
> - **Cloud/stale URLs:** [`CLOUD_PHOTO_HYDRATION_AUDIT_ROUND2_2026-06-04.md`](./CLOUD_PHOTO_HYDRATION_AUDIT_ROUND2_2026-06-04.md)

## Root cause

List and summary surfaces resolved `primaryPhotoUri` with **remote URL before local URI**, while Plant Details used **local URI before remote URL**. Free users with local-only photos (or stale/expired `remote_url` from partial sync) saw photos on detail but not on Library, Dashboard, Highlights, etc.

## Phase 1 — Pipeline audit (confirmed)

| Stage | Plant Details | List / cards (before fix) |
| --- | --- | --- |
| Photo load | `getPlantById` → `hydratePhotosForDisplay` | `listPlants` → raw rows + selective hydrate |
| Display URI | `localUri ?? remoteUrl` | `remoteUrl` then `localUri` in `resolveRenderablePhotoUri` |
| Primary pick | `isPrimary === 1` then `[0]` | First row per plant in map (order-only) |

## Implementation summary

- Canonical resolver: `features/plants/services/plantPhotoResolver.ts`
- List DTOs: `buildPrimaryPhotoListFields` on `listPlants` / `listGraveyardPlants`
- Primary selection: `resolvePrimaryPlantPhoto` in `buildPhotoByPlantIdMap`
- Hydration safety: preserve existing `local_uri` when remote restore fails (`remoteHydration.ts`)
- Cache: `invalidatePlantPhotoQueries` on add/update/progress photo mutations

---

## Screen / surface status

### Plant Details — FULLY IMPLEMENTED

- **File:** `features/plants/components/PlantDetail.tsx`
- **Evidence:** `heroPhotoUri` via `resolvePhotoDisplayUri(..., { context: "detail" })`
- **Tests:** `tests/features/plants/plant-photo-resolver.test.ts` (detail priority)

### Library — FULLY IMPLEMENTED

- **File:** `app/(tabs)/library.tsx` (uses `plant.primaryPhotoUri`)
- **Data:** `features/plants/api/plantsClient.ts` → `listPlants` + `attachPrimaryPhotoFields`
- **Tests:** `tests/features/plants/plant-photo-resolver.test.ts` (card local-over-remote)

### Dashboard / Garden — FULLY IMPLEMENTED

- **Files:** `features/dashboard/components/PlantHighlights.tsx`, `features/dashboard/hooks/useDashboard.ts` → `useAllActivePlants` → `listPlants`
- **Tests:** resolver tests; dashboard hook unchanged (consumes `primaryPhotoUri`)

### Growth Timeline — FULLY IMPLEMENTED

- **File:** `features/plants/services/growthTimelineService.ts` → `resolveGrowthTimelinePhotoUri` delegates to resolver (`detail`)
- **Tests:** `tests/features/journal/monthly-highlights-local-photo.test.ts` (progress local URI)

### Monthly Highlights — FULLY IMPLEMENTED

- **Files:** `features/journal/services/monthlyHighlightsService.ts`, `features/journal/hooks/useMonthlyHighlights.ts`
- **Tests:** `tests/features/journal/monthly-highlights-local-photo.test.ts`

### Graveyard / Memorial — FULLY IMPLEMENTED

- **Files:** `features/plants/api/plantsClient.ts` (`listGraveyardPlants`), memorial/archive UI via `primaryPhotoUri`
- **Filmstrip:** `features/plants/components/MemorialFilmstrip.tsx` uses resolver
- **Tests:** resolver primary selection test

### Archive Gallery — FULLY IMPLEMENTED

- **File:** `features/ai/hooks/useArchiveCuration.ts` — `resolvePhotoDisplayUri` for before/after URIs
- **Screen:** `app/archive-gallery.tsx` (memorial `primaryPhotoUri` from graveyard list)

### Care Reminders / Search lists — FULLY IMPLEMENTED

- **Files:** `app/care-reminders.tsx`, `app/(tabs)/journal.tsx` — `primaryPhotoUri` from `listPlants`

### Cache invalidation — FULLY IMPLEMENTED

- **File:** `features/plants/hooks/invalidatePlantPhotoQueries.ts`
- **Wired:** `useAddPlant`, `useAddPlantProgressPhoto`, `useUpdatePlant`
- **Tests:** `tests/features/plants/invalidate-plant-photo-queries.test.ts`

### Premium gating — FULLY IMPLEMENTED (unchanged)

- No change to cloud backup deferral or upload gates; display does not require premium.

### Sync / hydration — FULLY IMPLEMENTED

- **File:** `services/database/remoteHydration.ts` — merge `local_uri` on photo replace

### Analytics — FULLY IMPLEMENTED

- **File:** `features/plants/services/plantPhotoResolver.ts` — optional `analyticsScreen` → `plant_photo_*` events (no paths/URLs)

### Thumbnail fields — NOT IMPLEMENTED (not in schema)

- Resolver supports thumbnail keys when added later; no DB columns today.

### Local file existence probe — NOT IMPLEMENTED

- Avoided on list hot path; resolver uses stored URIs only.

---

## Test commands

```bash
npm run typecheck
npm test -- --testPathPattern="plant-photo-resolver|monthly-highlights-local|invalidate-plant-photo"
npm run lint
```

## Manual QA

See product checklist in implementation request (free / premium / downgrade flows).
