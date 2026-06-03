# Alert dialog system

The Conservatory uses one custom alert stack for all user-facing confirmations, warnings, errors, and success messages.

## API

- **Provider:** `AlertProvider` in `providers/AlertProvider.tsx` (mounted in `providers/Providers.tsx`)
- **Hook:** `useAlert()` or `useAppAlert()` from `hooks/useAlert.ts`
- **UI:** `AlertDialogHost` + `AlertDialogCard` under `components/feedback/AlertDialog/`
- **Queue:** `services/feedback/alertQueue.ts` — one dialog at a time; additional `show()` calls enqueue

### `show(options)`

```ts
const alert = useAlert();

await alert.show({
  variant: "info" | "success" | "warning" | "error" | "confirm" | "destructive",
  title: string,
  message?: string,
  primaryAction?: { label, onPress?, tone?, testID?, accessibilityLabel? },
  secondaryAction?: { label, onPress?, tone?, testID?, accessibilityLabel? },
  dismissOnBackdropPress?: boolean, // default true
  dismissOnBackButton?: boolean,    // default true
  analyticsKey?: string,
  sourceScreen?: string,
});
```

Returns `{ action: "primary" | "secondary" | "dismiss" }`.

### `confirm(options)`

Promise-based yes/no. Resolves `true` when the primary action is chosen.

```ts
const confirmed = await alert.confirm({
  variant: "destructive",
  title: "Delete this plant?",
  message: "This removes the plant, reminders, care logs, and photos from your collection.",
  confirmLabel: "Delete",
  cancelLabel: "Cancel",
  analyticsKey: "plant_delete",
  sourceScreen: "plant_detail",
});
```

Async `onPress` handlers show a loading label and disable buttons until complete.

## Analytics

`services/feedback/alertAnalytics.ts` emits:

- `app_alert_shown`
- `app_alert_primary_action`
- `app_alert_secondary_action`
- `app_alert_cancelled` (Cancel secondary or dismiss without action)
- `app_alert_dismissed`

Properties: `variant`, `analytics_key`, `source_screen` — never message body or user content.

## Native `Alert.alert`

Not used in production UI. `tests/feedback/no-native-alert.test.ts` scans `app/`, `features/`, `hooks/`, `providers/`, `components/`, and `services/` for `Alert.alert` and `import { Alert } from "react-native"`.

### Documented platform exceptions

| UI | Source | Notes |
|----|--------|-------|
| App Store / Play billing sheet | StoreKit / Play Billing via RevenueCat `purchasePackage` | Required for real IAP after the app’s custom pre-purchase confirm on `subscription-plans`. Sandbox may show a system dialog titled **Test Purchase** — that is not `Alert.alert`. |
| Mock billing (dev only) | `EXPO_PUBLIC_USE_MOCK_BILLING=true` | Uses `MockBillingAdapter`; no system purchase sheet. |

Subscription flow: custom `alert.confirm` → (optional) store sheet → custom success/error `alert.show`.

Screen migration coverage: `tests/feedback/alert-screen-migrations.test.ts`.

Per-theme destructive readability: `tests/feedback/alert-theme-rendering.test.tsx`.

## Theming

All dialog styles use `useTheme()` tokens. Variants map accent/icon color via `AlertDialogCard` (`info`, `success`, `warning`, `error`, `destructive`, `confirm`).

## Accessibility

- Dialog uses `accessibilityRole="alert"`
- Title and optional message are announced
- Backdrop dismiss respects `dismissOnBackdropPress`
- Destructive actions use `tone: "danger"` on primary buttons
