# Permission system

The Conservatory separates **in-app permission education** from **OS permission sheets**. They are not `Alert.alert` dialogs.

## Flow

1. **Pre-prompt** — `alert.confirm` via `confirmBeforeSystemPermission` or `promptAndRequestSystemPermission` (`permissionPromptCopy.ts`).
2. **OS sheet** — Only after the user taps **Continue** on the pre-prompt (required by iOS/Android).
3. **Post-denial** — Custom `alert.show` via `showSystemPermissionBlockedAlert` when appropriate.

## API (`features/permissions/`)

| Export | Use when |
|--------|----------|
| `promptAndRequestSystemPermission` | Caller needs pre-prompt + OS request (onboarding, photos, notifications from UI). |
| `confirmBeforeSystemPermission` | Caller owns the native request (e.g. `expo-camera` `requestPermission`). |
| `runWithSystemPermission` | Photo pick/capture actions after pre-prompt. |
| `ensureNotificationsForDelivery` | User enables care reminders or saves an active reminder. |

## OS request gateway (only these files may call `request*PermissionsAsync`)

- `features/permissions/requestSystemPermission.ts`
- `features/onboarding/services/permissionsService.ts` (batch media during onboarding)
- `features/notifications/services/notificationService.ts` (`requestNotificationPermissionsSystem`)

Enforced by `tests/feedback/no-direct-permission-request.test.ts`.

## Background / service rules

- `ensureNotificationPermissions()` defaults to **no OS prompt** (`requestIfNeeded` must be `true` explicitly).
- `scheduleReminderNotification` and feature-release delivery use `requestIfNeeded: false`.
- `photoService` only checks permission; UI must pre-prompt before calling pick/capture.

## Kinds

`notifications` | `media` (camera + library) | `camera` | `mediaLibrary`

Location is not requested — no location feature in the app.

## Related

- Alert framework: `docs/design/ALERT_SYSTEM.md`
- Platform exceptions (billing + OS sheets): `ALERT_SYSTEM.md` § Documented platform exceptions
