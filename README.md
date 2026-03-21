# The Conservatory

The Conservatory is an Expo + React Native plant care app focused on a premium editorial UI, local-first reliability, and staged Supabase sync.

## Core Features

- Email auth flow (local fallback + Supabase when configured)
- Plant library with create/detail/delete flows
- Care logging and watering cadence tracking
- Reminder scheduling and local notifications
- Dashboard summary (due today, active plants, offline status)
- Local SQLite persistence with queued sync operations

## Tech Stack

- Expo SDK 54 + React Native 0.81
- Expo Router (file-based routing under `app/`)
- TypeScript (strict) + Zod validation
- React Query for async state
- Zustand for UI/store state
- Expo SQLite for local-first data
- Supabase (auth + remote sync adapter)
- Jest + Testing Library for tests

## Project Structure

- `app/` route entry points and screens
- `features/` domain modules (auth, plants, care logs, notifications, dashboard, settings)
- `services/` infra (database, sync queue, session, analytics)
- `providers/` app-level providers (theme, query, fonts/bootstrap)
- `config/` runtime config and environment parsing
- `database/` SQL schema and migration files for Supabase
- `tests/` unit/integration tests

## Environment Variables

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Required/available values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_ENABLE_SYNC_TRIALS` (`false` by default)

If Supabase vars are omitted, the app uses local fallbacks where implemented.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run start
```

Useful alternatives:

```bash
npm run android
npm run ios
npm run web
```

## Quality Checks

```bash
npm run typecheck
npm test -- --runInBand
npm run lint
```

## Notifications + Expo Go Note

`expo-notifications` remote push on Android is not supported in Expo Go (SDK 53+).
Use a development build for end-to-end push validation.

The app includes runtime safeguards so unsupported notification paths are skipped in Expo Go.

## Sync Model (Local-First)

- Mutations write to local SQLite first.
- A `sync_queue` records pending operations.
- Replay is processed by `services/database/sync.ts`.
- Supabase replay adapter is feature-flagged behind `EXPO_PUBLIC_ENABLE_SYNC_TRIALS`.

## Supabase Schema

Reference SQL is in:

- `database/schema.sql`
- `database/migrations/`

Apply these in your Supabase project before enabling full remote sync in production.

## Design System

The visual system and UI principles are documented in:

- `docs/DESIGN.md`

## Deployment Notes

- Ensure `.env` is never committed (see `.gitignore`).
- Prefer EAS development/preview builds for notification and native capability testing.
- Run typecheck + tests + lint before every release branch/tag.
