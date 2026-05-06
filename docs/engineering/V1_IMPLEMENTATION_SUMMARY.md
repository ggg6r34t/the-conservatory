# V1 Implementation Summary

## Purpose

This document captures the completed V1 product and engineering work across The Conservatory so the team has a single implementation-focused reference for what shipped, what canonical sources were introduced, and what repo-wide follow-up remains non-blocking.

## Summary Table

| Area                                    | V1 Outcome                                                                                                               | Canonical Source Introduced                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI and intelligence layer               | Local-first AI boundary, hardened insight generation, note refinement, archive curation, and audit-driven safeguards     | `features/ai/services/*`, especially `healthInsightService`, `careDefaultsService`, `archiveCurationService`                                                    |
| Backend and product integrity hardening | Truthfulness fixes across backend-connected surfaces, resilience improvements, and `user_preferences` sync coverage      | `services/database/remoteHydration.ts`, `services/database/supabaseSyncAdapter.ts`, `features/settings/api/settingsClient.ts`                                   |
| Plant state and status system           | Deterministic highlights, canonical health-state derivation, unified labels, and shared badge presentation               | `features/plants/services/plantStatusService.ts`, `features/plants/services/plantStatusBadgePresentation.ts`, `features/plants/components/PlantStatusBadge.tsx` |
| Growth Progress                         | Truthful photo chronology, real progress-photo separation, and canonical timeline assembly                               | `features/plants/services/growthTimelineService.ts`                                                                                                             |
| Monthly Highlights                      | Real month qualification from progress photos, per-month ranking/cap, and shared preview/full-screen source              | `features/journal/services/monthlyHighlightsService.ts`                                                                                                         |
| Care logs and sync systems              | Canonical care-event write path, truthful Water Now/Add Log behavior, append-only history, and broad reader invalidation | `features/care-logs/api/careLogsClient.ts`, `features/care-logs/hooks/useRecordCareEvent.ts`, `features/care-logs/utils/invalidateCareLogQueries.ts`            |
| Cloud Sync                              | Persisted auto-sync preference, canonical sync executor, truthful cloud status model, and safe auto/manual coexistence   | `services/database/userDataSync.ts`, `providers/SyncBootstrapProvider.tsx`, `features/profile/services/cloudSyncStatusService.ts`                               |
| Graveyard                               | Real memorial-role selection instead of positional assignment, plus truthful small-dataset behavior                      | `features/plants/services/memorialSelectionService.ts`                                                                                                          |

## 1. AI and Intelligence Layer

### Product Outcome

V1 established a local-first AI boundary so intelligence features could enhance the product without becoming the source of truth for user data or care history. The AI layer now supports note refinement, archive curation, health insight generation, streak nudges, and hardened health insight behavior without introducing fabricated state or replacing canonical plant data.

### Implementation Outcome

Completed work included:

- Phase 1 local-first AI boundary so AI reads from persisted app state rather than inventing state
- Phase 2 feature expansion for health insight generation, note refinement, archive curation, and streak-style encouragement
- Phase 3 hardening of advanced health insight behavior so output remains conservative and explainable
- post-implementation audit fixes to tighten truthfulness, reduce drift, and keep AI output secondary to canonical local data

### Canonical Sources

- `features/ai/services/healthInsightService.ts`
- `features/ai/services/careDefaultsService.ts`
- `features/ai/services/archiveCurationService.ts`
- `features/ai/hooks/useArchiveCuration.ts`
- supporting AI schema/cache/client layers under `features/ai/`

## 2. Backend and Product Integrity Hardening

### Product Outcome

V1 hardened backend-connected surfaces so the app no longer overstates cloud durability, backup status, or inferred product meaning. Truth-sensitive screens now distinguish observed sync state, local-only behavior, and backend availability more carefully.

### Implementation Outcome

Completed work included:

- Tier 1 backend connectivity and truthfulness fixes for remote availability, sync readiness, and backend-dependent product messaging
- Tier 2 resilience improvements for degraded states, failure handling, and safer semantics on trust-sensitive surfaces
- end-to-end support for `user_preferences` sync to Supabase, including local schema, remote hydration, remote upsert, and export coverage

### Canonical Sources

- `services/database/remoteHydration.ts`
- `services/database/supabaseSyncAdapter.ts`
- `features/settings/api/settingsClient.ts`
- `features/settings/hooks/useUpdateSettings.ts`
- `services/database/migrations.ts`
- `scripts/014_user_preferences_auto_sync.sql`

## 3. Plant State and Status System

### Product Outcome

V1 unified plant health interpretation across the app so Dashboard, Library, Plant Detail, and related surfaces now share one canonical health-state engine and one canonical badge vocabulary.

### Implementation Outcome

Completed work included:

- deterministic Plant Highlights selection behavior
- canonical `thriving` / `stable` / `needs_attention` health-state engine
- visible vocabulary alignment to `THRIVING`, `STABLE`, and `NEEDS WATER`
- shared badge presentation mapping and shared rendered badge component across screens
- interval-aware thriving threshold hardening using explicit, conservative formulas based on watering interval

