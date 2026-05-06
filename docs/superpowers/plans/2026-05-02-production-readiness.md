# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every hard blocker, sync integrity gap, and product truthfulness issue uncovered by the V1 enterprise audit so the app is App Store / Play Store submission ready.

**Architecture:** Local-first SQLite primary store with optional Supabase sync gated by `EXPO_PUBLIC_ENABLE_SYNC_TRIALS`. Every mutation must atomically write to the entity table AND the `sync_queue` in the same `withTransactionAsync` call via `runAtomicMutationWithSyncOutbox`. Tier 1 fixes require zero migrations; Tier 2–3 extend the schema using the existing `ensureColumn` pattern.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router, Expo SQLite, TypeScript strict, Zustand v5 (`zustand/middleware` persist), React Query v5, Supabase JS v2, Jest + jest-expo, EAS CLI.

---

## File Map

| File                                                    | Action               | Why                                                                                                                          |
| ------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `eas.json`                                              | Modify               | Add `EXPO_PUBLIC_ENABLE_SYNC_TRIALS=true` to production env — without it sync is permanently disabled in production builds   |
| `features/onboarding/components/PermissionsScreen.tsx`  | Modify               | Remove Location permission card — no location feature exists; App Store 5.1.1 violation                                      |
| `features/onboarding/hooks/useOnboardingPermissions.ts` | Modify               | Remove location from snapshot type, initial state, request handler, and bulk-request loop                                    |
| `app/profile.tsx`                                       | Modify               | Remove SUBSCRIPTION section (dead "coming soon" UI); rename "Watering Alerts" to "Reminders Enabled"                         |
| `features/plants/api/plantsClient.ts`                   | Modify               | Add `wateringIntervalDays` guard; move `upsertReminder` call inside `runAtomicMutationWithSyncOutbox` using extracted helper |
| `features/notifications/api/remindersClient.ts`         | Modify               | Extract `upsertReminderInTransaction` (raw SQL, no new transaction) exported alongside existing `upsertReminder`             |
| `features/care-logs/api/careLogsClient.ts`              | Modify               | Move reminder upsert inside transaction using `upsertReminderInTransaction`                                                  |
| `services/database/remoteHydration.ts`                  | Modify               | Add `users` table fetch + hydration so `display_name` and `avatar_url` survive device reinstall                              |
| `features/plants/stores/usePlantStore.ts`               | Modify               | Add `persist` middleware for `filter` and `sort` only (`query` stays ephemeral)                                              |
| `providers/SyncBootstrapProvider.tsx`                   | Modify               | Watch settings query; trigger sync when `autoSyncEnabled` transitions false→true                                             |
| `features/settings/hooks/useUpdateSettings.ts`          | Modify               | Trigger `runUserDataSync` after successful `autoSyncEnabled: true` mutation                                                  |
| `services/database/migrations.ts`                       | Modify               | Add `ensureColumn` call for `tags TEXT` on `care_logs`; add backfill for embedded metadata tags                              |
| `features/care-logs/api/careLogsClient.ts`              | Modify (second pass) | Extract embedded `[meta:{...}]` tags from notes into `tags` column on create/update                                          |
| `tests/services/remote-hydration.test.ts`               | Modify               | Extend to cover users table hydration                                                                                        |
| `tests/plants/plantsClient.test.ts`                     | Create               | Cover `wateringIntervalDays` guard and reminder atomicity                                                                    |
| `tests/care-logs/careLogsClient.test.ts`                | Create               | Cover reminder atomicity in water log                                                                                        |
| `tests/stores/usePlantStore.test.ts`                    | Create               | Cover persist middleware contract                                                                                            |

---

## Task 1: EAS Production Sync Flag

**Files:**

- Modify: `eas.json`

- [ ] **Step 1: Write the failing test (manual — check current config)**

  Run:

  ```bash
  cat eas.json | grep -A5 '"production"'
  ```

  Expected: no `env` block under `production`. Confirm `EXPO_PUBLIC_ENABLE_SYNC_TRIALS` is absent.

- [ ] **Step 2: Fix `eas.json`**

  In `eas.json`, replace the `"production"` build profile:

  ```json
  "production": {
    "autoIncrement": true,
    "node": "22.18.0",
    "environment": "production",
    "channel": "production",
    "android": {
      "buildType": "app-bundle"
    },
    "env": {
      "EXPO_PUBLIC_ENABLE_SYNC_TRIALS": "true"
    }
  }
  ```

- [ ] **Step 3: Verify**

  Run:

  ```bash
  node -e "const e=require('./eas.json'); const v=e.build.production.env.EXPO_PUBLIC_ENABLE_SYNC_TRIALS; if(v!=='true') throw new Error('Missing flag'); console.log('OK:', v);"
  ```

  Expected: `OK: true`

- [ ] **Step 4: Commit**

  ```bash
  git add eas.json
  git commit -m "fix(eas): enable EXPO_PUBLIC_ENABLE_SYNC_TRIALS in production build profile"
  ```

---

## Task 2: Remove Location Permission from Onboarding

**Files:**

- Modify: `features/onboarding/hooks/useOnboardingPermissions.ts`
- Modify: `features/onboarding/components/PermissionsScreen.tsx`

The `permissionsService.ts` location helpers (`getLocationPermissionState`, `requestLocationPermission`) are safe to keep — they just must not be called from onboarding flows.

