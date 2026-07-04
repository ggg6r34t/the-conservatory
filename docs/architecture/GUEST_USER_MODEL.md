# Guest User Model

## Purpose

This document describes how The Conservatory supports **Continue without an account** — a local-only guest mode that reduces onboarding friction while keeping cloud, billing, and account-backed features honest.

Guest mode is local-first. It does not fake cloud backup, imply recoverability without an account, or send guest identifiers to Supabase as authenticated users.

## Auth Modes

```ts
type AuthMode = "guest" | "authenticated";
```

| Mode | `useAuthStore.status` | App access | Supabase session |
|------|----------------------|------------|------------------|
| Guest | `"guest"` | Yes (`hasAppAccess`) | None |
| Authenticated | `"authenticated"` | Yes | Required for cloud features |
| Anonymous | `"anonymous"` | No (auth/onboarding only) | None |

Routing treats guests like authenticated users for tabs and onboarding completion (`resolveEntryRoute` in `features/onboarding/utils/resolveEntryRoute.ts`).

## Guest Identity

Canonical helpers live in `features/auth/constants/guestUser.ts`.

| Field | Value |
|-------|-------|
| ID prefix | `guest-` (stable, app-generated) |
| `isGuest` | `true` on `AppUser` |
| Email | Synthetic: `{suffix}@local.theconservatory.app` |
| Display name | `Local Curator` |
| Supabase user | **Never created** |

```ts
// Detection
isGuestUserId(userId)  // userId.startsWith("guest-")
isGuestUser(user)      // user.isGuest || isGuestUserId(user.id)
```

Guest IDs are **not** regenerated on every launch. `continueAsGuest()` restores the existing SecureStore session when present.

## Session Persistence

| Store | Key / table | Contents |
|-------|-------------|----------|
| SecureStore | `the-conservatory.session` | Full `AppUser` JSON with `isGuest: true` |
| SQLite | `users` | Guest profile row |
| SecureStore | `the-conservatory.pending-guest-migration` | Guest ID awaiting migration after sign-up |

Flow (`features/auth/services/guestSessionService.ts`):

1. **Continue without an account** → `continueAsGuest()`
2. If session exists with `isGuest: true` → restore same ID
3. Else → `createGuestAppUser()` → persist `users` row + default `user_preferences` → `writeSession()`

On cold start, `getInitialAuthUser()` in `features/auth/api/authClient.ts` restores the guest session before falling back to anonymous.

## Active Data Owner

`services/database/syncDataOwner.ts` tracks the current local data owner:

- `setActiveDataOwnerUserId()` is called from `useAuthStore` on guest/authenticated transitions
- `shouldSkipSyncOutboxForActiveUser()` returns `true` when the active user ID is a guest ID

All SQLite mutations scope rows with `user_id = guestUserId`. Guest writes never enqueue sync outbox entries (`services/database/syncOutbox.ts`).

## Feature Access

Central gate: `canUseFeatureAsGuest()` in `features/auth/services/guestFeatureAccess.ts`.

UI prompts use `useAccountRequiredPrompt()` → custom alert (not native `Alert`) with calm copy from `getAccountRequiredCopy()`.

### Allowed locally (guest)

- Create, edit, delete plants
- Care logs, photos, reminders (OS permission permitting)
- Dashboard, library, plant detail
- Local export
- Local settings / theme
- Local deterministic AI fallbacks

### Requires account

- Cloud sync / backup / photo cloud backup
- Multi-device restore
- Premium purchase / restore (RevenueCat)
- Cloud AI edge functions
- Feature requests
- Supabase profile, account deletion, cross-device preferences

Cloud AI hooks use `resolveGuestCloudAllowed(isGuest, cloudAllowed)` so guests never reach Supabase edge functions (`features/ai/api/aiClient.ts` blocks at invoke time as a second guard).

## Entry Points

| Surface | Component / route |
|---------|-------------------|
| Welcome gateway | `ContinueWithoutAccountSection` in `WelcomeGateway.tsx` |
| Login / sign-up | Same section below OAuth and email |
| Quick start skip | `QuickStartScreen.tsx` calls `continueAsGuest()` |

Copy: *Continue without an account* · *Stored only on this device*

Analytics: `guest_mode_started` fires once from `authClient.continueAsGuest()`.

