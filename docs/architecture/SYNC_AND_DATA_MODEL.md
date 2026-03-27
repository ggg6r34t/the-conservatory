# Sync and Data Model

## Purpose

This document explains the product-facing data model assumptions behind local storage, sync, backup, and export so the app can remain truthful in high-trust surfaces.

## Core Model

The Conservatory is local-first.

That means:

- local device data is a primary source of user state
- sync augments and preserves that state
- export is a separate portability action
- backup and sync UI must not imply more than the system can actually guarantee

## Data Domains Currently Reflected in Backup and Export Surfaces

Key domains include:

- plants
- graveyard plants and memorials
- photos
- care logs
- reminders
- user preferences

These domains appear across:

- backup summary
- sync queue state
- export generation

## Backup Summary Semantics

The current backup summary exposes both record-level and queue-level signals.

Examples of current summary concepts:

- active plants
- archived plants
- photos
- care logs
- reminders
- record-level pending or failed sync state
- account-scoped queued changes
- device-wide queued changes
- processing and completed queue counts
- `lastSuccessfulSyncAt`

## Important Truthfulness Rule

`lastSuccessfulSyncAt` is currently an inferred observation based on the latest non-null `synced_at` found across backed entities.

It is **not** a dedicated snapshot-level "full archive backup completed" event.

Therefore:

- it may be used as supporting context
- it should not be presented as an absolute guarantee that every record is currently fully synchronized

## Device vs Account Queue Semantics

Two queue perspectives currently matter:

- account-scoped queue counts
- device-wide queue counts

Device-wide queue counts can include work this device is still preparing beyond the user's neatly summarized account state.

UI that surfaces these counts must explain that clearly and avoid implying they are all strictly the same thing.

## Sync Behavior

The sync flow currently:

- checks backend availability
- refuses sync when backend conditions do not support it
- runs the bootstrap sync process when allowed
- invalidates related queries after success

Operationally, this means UI should distinguish between:

- offline
- local-only
- unavailable
- pending or in-progress
- issue states
- healthy observed sync states

## Export Semantics

Export is a distinct portability feature, not the same thing as backup.

Export behavior should remain:

- single-source
- explicit
- on-device
- shareable
- truthful about inclusions and exclusions

The export surface should continue to state clearly that credentials and password data are excluded.

## Product Rules

### Do

- separate backup and sync meaning from export meaning
- present degraded sync states before optimistic supporting context
- keep account-vs-device distinctions visible where needed
- preserve real backend-connected behavior in trust surfaces

### Do Not

- imply cloud backup exists when it does not
- imply a complete archive snapshot event when the system only has inferred per-record sync timestamps
- duplicate export workflows across multiple screens
- collapse device queue metrics into account metrics if the underlying data is not actually the same

## Current Related Source Files

- `features/profile/api/profileClient.ts`
- `features/profile/hooks/useBackupStatus.ts`
- `features/export/services/exportService.ts`
- `services/database/bootstrapSync.ts`
- `services/database/sync.ts`

## Next Documentation Expansion

This file should later be expanded with:

- entity-by-entity sync ownership
- queue lifecycle states
- conflict resolution overview
- export schema summary
- failure-state UX rules
