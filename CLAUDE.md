# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start          # Expo dev server
npm run android        # Start on Android
npm run ios            # Start on iOS
npm run web            # Start on web

npm run typecheck      # tsc --noEmit
npm run lint           # expo lint
npm test               # Run all tests
npm test -- --runInBand                         # Run tests serially (recommended)
npm test -- --testPathPattern="tests/features"  # Run a subset of tests
npm run test:e2e       # Auth/onboarding e2e flow
npm run test:watch     # Watch mode
```

Tests live in `tests/` (not co-located) and match `**/*.test.ts(x)`. The jest config uses `jest-expo` preset.

## Architecture

**Expo Router file-based routing** under `app/`. Route groups:

- `app/(tabs)/` — primary authenticated tab experience (Library, Journal, Graveyard, index/dashboard)
- `app/(auth)/` — login/register
- `app/onboarding/` — onboarding flow
- `app/plant/[id]/`, `app/care-log/[id]/`, `app/memorial/[id]/` — drill-in and modal routes

`app/_layout.tsx` handles auth gating, onboarding redirects, and stack registration. Routes should stay thin — navigation composition and screen-level layout shells only.

**Feature modules** in `features/` own all domain logic:

- `features/plants/` — plant CRUD, status, photo, graveyard, streaks, memorials
- `features/care-logs/` — care log entries and watering events
- `features/notifications/` — reminder scheduling
- `features/dashboard/` — summary and highlights
- `features/auth/` — session and auth state
- `features/profile/` — profile, backup status, data export

Each feature follows the pattern: `api/` (SQLite queries + sync outbox), `components/`, `hooks/` (React Query), `schemas/` (Zod), `services/` (derived logic), `stores/` (Zustand).

**Shared infrastructure** in `services/database/`:

- `migrations.ts` — SQLite schema and versioned migrations
- `sync.ts` — local sync queue processor
- `syncOutbox.ts` — `runAtomicMutationWithSyncOutbox()` wraps every mutation in a transaction that simultaneously writes a `sync_queue` entry
- `supabaseSyncAdapter.ts` — replays outbox to Supabase when Supabase is configured
- `remoteHydration.ts` — seeds local DB from remote on first login

## Local-First Data Model

Every write goes to SQLite first via `runAtomicMutationWithSyncOutbox()`. This atomically records a `sync_queue` entry in the same transaction. Supabase replay runs when the build has valid Supabase URL and anon-key configuration.

The local DB is the source of truth — not a cache. Sync state, backup summaries, and export content must be semantically honest. See `docs/architecture/SYNC_AND_DATA_MODEL.md` for rules on what backup/export surfaces may claim.

## Design System

Token source of truth: `styles/tokens.ts` → `config/theme.ts` → `components/design-system/Theme.tsx`.

- Always use `useTheme()` for colors, never ad hoc hex values
- Use `StyleSheet.create`, not inline styles
- Serif (`Noto Serif`) for titles, plant names, editorial emphasis; sans (`Manrope`) for body, labels, controls
- Tonal surface layering (`surfaceContainerLow/High/Lowest`) instead of hard borders or dividers
- Settings/drill-in screens use `features/profile/components/ProfileScreenScaffold.tsx`

Quick reference: `docs/design/DESIGN_QUICK_REFERENCE.md`

## State and Data Flow

- **React Query** for all data fetching, mutation, and invalidation. Invalidate the smallest meaningful query set after mutations.
- **Zustand** for UI/transient state (not server data).
- Feature hooks in `features/*/hooks/` derive and expose state. Route files compose these hooks.

## Key Conventions

- Route files own screen shells and navigation wiring only — business logic belongs in feature hooks or services.
- When adding a new screen, register it in `app/_layout.tsx` with `drillInScreenOptions`, and update `docs/SCREEN_INVENTORY.md` and `docs/architecture/NAVIGATION_MAP.md`.
- Mutations must use `runAtomicMutationWithSyncOutbox()` to stay consistent with the sync queue.
- Do not duplicate export or backup workflows across multiple routes — each user-facing action should have one clear entry point.
- `debug/` routes are `__DEV__` only and are blocked in production by `_layout.tsx`.

## Documentation

Docs in `docs/` are kept in sync with the codebase. When changes affect routing, design tokens, or sync/backup/export semantics, update the relevant doc in the same changeset:

- Route changes → `docs/SCREEN_INVENTORY.md`, `docs/architecture/NAVIGATION_MAP.md`
- Design system changes → `docs/design/DESIGN.md`
- Sync/backup/export behavior → `docs/architecture/SYNC_AND_DATA_MODEL.md`