## Guest → Account Migration

When a guest signs up or signs in, `finalizeAuthenticatedUser()` captures the prior guest ID (if local plants exist) into `PENDING_GUEST_MIGRATION_KEY` **before** overwriting the session.

`GuestMigrationBridge` (in `Providers.tsx`) runs `usePostAuthGuestMigration()` globally so OAuth and email paths both prompt.

Prompt (`useGuestMigrationPrompt.ts`):

1. **Move data** — transactional `migrateGuestDataToUser()` reassigns all user-scoped tables, deletes guest `users` row, enqueues sync for migrated entities
2. **More options** → **Decide later** (defer) or **Start fresh** (destructive local wipe via `deleteGuestLocalData()`)

Migration failure preserves guest data and surfaces a recoverable error.

## Sync and Backup Semantics

| Setting | Guest behavior |
|---------|----------------|
| Auto-sync default | `false` (`settingsClient.ts`: `autoSyncEnabled: !isGuestUserId`) |
| Sync outbox | Skipped for guest mutations |
| Auto-sync bootstrap | Disabled (`SyncBootstrapProvider` requires `isAuthenticated`) |
| RevenueCat | Not initialized for guests (`BillingBootstrapProvider`) |
| Backup screen | Local-only UI; cloud sync prompts account creation |

Guests must never see “synced” for data that has not reached Supabase.

## Profile and Data Deletion

Guest profile (`app/profile.tsx`):

- **LOCAL MODE** badge
- *Stored only on this device*
- **Create account** CTA
- **Clear local data** (destructive) instead of account deletion
- **Leave local mode** instead of sign out

`deleteGuestLocalData()` removes all guest-scoped SQLite rows and clears pending migration. No Supabase account deletion is called.

## Analytics Events

| Event | When |
|-------|------|
| `guest_mode_started` | First `continueAsGuest()` |
| `guest_plant_created` | Plant created under guest ID |
| `guest_account_required_prompt_shown` | Account gate displayed |
| `guest_signup_started` | Guest begins sign-up form submit |
| `guest_signup_completed` | Guest completes sign-up |
| `guest_data_migration_started` / `_completed` / `_failed` | Migration prompt outcomes |

No plant names, notes, photos, or email are tracked in these events.

## Legal Copy

Privacy policy and terms explicitly state the app may be used locally without an account. Local data remains on-device until the user creates an account and enables cloud sync. See `features/legal/content/privacyPolicy.ts` and `termsOfService.ts`.

## Key Files

| Area | Path |
|------|------|
| Identity constants | `features/auth/constants/guestUser.ts` |
| Session bootstrap | `features/auth/services/guestSessionService.ts` |
| Feature matrix | `features/auth/services/guestFeatureAccess.ts` |
| Migration | `features/auth/services/guestDataMigrationService.ts` |
| Auth store | `features/auth/stores/useAuthStore.ts` |
| Account prompts | `features/auth/hooks/useAccountRequiredPrompt.ts` |
| Route guards | `features/auth/hooks/useGuestRouteGuard.ts` |
| Migration bridge | `features/auth/components/GuestMigrationBridge.tsx` |
| Sync skip | `services/database/syncDataOwner.ts`, `syncOutbox.ts` |

## Tests

| File | Coverage |
|------|----------|
| `tests/features/auth/guest-user.test.ts` | ID prefix, synthetic email |
| `tests/features/auth/guest-session-service.test.ts` | Stable restore, new session |
| `tests/features/auth/guest-feature-access.test.ts` | Matrix, copy tone |
| `tests/features/auth/guest-data-migration.test.ts` | Reassign + sync enqueue |
| `tests/features/auth/guest-cloud-access.test.ts` | Cloud AI gate helper |
| `tests/features/ai/ai-client-guest.test.ts` | Edge function block |
| `tests/services/sync-data-owner-guest.test.ts` | Outbox skip |
| `tests/features/onboarding/resolve-entry-route-guest.test.ts` | Guest routing |

## Related Docs

- [Sync and Data Model](./SYNC_AND_DATA_MODEL.md) — local-first sync semantics
- [Navigation Map](./NAVIGATION_MAP.md) — auth gating and entry routes
- [Premium Entitlements](./PREMIUM_ENTITLEMENTS.md) — billing requires authenticated user