### Canonical Sources

- `features/plants/services/plantStatusService.ts`
- `features/plants/services/plantStatusBadgePresentation.ts`
- `features/plants/components/PlantStatusBadge.tsx`
- plant-library/highlights consumers updated to use the shared system

## 4. Growth Progress

### Product Outcome

V1 turned Growth Progress into a truthful chronological archive of real progress photos instead of a fabricated progression surface.

### Implementation Outcome

Completed work included:

- `photo_role` support to distinguish `primary` photos from `progress` photos
- `captured_at` support to preserve real chronology more accurately
- canonical `growthTimelineService` shared by Plant Detail and the dedicated Growth Progress screen
- deterministic timeline ordering and removal of invented stage/chapter semantics
- stricter primary-vs-progress boundaries so primary photos do not silently appear in progress history

### Canonical Sources

- `features/plants/services/growthTimelineService.ts`
- photo metadata support in `features/plants/api/plantsClient.ts`
- related schema work in `services/database/migrations.ts` and SQL scripts

## 5. Monthly Highlights

### Product Outcome

V1 refactored Monthly Highlights from a broad archive mislabeled as highlights into a real derived highlight system based on meaningful progress-photo activity.

### Implementation Outcome

Completed work included:

- canonical `monthlyHighlightsService`
- qualification based on real `progress` photos only
- month assignment using canonical photo timestamp fallback logic
- deterministic ranking using progress-photo count, recency, supporting care-log density, and stable tie-breakers
- per-month cap so not every plant becomes a “highlight”
- shared source of truth for both the Journal preview and the full Highlights screen

### Canonical Sources

- `features/journal/services/monthlyHighlightsService.ts`
- `features/journal/hooks/useMonthlyHighlights.ts`

## 6. Care Logs and Sync Systems

### Product Outcome

V1 hardened care logging into a truthful append-only care history system with clearer write semantics, immediate cross-screen visibility, and safer local-first behavior.

### Implementation Outcome

Completed work included:

- canonical care-event write path for care-log creation and water-related summary updates
- truthful differentiation between `Water Now` and `Add Log`
- append-only history semantics preserved for care events
- broad shared invalidation so care-log readers refresh consistently
- warning-style reminder follow-up behavior so partial secondary failures do not masquerade as total save failure
- optional Water Now note-enrichment path that updates the just-created event rather than duplicating history

### Canonical Sources

- `features/care-logs/api/careLogsClient.ts`
- `features/care-logs/hooks/useRecordCareEvent.ts`
- `features/care-logs/utils/invalidateCareLogQueries.ts`
- `features/care-logs/hooks/useUpdateCareLogNote.ts`

## 7. Cloud Sync

### Product Outcome

V1 replaced the old broad “online backup available” treatment with a real cloud sync system that users can control, observe, and trust.

### Implementation Outcome

Completed work included:

- persisted Auto Sync toggle
- canonical sync executor shared by manual sync, auto sync, and bootstrap sync
- safe coexistence between manual `Sync Now` and automatic sync triggers
- truthful cloud status derivation for off, running, unavailable, issue, pending, and healthy states
- concurrency protection to prevent overlapping sync runs and duplicate queue processing

### Canonical Sources

- `services/database/userDataSync.ts`
- `providers/SyncBootstrapProvider.tsx`
- `services/database/syncSignals.ts`
- `features/profile/services/cloudSyncStatusService.ts`
- `features/profile/components/CloudSyncControlCard.tsx`

## 8. Graveyard

### Product Outcome

V1 kept the Graveyard as a real memorial archive while replacing positional memorial-role styling with a deterministic and explainable memorial-role selection system.

### Implementation Outcome

Completed work included:

- canonical `memorialSelectionService`
- meaningful role definitions for featured memorial, reflection memorial, tribute memorial, and compact memorials
- deterministic ranking based on real memorial note richness, cause of passing, photo depth, care-history depth, and archival metadata
- truthful small-dataset behavior for `0`, `1`, `2`, `3`, and `4+` memorial sets
- preservation of existing archival flow, memorial editing, memorial detail, and local-first sync behavior

### Canonical Sources

- `features/plants/services/memorialSelectionService.ts`
- `app/(tabs)/graveyard.tsx`
- `features/plants/api/plantsClient.ts`

## Known Non-Blocking Follow-Up

These items remain repo-wide non-blocking follow-up rather than V1 feature gaps:

- `npx tsc --noEmit` is still blocked by the pre-existing syntax errors in `tests/features/ai/journal-summary-cache.test.ts`
- several React Native test suites emit existing `act(...)` warnings from Animated or icon internals while still passing
- some docs can still be expanded further around queue lifecycle details, entity-by-entity sync ownership, and conflict-resolution examples

## Notes

- This document is implementation-focused and intentionally excludes speculative roadmap work.
- Canonical sources listed here reflect the primary ownership points introduced or hardened during V1, not every touched file.