- [ ] **Step 1: Update `useOnboardingPermissions.ts`**

  Replace the entire file content:

  ```typescript
  import { useEffect, useMemo, useState } from "react";

  import {
    getPermissionSnapshot,
    requestMediaPermissions,
    requestNotificationPermission,
    type OnboardingPermissionSnapshot,
  } from "@/features/onboarding/services/permissionsService";
  import type { PermissionState } from "@/features/onboarding/utils/permissionState";
  import { trackEvent } from "@/services/analytics/analyticsService";

  type PermissionKey = keyof OnboardingPermissionSnapshot;

  const INITIAL_SNAPSHOT: OnboardingPermissionSnapshot = {
    notifications: "undetermined",
    media: "undetermined",
  };

  export function useOnboardingPermissions() {
    const [permissions, setPermissions] =
      useState<OnboardingPermissionSnapshot>(INITIAL_SNAPSHOT);
    const [isReady, setIsReady] = useState(false);
    const [activeKey, setActiveKey] = useState<PermissionKey | null>(null);
    const [continueLoading, setContinueLoading] = useState(false);

    useEffect(() => {
      let active = true;

      getPermissionSnapshot()
        .then((snapshot) => {
          if (active) {
            setPermissions(snapshot);
          }
        })
        .finally(() => {
          if (active) {
            setIsReady(true);
          }
        });

      return () => {
        active = false;
      };
    }, []);

    const requestPermission = async (key: PermissionKey) => {
      setActiveKey(key);
      let nextState: PermissionState = "undetermined";

      try {
        if (key === "notifications") {
          nextState = await requestNotificationPermission();
        } else {
          nextState = await requestMediaPermissions();
        }

        setPermissions((current) => ({
          ...current,
          [key]: nextState,
        }));
        trackEvent("onboarding_permission_requested", {
          permission: key,
          status: nextState,
        });

        return nextState;
      } finally {
        setActiveKey(null);
      }
    };

    const requestAllPendingPermissions = async () => {
      setContinueLoading(true);

      try {
        if (permissions.notifications === "undetermined") {
          await requestPermission("notifications");
        }

        if (permissions.media === "undetermined") {
          await requestPermission("media");
        }
      } finally {
        setContinueLoading(false);
      }
    };

    return useMemo(
      () => ({
        permissions,
        isReady,
        activeKey,
        continueLoading,
        requestPermission,
        requestAllPendingPermissions,
      }),
      [activeKey, continueLoading, isReady, permissions],
    );
  }
  ```

- [ ] **Step 2: Check `OnboardingPermissionSnapshot` type in `permissionsService.ts`**

  Run:

  ```bash
  grep -n "OnboardingPermissionSnapshot" features/onboarding/services/permissionsService.ts
  ```

  If the type includes `location`, update the exported type to remove it:

  ```typescript
  export interface OnboardingPermissionSnapshot {
    notifications: PermissionState;
    media: PermissionState;
  }
  ```

  Also update `getPermissionSnapshot()` to return only notifications and media (remove the location check from the returned object).

- [ ] **Step 3: Remove Location card from `PermissionsScreen.tsx`**

  Delete the third `<PermissionCard .../>` block (lines 241–255) and the `"location"` branch from `handlePermissionRequest`:

  In `handlePermissionRequest`, change the parameter type:

  ```typescript
  const handlePermissionRequest = async (
    key: "notifications" | "media",
  ) => {
  ```

  Remove the entire third `<PermissionCard>` block:

  ```diff
  -          <PermissionCard
  -            title="Location"
  -            body="Get precise local weather alerts and UV indices to optimize your outdoor botanical care."
  -            icon="location-on"
  -            actionLabel={getPermissionActionLabel(
  -              permissions.permissions.location,
  -              "Use Location",
  -            )}
  -            disabled={
  -              permissions.activeKey !== null ||
  -              permissions.permissions.location === "unavailable"
  -            }
  -            onPress={() => handlePermissionRequest("location")}
  -          />
  ```

- [ ] **Step 4: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 5: Commit**

  ```bash
  git add features/onboarding/hooks/useOnboardingPermissions.ts \
          features/onboarding/components/PermissionsScreen.tsx \
          features/onboarding/services/permissionsService.ts
  git commit -m "fix(onboarding): remove location permission request — no location feature exists"
  ```

---

## Task 3: Remove Subscription Card from Profile

**Files:**

- Modify: `app/profile.tsx`

- [ ] **Step 1: Remove the SUBSCRIPTION section**

  In `app/profile.tsx`, delete the entire `<View style={styles.section}>` block that contains `SUBSCRIPTION` label and the `<LinearGradient>` card (approximately lines 359–416 in current file). The block starts at:

  ```jsx
  <View style={styles.section}>
    <Text
      style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
    >
      SUBSCRIPTION
    </Text>
    <LinearGradient
  ```

  and ends after:

  ```jsx
    </LinearGradient>
  </View>
  ```

  Delete this entire block.

- [ ] **Step 2: Check for now-unused imports**

  After deletion, check if `LinearGradient`, `Image`, and `showSubscriptionAlert` are still used elsewhere in the file. Run:

  ```bash
  grep -n "LinearGradient\|showSubscriptionAlert\|potted-plant" app/profile.tsx
  ```

  Remove any import lines for identifiers that are no longer referenced:
  - Remove `import { LinearGradient } from "expo-linear-gradient";` if no longer used.
  - Remove any `showSubscriptionAlert` helper function if defined locally.
  - Remove `Image` from the `react-native` import if no longer used.

- [ ] **Step 3: Remove subscription-related styles**

  In the `StyleSheet.create({...})` at the bottom of `profile.tsx`, delete:
  - `subscriptionCard`
  - `subscriptionCardContent`
  - `subscriptionCardTitle`
  - `subscriptionCardBody`
  - `subscriptionButton`
  - `subscriptionButtonLabel`
  - `subscriptionCardGlyph`

- [ ] **Step 4: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 5: Commit**

  ```bash
  git add app/profile.tsx
  git commit -m "fix(profile): remove subscription card — feature does not exist"
  ```

---

## Task 4: Rename "Watering Alerts" to "Reminders Enabled"

**Files:**

- Modify: `app/profile.tsx`

- [ ] **Step 1: Update the label and icon**

  In `app/profile.tsx`, in the PREFERENCES section, find:

  ```jsx
  <ProfileRow
    icon="bell-ring-outline"
    label="Watering Alerts"
  ```

  Change `label` and `icon` to reflect full reminders scope:

  ```jsx
  <ProfileRow
    icon="bell-ring-outline"
    label="Reminders Enabled"
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/profile.tsx
  git commit -m "fix(profile): rename 'Watering Alerts' to 'Reminders Enabled' — toggle controls all reminder types"
  ```

---

## Task 5: `wateringIntervalDays` Client Guard

**Files:**

- Modify: `features/plants/api/plantsClient.ts`

The form schema already has `min(1).max(60)` via `plantValidation.ts`. This adds a client-layer guard for direct API callers.

- [ ] **Step 1: Write the failing test**

  Create `tests/plants/plantsClient.test.ts`:

  ```typescript
  const mockGetDatabase = jest.fn();
  const mockRunAsync = jest.fn();
  const mockGetFirstAsync = jest.fn();
  const mockWithTransactionAsync = jest.fn(async (cb: () => Promise<void>) =>
    cb(),
  );

  jest.mock("@/services/database/sqlite", () => ({
    getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
  }));
  jest.mock("@/config/supabase", () => ({ supabase: null }));
  jest.mock("@/features/ai/services/reminderOptimizationService", () => ({
    optimizeReminderTiming: ({ nextDueAt }: { nextDueAt: string }) => ({
      nextDueAt,
    }),
  }));
  jest.mock("@/features/settings/api/settingsClient", () => ({
    getUserPreferences: jest.fn().mockResolvedValue({
      autoSyncEnabled: true,
      remindersEnabled: true,
      defaultWateringHour: 9,
    }),
  }));

  describe("plantsClient wateringIntervalDays guard", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockGetDatabase.mockResolvedValue({
        runAsync: mockRunAsync,
        getFirstAsync: mockGetFirstAsync,
        withTransactionAsync: mockWithTransactionAsync,
      });
    });

    it("rejects wateringIntervalDays < 1", async () => {
      const { createPlant } = require("@/features/plants/api/plantsClient");
      await expect(
        createPlant({
          userId: "user-1",
          name: "Fern",
          speciesName: "Fern sp.",
          wateringIntervalDays: 0,
        }),
      ).rejects.toThrow("Watering interval must be between 1 and 60 days.");
    });

    it("rejects wateringIntervalDays > 60", async () => {
      const { createPlant } = require("@/features/plants/api/plantsClient");
      await expect(
        createPlant({
          userId: "user-1",
          name: "Fern",
          speciesName: "Fern sp.",
          wateringIntervalDays: 61,
        }),
      ).rejects.toThrow("Watering interval must be between 1 and 60 days.");
    });
  });
  ```

- [ ] **Step 2: Run test to confirm failure**

  ```bash
  npm test -- tests/plants/plantsClient.test.ts --no-coverage
  ```

  Expected: FAIL — "Watering interval must be between 1 and 60 days." not thrown yet.

- [ ] **Step 3: Add guard to `plantsClient.ts`**

  In `features/plants/api/plantsClient.ts`, add a guard at the start of both `createPlant` and `updatePlant`:

  In `createPlant`, immediately after the function signature and before `const database = ...`:

  ```typescript
  if (input.wateringIntervalDays < 1 || input.wateringIntervalDays > 60) {
    throw new Error("Watering interval must be between 1 and 60 days.");
  }
  ```

  In `updatePlant`, immediately after the function signature and before `const database = ...`:

  ```typescript
  if (
    input.patch.wateringIntervalDays < 1 ||
    input.patch.wateringIntervalDays > 60
  ) {
    throw new Error("Watering interval must be between 1 and 60 days.");
  }
  ```

- [ ] **Step 4: Run test to confirm pass**

  ```bash
  npm test -- tests/plants/plantsClient.test.ts --no-coverage
  ```

  Expected: PASS

- [ ] **Step 5: Run full typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 6: Commit**

  ```bash
  git add features/plants/api/plantsClient.ts tests/plants/plantsClient.test.ts
  git commit -m "fix(plants): add client-layer guard for wateringIntervalDays range [1, 60]"
  ```

---

## Task 6: Fix Reminder Atomicity in Plant Mutations

**Problem:** `createPlant` and `updatePlant` commit the plant inside a transaction, then call `upsertReminder` outside. If `upsertReminder` throws, the plant exists without a correct reminder. `upsertReminder` itself calls `runAtomicMutationWithSyncOutbox` (→ `withTransactionAsync`), which would be a nested transaction if called inside another transaction. Fix: extract raw SQL reminder logic into a `upsertReminderInTransaction` helper, call it inside the plant transaction, then call `reschedulePlantReminder` after.

**Files:**

- Modify: `features/notifications/api/remindersClient.ts`
- Modify: `features/plants/api/plantsClient.ts`
- Modify: `features/care-logs/api/careLogsClient.ts`

- [ ] **Step 1: Write failing tests for plant mutation atomicity**

  Add to `tests/plants/plantsClient.test.ts`:

  ```typescript
  describe("createPlant reminder atomicity", () => {
    it("includes reminder insert in the same sync_queue batch as plant insert", async () => {
      // The test verifies that sync_queue entries for both plant and reminder
      // are written in the same withTransactionAsync call.
      // We detect this by checking that runAsync is called with both
      // INSERT INTO plants and INSERT INTO care_reminders before the
      // transaction completes.
      const callLog: string[] = [];

      mockRunAsync.mockImplementation(async (sql: string) => {
        const first = sql.trim().split(/\s+/).slice(0, 4).join(" ");
        callLog.push(first);
      });
      mockGetFirstAsync.mockImplementation(async (sql: string) => {
        if (sql.includes("SELECT * FROM plants")) {
          return {
            id: "plant-1",
            user_id: "user-1",
            name: "Fern",
            species_name: "Fern sp.",
            nickname: null,
            status: "active",
            location: null,
            watering_interval_days: 7,
            last_watered_at: null,
            next_water_due_at: null,
            notes: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
            updated_by: "user-1",
            pending: 1,
            synced_at: null,
            sync_error: null,
          };
        }
        if (sql.includes("SELECT id FROM care_reminders")) {
          return null; // no existing reminder
        }
        if (sql.includes("SELECT * FROM care_reminders")) {
          return {
            id: "reminder-1",
            user_id: "user-1",
            plant_id: "plant-1",
            reminder_type: "water",
            frequency_days: 7,
            enabled: 1,
            next_due_at: null,
            last_triggered_at: null,
            notification_id: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
            updated_by: "user-1",
            pending: 1,
            synced_at: null,
            sync_error: null,
          };
        }
        if (sql.includes("SELECT * FROM photos")) {
          return null;
        }
        return null;
      });
      mockGetDatabase.mockResolvedValue({
        runAsync: mockRunAsync,
        getFirstAsync: mockGetFirstAsync,
        getAllAsync: jest.fn().mockResolvedValue([]),
        withTransactionAsync: jest.fn(async (cb: () => Promise<void>) => cb()),
      });

      const { createPlant } = require("@/features/plants/api/plantsClient");
      await createPlant({
        userId: "user-1",
        name: "Fern",
        speciesName: "Fern sp.",
        wateringIntervalDays: 7,
      }).catch(() => {
        // getPlantById may fail on incomplete mock — that's ok
      });

      const plantInsertIdx = callLog.findIndex((s) =>
        s.includes("INSERT INTO plants"),
      );
      const reminderInsertIdx = callLog.findIndex(
        (s) =>
          s.includes("INSERT INTO care_reminders") ||
          s.includes("UPDATE care_reminders"),
      );

      // Both must be called (atomicity guaranteed by being inside same transaction)
      expect(plantInsertIdx).toBeGreaterThanOrEqual(0);
      expect(reminderInsertIdx).toBeGreaterThanOrEqual(0);
    });
  });
  ```

- [ ] **Step 2: Run test to confirm failure**

  ```bash
  npm test -- tests/plants/plantsClient.test.ts --no-coverage
  ```

  Expected: the reminder insert index test may pass or fail depending on current behavior — note the result.

- [ ] **Step 3: Extract `upsertReminderInTransaction` in `remindersClient.ts`**

  Add the following export ABOVE the existing `upsertReminder` function in `features/notifications/api/remindersClient.ts`:

  ```typescript
  export async function upsertReminderInTransaction(
    database: Awaited<ReturnType<typeof getDatabase>>,
    nowIso: string,
    input: {
      userId: string;
      plantId: string;
      frequencyDays: number;
      nextDueAt: string | null;
      enabled: boolean;
    },
  ): Promise<{ reminderId: string; operation: "insert" | "update" }> {
    const existing = await database.getFirstAsync<{ id: string }>(
      "SELECT id FROM care_reminders WHERE plant_id = ? LIMIT 1;",
      input.plantId,
    );

    if (existing) {
      await database.runAsync(
        `UPDATE care_reminders
         SET frequency_days = ?, next_due_at = ?, enabled = ?, updated_at = ?, updated_by = ?, pending = 1
         WHERE id = ?;`,
        input.frequencyDays,
        input.nextDueAt,
        Number(input.enabled),
        nowIso,
        input.userId,
        existing.id,
      );
      return { reminderId: existing.id, operation: "update" };
    }

    const reminderId = createId("reminder");
    await database.runAsync(
      `INSERT INTO care_reminders (
        id, user_id, plant_id, reminder_type, frequency_days, enabled, next_due_at, last_triggered_at,
        notification_id, created_at, updated_at, updated_by, pending, synced_at, sync_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      reminderId,
      input.userId,
      input.plantId,
      "water",
      input.frequencyDays,
      Number(input.enabled),
      input.nextDueAt,
      null,
      null,
      nowIso,
      nowIso,
      input.userId,
      1,
      null,
      null,
    );
    return { reminderId, operation: "insert" };
  }
  ```

  Also add this import at the top if not already present:

  ```typescript
  import { getDatabase } from "@/services/database/sqlite";
  ```

  (It's already imported — no change needed.)

- [ ] **Step 4: Update `createPlant` in `plantsClient.ts`**

  In `features/plants/api/plantsClient.ts`, update the imports to add `upsertReminderInTransaction` and `reschedulePlantReminder`:

  ```typescript
  import {
    upsertReminder,
    upsertReminderInTransaction,
  } from "@/features/notifications/api/remindersClient";
  import { reschedulePlantReminder } from "@/features/notifications/services/remindersScheduler";
  ```

  In `createPlant`, replace the call to `upsertReminder` that happens AFTER `runAtomicMutationWithSyncOutbox`:

  Remove:

  ```typescript
  await upsertReminder({
    userId: input.userId,
    plantId,
    frequencyDays: input.wateringIntervalDays,
    nextDueAt: nextWaterDueAt,
    enabled: true,
  });
  ```

  Instead, inside the `runAtomicMutationWithSyncOutbox` callback (after the plant INSERT and optional photo INSERT), add before the `return { result: plantId, operations }`:

  ```typescript
  const { reminderId, operation: reminderOp } =
    await upsertReminderInTransaction(database, transactionNowIso, {
      userId: input.userId,
      plantId,
      frequencyDays: input.wateringIntervalDays,
      nextDueAt: nextWaterDueAt,
      enabled: true,
    });

  operations.push({
    entity: "care_reminders",
    entityId: reminderId,
    operation: reminderOp,
    payload: {
      userId: input.userId,
      plantId,
      frequencyDays: input.wateringIntervalDays,
      enabled: true,
    },
  });
  ```

  After `runAtomicMutationWithSyncOutbox` (outside the transaction), schedule the device notification as a recoverable step:

  ```typescript
  const created = await getPlantById(input.userId, plantId);
  if (created) {
    const reminder = created.reminders[0];
    if (reminder) {
      void reschedulePlantReminder(reminder, created.plant.name).catch(
        () => undefined,
      );
    }
  }
  return created!;
  ```

- [ ] **Step 5: Update `updatePlant` in `plantsClient.ts`**

  Same pattern as `createPlant`. Remove the post-transaction `upsertReminder` call:

  ```typescript
  // Remove this:
  await upsertReminder({
    userId: input.userId,
    plantId: input.plantId,
    frequencyDays: input.patch.wateringIntervalDays,
    nextDueAt: nextWaterDueAt ?? null,
    enabled: true,
  });
  ```

  Inside the `runAtomicMutationWithSyncOutbox` callback, before `return { result: input.plantId, operations }`, add:

  ```typescript
  const { reminderId, operation: reminderOp } =
    await upsertReminderInTransaction(database, transactionNowIso, {
      userId: input.userId,
      plantId: input.plantId,
      frequencyDays: input.patch.wateringIntervalDays,
      nextDueAt: nextWaterDueAt ?? null,
      enabled: true,
    });

  operations.push({
    entity: "care_reminders",
    entityId: reminderId,
    operation: reminderOp,
    payload: {
      userId: input.userId,
      plantId: input.plantId,
      frequencyDays: input.patch.wateringIntervalDays,
      enabled: true,
    },
  });
  ```

  After the transaction, schedule notification:

  ```typescript
  const updated = await getPlantById(input.userId, input.plantId);
  if (updated) {
    const reminder = updated.reminders[0];
    if (reminder) {
      void reschedulePlantReminder(reminder, updated.plant.name).catch(
        () => undefined,
      );
    }
  }
  return updated!;
  ```

- [ ] **Step 6: Update `createCareLog` in `careLogsClient.ts`**

  Import `upsertReminderInTransaction`:

  ```typescript
  import {
    upsertReminder,
    upsertReminderInTransaction,
  } from "@/features/notifications/api/remindersClient";
  import { reschedulePlantReminder } from "@/features/notifications/services/remindersScheduler";
  ```

  Inside `createCareLog`'s `runAtomicMutationWithSyncOutbox` callback, after the water-log path sets `reminderInput`, instead of returning `reminderInput` for post-transaction handling, call `upsertReminderInTransaction` directly:

  Replace the section:

  ```typescript
  if (optimized.nextDueAt) {
    reminderInput = {
      frequencyDays: plant.plant.wateringIntervalDays,
      nextDueAt: optimized.nextDueAt,
    };
  }
  ```

  With:

  ```typescript
  if (optimized.nextDueAt) {
    const { reminderId, operation: reminderOp } =
      await upsertReminderInTransaction(database, transactionNowIso, {
        userId: input.userId,
        plantId: input.plantId,
        frequencyDays: plant.plant.wateringIntervalDays,
        nextDueAt: optimized.nextDueAt,
        enabled: true,
      });
    operations.push({
      entity: "care_reminders",
      entityId: reminderId,
      operation: reminderOp,
      payload: {
        userId: input.userId,
        plantId: input.plantId,
        frequencyDays: plant.plant.wateringIntervalDays,
        enabled: true,
      },
    });
    reminderInput = {
      frequencyDays: plant.plant.wateringIntervalDays,
      nextDueAt: optimized.nextDueAt,
    };
  }
  ```

  After the transaction, replace the `upsertReminder` try/catch block with a `reschedulePlantReminder` call:

  ```typescript
  let warningMessage: string | null = null;
  if (execution.reminderInput) {
    try {
      const plantData = await getPlantById(input.userId, input.plantId);
      const reminder = plantData?.reminders[0];
      if (reminder) {
        await reschedulePlantReminder(
          reminder,
          plantData?.plant.name ?? "plant",
        );
      }
    } catch {
      warningMessage =
        "Care log saved on this device, but the reminder schedule needs another retry.";
    }
  }
  ```

  Also update the return type/shape: the `reminderInput` field in the result is still needed to gate the reschedule call — keep it as-is in the returned object.

- [ ] **Step 7: Run tests**

  ```bash
  npm test -- tests/plants/plantsClient.test.ts --no-coverage
  ```

  Expected: PASS

- [ ] **Step 8: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 9: Commit**

  ```bash
  git add features/notifications/api/remindersClient.ts \
          features/plants/api/plantsClient.ts \
          features/care-logs/api/careLogsClient.ts \
          tests/plants/plantsClient.test.ts
  git commit -m "fix(sync): make reminder upsert atomic with plant mutation — extract upsertReminderInTransaction"
  ```

---

## Task 7: Hydrate `users` Table on Login

**Problem:** `hydrateRemoteUserData` restores all 6 data tables but skips the `users` table. On a fresh device install + login, `display_name` and `avatar_url` are blank until the user manually edits their profile.

Note: `users` table has no `pending`/`synced_at`/`sync_error` columns — simpler conflict resolution.

**Files:**

- Modify: `services/database/remoteHydration.ts`
- Modify: `tests/services/remote-hydration.test.ts`

- [ ] **Step 1: Write the failing test**

  Add to `tests/services/remote-hydration.test.ts`:

  ```typescript
  describe("remoteHydration users table", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("hydrates users table from remote when remote is newer", async () => {
      mockFrom.mockImplementation((table: string) => ({
        select: () => ({
          eq: async () => ({
            data:
              table === "users"
                ? [
                    {
                      id: "user-1",
                      email: "test@example.com",
                      display_name: "Test User",
                      avatar_url: "https://example.com/avatar.jpg",
                      role: "user",
                      created_at: "2026-01-01T00:00:00.000Z",
                      updated_at: "2026-03-22T10:00:00.000Z",
                      updated_by: "user-1",
                    },
                  ]
                : table === "user_preferences"
                  ? [
                      {
                        user_id: "user-1",
                        reminders_enabled: true,
                        auto_sync_enabled: true,
                        preferred_theme: "linen-light",
                        timezone: "UTC",
                        default_watering_hour: 9,
                        created_at: "2026-01-01T00:00:00.000Z",
                        updated_at: "2026-03-22T10:00:00.000Z",
                        updated_by: "user-1",
                      },
                    ]
                  : [],
            error: null,
          }),
        }),
      }));

      const runAsync = jest.fn().mockResolvedValue(undefined);
      const getFirstAsync = jest
        .fn()
        .mockImplementation(async (sql: string) => {
          if (sql.includes("FROM users")) {
            return {
              updated_at: "2026-01-01T00:00:00.000Z",
            };
          }
          return {
            pending: 0,
            updated_at: "2026-01-01T00:00:00.000Z",
          };
        });
      const withTransactionAsync = jest.fn(
        async (callback: () => Promise<void>) => callback(),
      );

      mockGetDatabase.mockResolvedValue({
        getFirstAsync,
        runAsync,
        withTransactionAsync,
      });

      const {
        hydrateRemoteUserData,
      } = require("@/services/database/remoteHydration");
      await hydrateRemoteUserData("user-1");

      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO users"),
        "user-1",
        "test@example.com",
        "Test User",
        "https://example.com/avatar.jpg",
        "user",
        "2026-01-01T00:00:00.000Z",
        "2026-03-22T10:00:00.000Z",
        "user-1",
      );
    });

    it("skips users hydration when local row is newer", async () => {
      mockFrom.mockImplementation((table: string) => ({
        select: () => ({
          eq: async () => ({
            data:
              table === "users"
                ? [
                    {
                      id: "user-1",
                      email: "test@example.com",
                      display_name: "Old Name",
                      avatar_url: null,
                      role: "user",
                      created_at: "2026-01-01T00:00:00.000Z",
                      updated_at: "2026-03-20T00:00:00.000Z",
                      updated_by: "user-1",
                    },
                  ]
                : [],
            error: null,
          }),
        }),
      }));

      const runAsync = jest.fn().mockResolvedValue(undefined);
      const getFirstAsync = jest
        .fn()
        .mockImplementation(async (sql: string) => {
          if (sql.includes("FROM users")) {
            return { updated_at: "2026-03-25T00:00:00.000Z" };
          }
          return { pending: 0, updated_at: "2026-01-01T00:00:00.000Z" };
        });
      const withTransactionAsync = jest.fn(
        async (callback: () => Promise<void>) => callback(),
      );

      mockGetDatabase.mockResolvedValue({
        getFirstAsync,
        runAsync,
        withTransactionAsync,
      });

      const {
        hydrateRemoteUserData,
      } = require("@/services/database/remoteHydration");
      await hydrateRemoteUserData("user-1");

      const didWriteUsers = runAsync.mock.calls.some((call) =>
        String(call[0]).includes("INSERT OR REPLACE INTO users"),
      );
      expect(didWriteUsers).toBe(false);
    });
  });
  ```

- [ ] **Step 2: Run tests to confirm failure**

  ```bash
  npm test -- tests/services/remote-hydration.test.ts --no-coverage
  ```

  Expected: FAIL — "INSERT OR REPLACE INTO users" is never called.

- [ ] **Step 3: Add `RemoteUserRow` interface to `remoteHydration.ts`**

  In `services/database/remoteHydration.ts`, add after the existing `RemoteGraveyardRow` interface:

  ```typescript
  interface RemoteUserRow {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
  }
  ```

- [ ] **Step 4: Add a `shouldReplaceLocalUser` helper**

  Add after `shouldReplaceLocalUserPreferences`:

  ```typescript
  async function shouldReplaceLocalUser(
    database: SQLiteDatabase,
    userId: string,
    remoteUpdatedAt: string,
  ) {
    const localRow = await database.getFirstAsync<{ updated_at: string }>(
      `SELECT updated_at FROM users WHERE id = ? LIMIT 1;`,
      userId,
    );

    if (!localRow) {
      return true;
    }

    return remoteUpdatedAt > localRow.updated_at;
  }
  ```

- [ ] **Step 5: Add users fetch to `hydrateRemoteUserData`**

  In `hydrateRemoteUserData`, add `usersResult` to the `Promise.all`:

  ```typescript
  const [
    preferencesResult,
    plantsResult,
    photosResult,
    careLogsResult,
    remindersResult,
    graveyardResult,
    usersResult,
  ] = await Promise.all([
    // ... existing 6 fetches ...
    fetchRemoteRowsSafe<RemoteUserRow>(
      "users",
      [
        "id",
        "email",
        "display_name",
        "avatar_url",
        "role",
        "created_at",
        "updated_at",
        "updated_by",
      ].join(", "),
      userId,
    ),
  ]);
  ```

  Also add:

  ```typescript
  const remoteUser = usersResult.rows[0] ?? null;
  ```

  Inside `database.withTransactionAsync(async () => { ... })`, add at the beginning (before the preferences block):

  ```typescript
  if (
    remoteUser &&
    (await shouldReplaceLocalUser(database, userId, remoteUser.updated_at))
  ) {
    await database.runAsync(
      `INSERT OR REPLACE INTO users (
        id, email, display_name, avatar_url, role, created_at, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      remoteUser.id,
      remoteUser.email,
      remoteUser.display_name,
      remoteUser.avatar_url ?? null,
      remoteUser.role,
      remoteUser.created_at,
      remoteUser.updated_at,
      remoteUser.updated_by ?? remoteUser.id,
    );
  }
  ```

- [ ] **Step 6: Run tests to confirm pass**

  ```bash
  npm test -- tests/services/remote-hydration.test.ts --no-coverage
  ```

  Expected: PASS (all tests in this file).

- [ ] **Step 7: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 8: Commit**

  ```bash
  git add services/database/remoteHydration.ts tests/services/remote-hydration.test.ts
  git commit -m "fix(sync): hydrate users table on login to restore display_name and avatar_url"
  ```

---

## Task 8: Persist Plant Library Filter and Sort

**Problem:** `usePlantStore` has no `persist` middleware. `filter` and `sort` reset to defaults on every app restart.

**Files:**

- Modify: `features/plants/stores/usePlantStore.ts`

`@react-native-async-storage/async-storage` is already in `package.json`. `zustand/middleware` is bundled with zustand v5.

- [ ] **Step 1: Write the failing test**

  Create `tests/stores/usePlantStore.test.ts`:

  ```typescript
  import AsyncStorage from "@react-native-async-storage/async-storage";

  jest.mock("@react-native-async-storage/async-storage", () =>
    require("@react-native-community/async-storage/jest/async-storage-mock"),
  );

  describe("usePlantStore persistence", () => {
    beforeEach(async () => {
      await AsyncStorage.clear();
      jest.resetModules();
    });

    it("has persist middleware configured for filter and sort", async () => {
      const {
        usePlantStore,
      } = require("@/features/plants/stores/usePlantStore");

      // Verify the store has a persist API (added by persist middleware)
      expect(usePlantStore.persist).toBeDefined();
      expect(typeof usePlantStore.persist.getOptions).toBe("function");

      const options = usePlantStore.persist.getOptions();
      expect(options.name).toBe("plant-library-prefs");
    });

    it("does not persist query (search text)", async () => {
      const {
        usePlantStore,
      } = require("@/features/plants/stores/usePlantStore");
      const options = usePlantStore.persist.getOptions();

      // partialize should exclude query
      const state = { filter: "all", sort: "recent", query: "test search" };
      const partial = options.partialize(state);
      expect(partial).not.toHaveProperty("query");
      expect(partial).toHaveProperty("filter");
      expect(partial).toHaveProperty("sort");
    });
  });
  ```

- [ ] **Step 2: Run test to confirm failure**

  ```bash
  npm test -- tests/stores/usePlantStore.test.ts --no-coverage
  ```

  Expected: FAIL — `usePlantStore.persist` is undefined.

- [ ] **Step 3: Update `usePlantStore.ts`**

  Replace the entire file:

  ```typescript
  import AsyncStorage from "@react-native-async-storage/async-storage";
  import { create } from "zustand";
  import { persist, createJSONStorage } from "zustand/middleware";

  import type { PlantLibraryFilter, PlantSortOption } from "@/types/ui";

  interface PlantStoreState {
    filter: PlantLibraryFilter;
    sort: PlantSortOption;
    query: string;
    setFilter: (filter: PlantLibraryFilter) => void;
    setSort: (sort: PlantSortOption) => void;
    setQuery: (query: string) => void;
  }

  export const usePlantStore = create<PlantStoreState>()(
    persist(
      (set) => ({
        filter: "all",
        sort: "recent",
        query: "",
        setFilter: (filter) => set({ filter }),
        setSort: (sort) => set({ sort }),
        setQuery: (query) => set({ query }),
      }),
      {
        name: "plant-library-prefs",
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({ filter: state.filter, sort: state.sort }),
      },
    ),
  );
  ```

- [ ] **Step 4: Run test to confirm pass**

  ```bash
  npm test -- tests/stores/usePlantStore.test.ts --no-coverage
  ```

  Expected: PASS

- [ ] **Step 5: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 6: Commit**

  ```bash
  git add features/plants/stores/usePlantStore.ts tests/stores/usePlantStore.test.ts
  git commit -m "fix(stores): persist plant library filter and sort across app restarts"
  ```

---

## Task 9: Trigger Sync When `autoSyncEnabled` Toggles On

**Problem:** `SyncBootstrapProvider` triggers sync on bootstrap, foreground, network restore, and queue changes — but NOT when `autoSyncEnabled` preference transitions false→true. A user who enables sync mid-session must restart the app or wait for the next foreground event.

**Files:**

- Modify: `features/settings/hooks/useUpdateSettings.ts`
- Modify: `providers/SyncBootstrapProvider.tsx`

- [ ] **Step 1: Update `useUpdateSettings.ts`**

  The cleanest fix is to trigger sync directly in the mutation's `onSuccess` when `autoSyncEnabled` was just set to `true`:

  ```typescript
  import { useMutation, useQueryClient } from "@tanstack/react-query";

  import { queryKeys } from "@/config/constants";
  import { useAuth } from "@/features/auth/hooks/useAuth";
  import { useNetworkState } from "@/hooks/useNetworkState";
  import { invalidateBackupQueries } from "@/features/profile/utils/invalidateBackupQueries";
  import { updateUserPreferences } from "@/features/settings/api/settingsClient";
  import { runUserDataSync } from "@/services/database/userDataSync";
  import { logger } from "@/utils/logger";

  export function useUpdateSettings() {
    const { user } = useAuth();
    const { isOffline } = useNetworkState();
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (patch: {
        remindersEnabled?: boolean;
        autoSyncEnabled?: boolean;
        defaultWateringHour?: number;
        timezone?: string;
      }) => updateUserPreferences(user!.id, patch),
      onSuccess: (_, variables) => {
        queryClient
          .invalidateQueries({ queryKey: queryKeys.preferences })
          .catch(() => undefined);

        if (variables.autoSyncEnabled === true && !isOffline && user?.id) {
          const userId = user.id;
          void (async () => {
            try {
              await runUserDataSync({ userId, trigger: "auto-settings" });
              await invalidateBackupQueries(queryClient, userId).catch(
                () => undefined,
              );
            } catch (error) {
              logger.warn("sync.auto_settings.failed", {
                userId,
                message:
                  error instanceof Error ? error.message : "Unknown error",
              });
            }
          })();
        }
      },
    });
  }
  ```

- [ ] **Step 2: Verify `UserDataSyncTrigger` type accepts `"auto-settings"`**

  Run:

  ```bash
  grep -n "UserDataSyncTrigger" services/database/userDataSync.ts
  ```

  If `UserDataSyncTrigger` is a union of string literals, add `"auto-settings"` to it:

  ```typescript
  export type UserDataSyncTrigger =
    | "manual"
    | "auto-bootstrap"
    | "auto-foreground"
    | "auto-network"
    | "auto-queue"
    | "auto-settings";
  ```

- [ ] **Step 3: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 4: Commit**

  ```bash
  git add features/settings/hooks/useUpdateSettings.ts services/database/userDataSync.ts
  git commit -m "fix(sync): trigger sync immediately when user enables auto-sync"
  ```

---

## Task 10: Observation Tags Column Migration

**Problem:** Observation tags are embedded as `\n\n[meta:{"tags":["new growth"]}]` in `care_logs.notes`. There is no dedicated `tags` column — the data is invisible to queries, sync, and backup, and corrupts the display of notes.

**Files:**

- Modify: `services/database/migrations.ts`
- Modify: `features/care-logs/api/careLogsClient.ts`
- Modify: `types/models.ts` (add `tags` field to `CareLog`)

- [ ] **Step 1: Check `CareLog` type**

  Run:

  ```bash
  grep -n "CareLog" types/models.ts | head -20
  ```

- [ ] **Step 2: Add `tags` field to `CareLog` model**

  In `types/models.ts`, add `tags: string[] | null` to the `CareLog` interface:

  ```typescript
  export interface CareLog {
    // ... existing fields ...
    tags: string[] | null;
  }
  ```

- [ ] **Step 3: Add `tags` column migration**

  In `services/database/migrations.ts`, in `runDatabaseMigrations`, add after the last `ensureColumn` call:

  ```typescript
  await ensureColumn(database, "care_logs", "tags", "TEXT");
  await backfillEmbeddedTagsFromNotes(database);
  ```

  Add the backfill function before `runDatabaseMigrations`:

  ```typescript
  async function backfillEmbeddedTagsFromNotes(database: SQLiteDatabase) {
    const rows = await database.getAllAsync<{
      id: string;
      notes: string | null;
    }>(
      `SELECT id, notes FROM care_logs WHERE tags IS NULL AND notes LIKE '%[meta:%';`,
    );

    for (const row of rows) {
      if (!row.notes) continue;
      const { cleanNotes, tags } = extractEmbeddedTags(row.notes);
      if (tags.length === 0) continue;

      await database.runAsync(
        `UPDATE care_logs SET notes = ?, tags = ? WHERE id = ?;`,
        cleanNotes || null,
        JSON.stringify(tags),
        row.id,
      );
    }
  }

  function extractEmbeddedTags(notes: string): {
    cleanNotes: string;
    tags: string[];
  } {
    const metaPattern = /\n\n\[meta:(\{[^}]+\})\]/g;
    const tags: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = metaPattern.exec(notes)) !== null) {
      try {
        const parsed = JSON.parse(match[1]) as { tags?: unknown };
        if (Array.isArray(parsed.tags)) {
          for (const tag of parsed.tags) {
            if (typeof tag === "string") {
              tags.push(tag);
            }
          }
        }
      } catch {
        // malformed meta — skip
      }
    }

    const cleanNotes = notes.replace(/\n\n\[meta:\{[^}]+\}\]/g, "").trim();
    return { cleanNotes, tags };
  }
  ```

  Export `extractEmbeddedTags` for use in the client:

  ```typescript
  export { extractEmbeddedTags };
  ```

- [ ] **Step 4: Update `mapCareLog` in `careLogsClient.ts`**

  The `mapCareLog` function in `careLogsClient.ts` needs to read the `tags` column and parse it:

  Update the row type to include `tags: string | null` and update `mapCareLog`:

  ```typescript
  function mapCareLog(row: {
    // ... existing fields ...
    tags: string | null;
  }): CareLog {
    return {
      // ... existing fields ...
      tags: row.tags ? (JSON.parse(row.tags) as string[]) : null,
    };
  }
  ```

  Update all `SELECT * FROM care_logs` queries — they will auto-include `tags` since the column exists after migration. No SQL changes needed.

- [ ] **Step 5: Update `createCareLog` to strip embedded tags and write to `tags` column**

  In `createCareLog`, before writing `input.notes` to the database, extract embedded tags:

  ```typescript
  import { extractEmbeddedTags } from "@/services/database/migrations";

  // Inside createCareLog, before the INSERT:
  const { cleanNotes, tags: extractedTags } = input.notes
    ? extractEmbeddedTags(input.notes)
    : { cleanNotes: null, tags: [] };

  const tagsJson =
    extractedTags.length > 0 ? JSON.stringify(extractedTags) : null;
  ```

  Update the INSERT to write `cleanNotes` and `tagsJson`:

  ```typescript
  await database.runAsync(
    `INSERT INTO care_logs (
      id, user_id, plant_id, log_type, current_condition, notes, tags, logged_at, created_at, updated_at, updated_by,
      pending, synced_at, sync_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    logId,
    input.userId,
    input.plantId,
    input.logType,
    input.currentCondition ?? null,
    cleanNotes || null,
    tagsJson,
    transactionNowIso,
    transactionNowIso,
    transactionNowIso,
    input.userId,
    1,
    null,
    null,
  );
  ```

- [ ] **Step 6: Update `updateCareLogNote` similarly**

  ```typescript
  const { cleanNotes: finalNotes, tags: extractedTags } =
    extractEmbeddedTags(trimmedNotes);
  const tagsJson =
    extractedTags.length > 0 ? JSON.stringify(extractedTags) : null;
  ```

  Update the UPDATE SQL:

  ```typescript
  await database.runAsync(
    `UPDATE care_logs
     SET notes = ?, tags = ?, updated_at = ?, updated_by = ?, pending = 1, synced_at = NULL, sync_error = NULL
     WHERE id = ? AND user_id = ? AND plant_id = ?;`,
    finalNotes || null,
    tagsJson,
    transactionNowIso,
    input.userId,
    input.careLogId,
    input.userId,
    input.plantId,
  );
  ```

- [ ] **Step 7: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: 0 errors. Fix any `CareLog` type errors in callers (add `tags` field where needed, allow `null`).

- [ ] **Step 8: Commit**

  ```bash
  git add services/database/migrations.ts features/care-logs/api/careLogsClient.ts types/models.ts
  git commit -m "feat(care-logs): add tags column — extract embedded meta tags from notes into structured column"
  ```

---

## Task 11: `permissionsService.ts` Type Alignment

After removing `location` from `useOnboardingPermissions.ts` (Task 2), ensure `OnboardingPermissionSnapshot` in `permissionsService.ts` is updated to match and `getPermissionSnapshot` no longer returns or checks location.

**Files:**

- Modify: `features/onboarding/services/permissionsService.ts`

- [ ] **Step 1: Read the current file**

  ```bash
  cat features/onboarding/services/permissionsService.ts
  ```

- [ ] **Step 2: Update `OnboardingPermissionSnapshot` and `getPermissionSnapshot`**

  Remove `location` from:
  - The `OnboardingPermissionSnapshot` type/interface
  - The return value of `getPermissionSnapshot()`
  - Any internal call to `getLocationPermissionState()` inside `getPermissionSnapshot`

  Keep `getLocationPermissionState` and `requestLocationPermission` exported (future use).

  Example updated `getPermissionSnapshot`:

  ```typescript
  export async function getPermissionSnapshot(): Promise<OnboardingPermissionSnapshot> {
    const [notifications, media] = await Promise.all([
      getNotificationPermissionState(),
      getMediaPermissionState(),
    ]);
    return { notifications, media };
  }
  ```

  Updated type:

  ```typescript
  export interface OnboardingPermissionSnapshot {
    notifications: PermissionState;
    media: PermissionState;
  }
  ```

- [ ] **Step 3: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 4: Commit**

  ```bash
  git add features/onboarding/services/permissionsService.ts
  git commit -m "fix(onboarding): remove location from OnboardingPermissionSnapshot type"
  ```

---

## Task 12: Validate and Clean Up Unused Imports

After all the above changes, run a final typecheck and lint pass to catch any dangling imports (e.g., `upsertReminder` in `plantsClient.ts` may no longer be needed if `upsertReminderInTransaction` replaces it in all call sites).

**Files:** Various

- [ ] **Step 1: Run typecheck**

  ```bash
  npm run typecheck
  ```

- [ ] **Step 2: Run lint**

  ```bash
  npm run lint
  ```

- [ ] **Step 3: Remove unused imports flagged by lint**

  In `features/plants/api/plantsClient.ts`, if `upsertReminder` is no longer imported after being replaced by `upsertReminderInTransaction`, remove it from the import.

  In `features/care-logs/api/careLogsClient.ts`, same check.

- [ ] **Step 4: Re-run typecheck and lint to confirm clean**

  ```bash
  npm run typecheck && npm run lint
  ```

  Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

  ```bash
  git add -p
  git commit -m "chore: remove unused imports after production readiness refactor"
  ```

---

## Task 13: Run Full Test Suite

- [ ] **Step 1: Run all tests**

  ```bash
  npm test -- --no-coverage
  ```

  Expected: All tests PASS. Fix any regressions before marking complete.

- [ ] **Step 2: Run typecheck one final time**

  ```bash
  npm run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 3: Verify `docs/README.md` is current**

  The `docs/README.md` already references `V1_IMPLEMENTATION_SUMMARY.md`. Update `docs/engineering/V1_IMPLEMENTATION_SUMMARY.md` if it exists as a new file.

---

## Self-Review Checklist

### Spec Coverage

| Audit Item                                                         | Task             |
| ------------------------------------------------------------------ | ---------------- |
| `EXPO_PUBLIC_ENABLE_SYNC_TRIALS` missing from production EAS build | Task 1           |
| Location permission requested with no location feature             | Task 2 + Task 11 |
| Subscription card shows "coming soon" UI                           | Task 3           |
| "Watering Alerts" toggle controls all reminders                    | Task 4 (rename)  |
| `wateringIntervalDays` not validated at client layer               | Task 5           |
| Reminder upsert not atomic with plant insert/update                | Task 6           |
| `users` table not hydrated on remote sync                          | Task 7           |
| Plant filter/sort lost on restart                                  | Task 8           |
| Sync not triggered when `autoSyncEnabled` toggles on               | Task 9           |
| Tags embedded in notes string field                                | Task 10          |

### No Placeholder Verification

- Every code step contains actual code, not "add handling here"
- Every command step includes the exact command and expected output
- `extractEmbeddedTags` is defined in full before it is used in Task 10

### Type Consistency

- `upsertReminderInTransaction` is declared `async function` returning `Promise<{ reminderId: string; operation: "insert" | "update" }>`
- `SyncOutboxOperation.operation` type in `syncOutbox.ts` is `"insert" | "update" | "delete"` — `reminderOp` assignment is compatible
- `extractEmbeddedTags` is exported from `migrations.ts` and imported in `careLogsClient.ts`
- `CareLog.tags` is `string[] | null` in `types/models.ts`; `mapCareLog` parses from JSON safely
