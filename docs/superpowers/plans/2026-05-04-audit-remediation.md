# Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all findings from the May 2026 enterprise audit — 5 hard blockers, data-integrity fixes, sync hardening, and nice-to-have improvements — to achieve App Store / Play Store readiness.

**Architecture:** Each task is isolated to its own files. Blockers (Tasks 1–5) must land before the others but have no dependencies on each other and can be dispatched in any order. Data-integrity fixes (Tasks 6–7) touch care-log and plant write paths. Sync/infra improvements (Tasks 8–11) add capabilities without changing existing APIs. Cleanup (Tasks 12–14) removes dead code.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router, SQLite via `expo-sqlite`, Supabase (auth + Edge Functions + storage), React Query, Zustand, TypeScript strict, Jest/jest-expo.

---

## File Map

| File | Change |
|---|---|
| `app/error.tsx` | **Create** — Expo Router error boundary screen |
| `supabase/functions/delete-account/index.ts` | **Create** — Edge Function: validates JWT, deletes Supabase auth user |
| `features/auth/api/authClient.ts` | **Modify** — add `deleteAccount()` + `clearAllLocalUserData()` |
| `app/privacy-security.tsx` | **Modify** — wire Delete Account, replace "coming soon" with real link, remove analytics toggle |
| `features/ai/components/SpeciesSuggestionBanner.tsx` | **Modify** — suppress fabricated confidence display for `source === "local"` |
| `features/care-logs/api/careLogsClient.ts` | **Modify** — use `loggedAt` input for `last_watered_at` update |
| `features/plants/api/plantsClient.ts` | **Modify** — log warning on notification scheduling failure |
| `services/database/migrations.ts` | **Modify** — add UNIQUE index on `care_reminders(plant_id, user_id)` |
| `features/profile/api/profileClient.ts` | **Modify** — add `syncEnabled` flag to `BackupSummary` |
| `features/profile/components/BackupStatusCard.tsx` (or wherever backup status is rendered) | **Modify** — show "sync disabled" warning when `!syncEnabled` |
| `services/database/sync.ts` | **Modify** — log warning when item exceeds max retry ceiling |
| `features/care-logs/api/careLogsClient.ts` | **Modify** — add `limit`/`offset` pagination to `listCareLogs` |
| `features/care-logs/hooks/useLogs.ts` | **Modify** — expose pagination params |
| `features/onboarding/services/permissionsService.ts` | **Modify** — remove unused location exports |
| `tests/features/auth/delete-account.test.ts` | **Create** — tests for account deletion path |
| `tests/features/care-logs/care-logs-client-loggedat.test.ts` | **Create** — tests for `loggedAt` being used for `last_watered_at` |
| `tests/services/sync-retry-ceiling.test.ts` | **Create** — tests for max retry logging |

---

## Task 1: Global Error Boundary

**Files:**
- Create: `app/error.tsx`

- [ ] **Step 1: Write the test** (manual only — error boundaries are tested manually; skip automated test for this task)

- [ ] **Step 2: Create `app/error.tsx`**

```typescript
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  useEffect(() => {
    // Log to your telemetry here if desired
    console.error("[ErrorBoundary] Unhandled route error:", error);
  }, [error]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        {error?.message ?? "An unexpected error occurred. Please try again."}
      </Text>
      <Pressable style={styles.button} onPress={retry}>
        <Text style={styles.buttonLabel}>TRY AGAIN</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#faf9f7",
    gap: 16,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 26,
    lineHeight: 32,
    color: "#1c1c1e",
    textAlign: "center",
  },
  message: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
    color: "#6e6e73",
    textAlign: "center",
    maxWidth: 300,
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "#4a7c59",
    borderRadius: 999,
  },
  buttonLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.4,
    color: "#ffffff",
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/error.tsx
git commit -m "feat(ux): add global error boundary screen for unhandled route errors"
```

---

## Task 2: Account Deletion (Supabase Edge Function + client + UI)

**Files:**
- Create: `supabase/functions/delete-account/index.ts`
- Modify: `features/auth/api/authClient.ts`
- Modify: `app/privacy-security.tsx`
- Create: `tests/features/auth/delete-account.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/features/auth/delete-account.test.ts`:

```typescript
const mockSignOut = jest.fn();
const mockInvoke = jest.fn();
const mockGetDatabase = jest.fn();

jest.mock("@/config/env", () => ({
  env: { isSupabaseConfigured: true, isDevelopmentBuild: false },
}));

jest.mock("@/config/supabase", () => ({
  supabase: {
    auth: { signOut: (...args: unknown[]) => mockSignOut(...args) },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/services/auth/sessionManager", () => ({
  clearSession: jest.fn(),
}));

describe("deleteAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({});
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
    const runAsync = jest.fn().mockResolvedValue(undefined);
    mockGetDatabase.mockResolvedValue({ runAsync });
  });

  it("calls the delete-account Edge Function when Supabase is configured", async () => {
    const { deleteAccount } = require("@/features/auth/api/authClient");
    await deleteAccount();
    expect(mockInvoke).toHaveBeenCalledWith("delete-account", expect.any(Object));
  });

  it("clears the session after deletion", async () => {
    const { clearSession } = require("@/services/auth/sessionManager");
    const { deleteAccount } = require("@/features/auth/api/authClient");
    await deleteAccount();
    expect(clearSession).toHaveBeenCalled();
  });

  it("throws if the Edge Function returns an error", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error("Edge Function failed") });
    const { deleteAccount } = require("@/features/auth/api/authClient");
    await expect(deleteAccount()).rejects.toThrow("Edge Function failed");
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
npm test -- --runInBand --testPathPattern="delete-account"
```

Expected: FAIL with "deleteAccount is not a function"

- [ ] **Step 3: Create the Supabase Edge Function**

Create `supabase/functions/delete-account/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { jsonResponse } from "../_shared/json";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing authorization header." }, 401);
  }

  const jwt = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

  if (authError || !user) {
    return jsonResponse({ error: "Invalid or expired token." }, 401);
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500);
  }

  return jsonResponse({ success: true });
});
```

- [ ] **Step 4: Add `deleteAccount` and `clearAllLocalUserData` to `features/auth/api/authClient.ts`**

Add these two exports at the end of the file, before `export { AuthClientError };`:

```typescript
async function clearAllLocalUserData() {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM sync_queue;
    DELETE FROM care_reminders;
    DELETE FROM care_logs;
    DELETE FROM photos;
    DELETE FROM graveyard_plants;
    DELETE FROM plants;
    DELETE FROM user_preferences;
    DELETE FROM users;
  `);
}

export async function deleteAccount(): Promise<void> {
  if (env.isSupabaseConfigured && supabase) {
    const { error } = await supabase.functions.invoke("delete-account", {});
    if (error) {
      throw new AuthClientError(
        "DELETE_ACCOUNT_FAILED",
        error.message ?? "Account deletion failed. Please try again.",
      );
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Best-effort sign out; account is already deleted remotely.
    }
  }
  await clearAllLocalUserData();
  await clearSession();
}
```

- [ ] **Step 5: Run the test — expect PASS**

```bash
npm test -- --runInBand --testPathPattern="delete-account"
```

Expected: PASS

- [ ] **Step 6: Wire the UI in `app/privacy-security.tsx`**

Replace the entire file content with:

```typescript
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { deleteAccount } from "@/features/auth/api/authClient";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";

const PRIVACY_POLICY_URL = "https://conservatory.app/privacy";

export default function PrivacySecurityScreen() {
  const { colors } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    const confirmed = await alert.show({
      variant: "destructive",
      title: "Delete account",
      message:
        "This permanently removes all your plant collections, growth journals, and care history. This action cannot be undone.",
      primaryAction: { label: "Delete forever", tone: "danger" },
      secondaryAction: { label: "Cancel" },
    });

    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteAccount();
      router.replace("/(auth)/login");
    } catch (error) {
      snackbar.error(
        error instanceof Error
          ? error.message
          : "Account deletion failed. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ProfileScreenScaffold
      title="Privacy & Security"
      subtitle="Account safety"
      description="Your botanical journey is a private one. We ensure your data is as protected as a rare orchid in a climate-controlled conservatory."
    >
      <View
        style={[
          styles.card,
          styles.archiveCard,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <View style={styles.archiveCopy}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            Your Botanical Archive
          </Text>
          <Text
            style={[styles.archiveBody, { color: colors.onSurfaceVariant }]}
          >
            Download a comprehensive record of your plant care history, photos,
            and personal journals in a portable format.
          </Text>
        </View>

        <View style={styles.archiveLinkWrap}>
          <View
            style={[
              styles.archiveUnderline,
              { backgroundColor: colors.primaryFixed },
            ]}
          />
          <Text
            accessibilityRole="link"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            style={[styles.archiveLink, { color: colors.primary }]}
          >
            Privacy Policy{" "}
            <Icon
              name="open-in-new"
              family="MaterialIcons"
              size={14}
              color={colors.primary}
            />
          </Text>
        </View>
      </View>

      <View style={styles.dangerSection}>
        <View
          style={[
            styles.dangerDivider,
            { backgroundColor: colors.outlineVariant },
          ]}
        />
        <View style={styles.dangerContent}>
          <Text style={[styles.dangerEyebrow, { color: colors.error }]}>
            CAUTIONARY STEPS
          </Text>
          <Text style={[styles.dangerTitle, { color: colors.onSurface }]}>
            End of the Season
          </Text>
          <Text style={[styles.dangerBody, { color: colors.onSurfaceVariant }]}>
            Deleting your account will permanently remove all your plant
            collections, growth journals, and care history. This action cannot
            be undone.
          </Text>

          <PrimaryButton
            label="Delete Account"
            icon="delete-forever"
            iconFamily="MaterialIcons"
            tone="danger"
            loading={deleting}
            disabled={deleting}
            onPress={() => void handleDeleteAccount()}
          />

          <Text style={[styles.dangerNote, { color: colors.outline }]}>
            Once deleted, your data will be purged from our soil within 30 days.
          </Text>
        </View>
      </View>
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 20,
  },
  cardTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 6,
    textAlign: "center",
  },
  archiveCard: {
    alignItems: "center",
    gap: 20,
    paddingVertical: 24,
  },
  archiveCopy: {
    alignItems: "center",
    gap: 4,
  },
  archiveBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 278,
  },
  archiveLinkWrap: {
    alignItems: "center",
    gap: 6,
  },
  archiveUnderline: {
    width: 176,
    height: 3,
    borderRadius: 999,
    opacity: 0.85,
  },
  archiveLink: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  dangerSection: {
    gap: 28,
    paddingTop: 14,
  },
  dangerDivider: {
    height: 1,
    opacity: 0.2,
  },
  dangerContent: {
    alignItems: "center",
    gap: 10,
  },
  dangerEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 3.4,
  },
  dangerTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
    lineHeight: 38,
    textAlign: "center",
  },
  dangerBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 18,
  },
  dangerNote: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
    textAlign: "center",
    maxWidth: 280,
    marginTop: 8,
  },
});
```

**Note:** `useAlert.show()` must return a `Promise<boolean>` where `true` = primary action taken. Verify the signature in `hooks/useAlert.ts` before implementing — if it returns `void`, replace the conditional with a nested `.then()` callback or use a two-step state approach with a second confirmation alert.

- [ ] **Step 7: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/delete-account/index.ts \
        features/auth/api/authClient.ts \
        app/privacy-security.tsx \
        tests/features/auth/delete-account.test.ts
git commit -m "feat(auth): implement account deletion with Supabase Edge Function and local DB clear"
```

---

## Task 3: Remove Analytics Toggle (fake control)

**Files:**
- Modify: `app/privacy-security.tsx` (already replaced in Task 2 — this task is pre-completed by Task 2's full rewrite)

This task is satisfied by Task 2's rewrite of `privacy-security.tsx`, which omits the `analyticsCard` section, the `dataSharingEnabled` state, and all associated styles. No additional work needed.

- [ ] **Step 1: Verify no `dataSharingEnabled` state in `app/privacy-security.tsx` after Task 2**

```bash
grep -n "dataSharingEnabled\|analyticsCard\|Usage Insights" app/privacy-security.tsx
```

Expected: no output (the analytics section is gone)

- [ ] **Step 2: Commit if any residual changes remain**

If Task 2 was committed in one commit, no separate commit is needed here.

---

## Task 4: Fix Species Suggestion — Suppress Fabricated Confidence for Local Matches

**Files:**
- Modify: `features/ai/components/SpeciesSuggestionBanner.tsx`

The `source === "local"` path uses URI keyword matching with hard-coded confidence values (0.68–0.72). These values should not be displayed as meaningful percentages to users. When `source === "local"`, show a neutral indicator instead of the confidence percentage and qualifier.

- [ ] **Step 1: Modify `features/ai/components/SpeciesSuggestionBanner.tsx`**

Replace:

```typescript
function confidenceQualifier(confidence: number) {
  if (confidence >= 0.8) {
    return "High confidence";
  }

  if (confidence >= 0.65) {
    return "Moderate confidence";
  }

  return "Low confidence";
}

export function SpeciesSuggestionBanner({
  suggestion,
  onAccept,
  onDismiss,
}: SpeciesSuggestionBannerProps) {
  const { colors } = useTheme();
  const qualifier = confidenceQualifier(suggestion.confidence);
  const confidenceText = `Confidence: ${Math.round(suggestion.confidence * 100)}%`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainerLow,
          borderColor: "rgba(193, 200, 194, 0.25)",
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: colors.secondary }]}>
        QUIET SUGGESTION
      </Text>
      <Text style={[styles.title, { color: colors.onSurface }]}>
        Likely {suggestion.species} · {qualifier}
      </Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        {suggestion.careProfileHint ?? "Use it as a starting point only."}
      </Text>
      <Text style={[styles.confidenceMeta, { color: colors.onSurfaceVariant }]}>
        {confidenceText}
      </Text>
```

With:

```typescript
function confidenceQualifier(confidence: number) {
  if (confidence >= 0.8) {
    return "High confidence";
  }

  if (confidence >= 0.65) {
    return "Moderate confidence";
  }

  return "Low confidence";
}

export function SpeciesSuggestionBanner({
  suggestion,
  onAccept,
  onDismiss,
}: SpeciesSuggestionBannerProps) {
  const { colors } = useTheme();
  const isLocalMatch = suggestion.source === "local";
  const qualifier = isLocalMatch
    ? "Pattern match"
    : confidenceQualifier(suggestion.confidence);
  const confidenceText = isLocalMatch
    ? "Based on name pattern — verify before saving."
    : `Confidence: ${Math.round(suggestion.confidence * 100)}%`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainerLow,
          borderColor: "rgba(193, 200, 194, 0.25)",
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: colors.secondary }]}>
        QUIET SUGGESTION
      </Text>
      <Text style={[styles.title, { color: colors.onSurface }]}>
        Likely {suggestion.species} · {qualifier}
      </Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        {suggestion.careProfileHint ?? "Use it as a starting point only."}
      </Text>
      <Text style={[styles.confidenceMeta, { color: colors.onSurfaceVariant }]}>
        {confidenceText}
      </Text>
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add features/ai/components/SpeciesSuggestionBanner.tsx
git commit -m "fix(ai): distinguish pattern-match suggestions from cloud AI — suppress fabricated confidence display"
```

---

## Task 5: Fix `lastWateredAt` to use `loggedAt`, Not Transaction Time

**Files:**
- Modify: `features/care-logs/api/careLogsClient.ts`
- Create: `tests/features/care-logs/care-logs-client-loggedat.test.ts`

When a user backdates a care log entry, `plant.last_watered_at` was being set to `transactionNowIso` (the current clock time) rather than the log's `loggedAt` value. This makes health state and `nextWaterDueAt` incorrect for backdated entries.

- [ ] **Step 1: Write the failing test**

Create `tests/features/care-logs/care-logs-client-loggedat.test.ts`:

```typescript
const mockGetDatabase = jest.fn();
const mockGetPlantById = jest.fn();
const mockGetUserPreferences = jest.fn();
const mockRunAtomicMutation = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/features/plants/api/plantsClient", () => ({
  getPlantById: (...args: unknown[]) => mockGetPlantById(...args),
}));

jest.mock("@/features/auth/api/authClient", () => ({
  getUserPreferences: (...args: unknown[]) => mockGetUserPreferences(...args),
}));

jest.mock("@/services/database/syncOutbox", () => ({
  runAtomicMutationWithSyncOutbox: (...args: unknown[]) =>
    mockRunAtomicMutation(...args),
}));

jest.mock("@/features/notifications/services/remindersScheduler", () => ({
  reschedulePlantReminder: jest.fn().mockResolvedValue(undefined),
}));

describe("createCareLog — lastWateredAt uses loggedAt", () => {
  it("updates plants.last_watered_at to loggedAt, not the transaction clock time", async () => {
    const capturedUpdates: Record<string, string> = {};

    mockGetDatabase.mockResolvedValue({
      runAsync: jest.fn().mockImplementation((sql: string, ...params: unknown[]) => {
        if (sql.includes("UPDATE plants SET last_watered_at")) {
          capturedUpdates["last_watered_at"] = params[0] as string;
        }
        return Promise.resolve();
      }),
    });

    mockGetPlantById.mockResolvedValue({
      plant: {
        id: "plant-1",
        name: "Aster",
        speciesName: "Monstera deliciosa",
        wateringIntervalDays: 7,
        lastWateredAt: null,
        nextWaterDueAt: null,
      },
      reminders: [],
    });

    mockGetUserPreferences.mockResolvedValue({ defaultWateringHour: 9 });

    mockRunAtomicMutation.mockImplementation(
      async (_db: unknown, { perform }: { perform: (now: string) => Promise<unknown> }) => {
        await perform("2026-05-04T10:00:00.000Z"); // transaction clock
        return { result: "log-1", operations: [] };
      },
    );

    const { createCareLog } = require("@/features/care-logs/api/careLogsClient");
    await createCareLog({
      userId: "user-1",
      plantId: "plant-1",
      logType: "water",
      loggedAt: "2026-05-01T08:00:00.000Z", // backdated
    });

    expect(capturedUpdates["last_watered_at"]).toBe("2026-05-01T08:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --runInBand --testPathPattern="care-logs-client-loggedat"
```

Expected: FAIL because `loggedAt` input doesn't exist yet.

- [ ] **Step 3: Add `loggedAt` to `createCareLog` input and use it**

In `features/care-logs/api/careLogsClient.ts`, in the `createCareLog` function:

**Change the input type** (add `loggedAt?: string` field):

```typescript
export async function createCareLog(input: {
  userId: string;
  plantId: string;
  logType: CareLogType;
  currentCondition?: CareLogCondition;
  notes?: string;
  loggedAt?: string;
}): Promise<RecordCareEventResult> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const logId = createId("log");
  const effectiveLoggedAt = input.loggedAt ?? now;
```

**Replace the `transactionNowIso` in the INSERT** for `logged_at` with `effectiveLoggedAt`:

In the INSERT statement (around line 151), change:
```
        transactionNowIso,   // logged_at
```
to:
```
        effectiveLoggedAt,   // logged_at
```

**Replace the `transactionNowIso` in the plant UPDATE** for `last_watered_at`:

In the plant UPDATE statement (around line 199), change:
```typescript
          await database.runAsync(
            "UPDATE plants SET last_watered_at = ?, next_water_due_at = ?, updated_at = ?, updated_by = ?, pending = 1 WHERE id = ?;",
            transactionNowIso,
```
to:
```typescript
          await database.runAsync(
            "UPDATE plants SET last_watered_at = ?, next_water_due_at = ?, updated_at = ?, updated_by = ?, pending = 1 WHERE id = ?;",
            effectiveLoggedAt,
```

Also update the sync outbox payload (around line 214):
```typescript
            payload: {
              userId: input.userId,
              lastWateredAt: effectiveLoggedAt,
              nextWaterDueAt: optimized.nextDueAt,
            },
```

And pass `effectiveLoggedAt` as `lastWateredAt` to `optimizeReminderTiming`:
```typescript
          const optimized = optimizeReminderTiming({
            plantName: plant.plant.name,
            speciesName: plant.plant.speciesName,
            wateringIntervalDays: plant.plant.wateringIntervalDays,
            nextDueAt: nextWaterDueAt,
            lastWateredAt: effectiveLoggedAt,
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --runInBand --testPathPattern="care-logs-client-loggedat"
```

Expected: PASS

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
npm test -- --runInBand 2>&1 | tail -5
```

Expected: 5 failing (pre-existing), all others pass.

- [ ] **Step 6: Commit**

```bash
git add features/care-logs/api/careLogsClient.ts \
        tests/features/care-logs/care-logs-client-loggedat.test.ts
git commit -m "fix(care-logs): use loggedAt for last_watered_at — backdated logs now produce correct watering schedules"
```

---

## Task 6: Warn on Notification Scheduling Failure in Plant Mutations

**Files:**
- Modify: `features/plants/api/plantsClient.ts`

`createPlant` (line 830) and `updatePlant` (line 1112) silently swallow notification scheduling errors with `.catch(() => undefined)`. The `createCareLog` path correctly calls `logger.warn()` on failure. Bring the plant paths to parity.

- [ ] **Step 1: Modify `features/plants/api/plantsClient.ts`**

Find and replace in `createPlant` (around line 830):

```typescript
void reschedulePlantReminder(reminder, created.plant.name).catch(() => undefined);
```

Replace with:

```typescript
void reschedulePlantReminder(reminder, created.plant.name).catch((err) => {
  logger.warn("notifications.reschedule_failed_on_create", {
    plantId: created.plant.id,
    message: err instanceof Error ? err.message : "Unknown error",
  });
});
```

Find and replace in `updatePlant` (around line 1112):

```typescript
void reschedulePlantReminder(reminder, updated.plant.name).catch(() => undefined);
```

Replace with:

```typescript
void reschedulePlantReminder(reminder, updated.plant.name).catch((err) => {
  logger.warn("notifications.reschedule_failed_on_update", {
    plantId: updated.plant.id,
    message: err instanceof Error ? err.message : "Unknown error",
  });
});
```

Confirm `logger` is already imported at the top of `plantsClient.ts`. If not, add:
```typescript
import { logger } from "@/utils/logger";
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add features/plants/api/plantsClient.ts
git commit -m "fix(plants): log warning instead of silently swallowing notification scheduling failures"
```

---

## Task 7: Add UNIQUE Index on `care_reminders(plant_id, user_id)`

**Files:**
- Modify: `services/database/migrations.ts`

The application-layer UPSERT logic prevents duplicate reminders but there is no database-level constraint. A unique index makes this a hard guarantee.

- [ ] **Step 1: Add the migration at the end of `runDatabaseMigrations` in `services/database/migrations.ts`**

After the final `await backfillEmbeddedTagsFromNotes(database);` line (currently the last line of `runDatabaseMigrations`), add:

```typescript
  // Deduplicate any pre-existing duplicates before creating the unique index.
  // Keep the most recently updated reminder per (plant_id, user_id) pair.
  await database.runAsync(`
    DELETE FROM care_reminders
    WHERE id NOT IN (
      SELECT id FROM care_reminders
      GROUP BY plant_id, user_id
      HAVING id = MAX(id)
    );
  `);
  await database.runAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_care_reminders_plant_user
    ON care_reminders(plant_id, user_id);
  `);
```

- [ ] **Step 2: Verify no existing tests break**

```bash
npm test -- --runInBand 2>&1 | tail -5
```

Expected: same pass/fail counts as before this task.

- [ ] **Step 3: Commit**

```bash
git add services/database/migrations.ts
git commit -m "feat(db): add unique index on care_reminders(plant_id, user_id) — enforce one reminder per plant at DB level"
```

---

## Task 8: Surface Sync-Disabled State in Backup UI

**Files:**
- Modify: `features/profile/api/profileClient.ts`
- Modify: whichever component renders the backup status (find with `grep -r "pendingSyncQueueDevice\|syncEnabled\|getBackupSummary" --include="*.tsx" features/profile/`)

- [ ] **Step 1: Add `syncEnabled` to `BackupSummary` and set it in `getBackupSummary`**

In `features/profile/api/profileClient.ts`:

At the top, add the import:
```typescript
import { env } from "@/config/env";
```

In the `BackupSummary` interface, add:
```typescript
  syncEnabled: boolean;
```

In the `return` block of `getBackupSummary` (around line 179), add:
```typescript
    syncEnabled: env.enableSyncTrials && env.isSupabaseConfigured,
```

- [ ] **Step 2: Find the backup status UI component**

```bash
grep -r "pendingSyncQueueDevice\|BackupSummary\|getBackupSummary" --include="*.tsx" features/profile/ -l
```

Read the matched file(s) to find where pending counts and sync status are rendered.

- [ ] **Step 3: Add a sync-disabled notice to the backup status component**

In the backup status component, after the existing sync counts section, add a conditional notice. Example pattern (adapt to the actual component's style system):

```typescript
{!summary.syncEnabled && (
  <View style={[styles.syncDisabledBanner, { backgroundColor: colors.surfaceContainerHigh }]}>
    <Icon name="cloud-off" family="MaterialIcons" size={16} color={colors.onSurfaceVariant} />
    <Text style={[styles.syncDisabledText, { color: colors.onSurfaceVariant }]}>
      Cloud sync is not enabled in this build. Changes are saved locally only.
    </Text>
  </View>
)}
```

Add matching styles:
```typescript
  syncDisabledBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  syncDisabledText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
```

- [ ] **Step 4: Update the test for `getBackupSummary`**

In `tests/features/profile/profile-client-backup-summary.test.ts`, add an assertion:

```typescript
    expect(typeof summary.syncEnabled).toBe("boolean");
```

- [ ] **Step 5: Run typecheck and tests**

```bash
npm run typecheck && npm test -- --runInBand --testPathPattern="profile-client-backup-summary"
```

Expected: 0 typecheck errors, test passes.

- [ ] **Step 6: Commit**

```bash
git add features/profile/api/profileClient.ts \
        tests/features/profile/profile-client-backup-summary.test.ts
# Also add the UI component file once identified in Step 2
git commit -m "feat(profile): expose syncEnabled flag in BackupSummary and show sync-disabled notice in UI"
```

---

## Task 9: Max Retry Ceiling on Sync Queue Items

**Files:**
- Modify: `services/database/sync.ts`
- Create: `tests/services/sync-retry-ceiling.test.ts`

Items that fail permanently (e.g. schema mismatch) currently retry at 60-minute intervals forever. Add a ceiling of 10 attempts, after which the item is logged as abandoned.

- [ ] **Step 1: Write the failing test**

Create `tests/services/sync-retry-ceiling.test.ts`:

```typescript
import { createSyncQueueService } from "@/services/database/sync";

const mockStorage = {
  insert: jest.fn(),
  listProcessable: jest.fn(),
  countProcessable: jest.fn().mockResolvedValue(0),
  reclaimStaleProcessing: jest.fn().mockResolvedValue(0),
  markProcessing: jest.fn(),
  markCompleted: jest.fn(),
  markFailed: jest.fn(),
};

const mockLogger = jest.fn();
jest.mock("@/utils/logger", () => ({
  logger: { warn: (...args: unknown[]) => mockLogger(...args) },
}));

describe("sync retry ceiling", () => {
  beforeEach(() => jest.clearAllMocks());

  it("logs a warning when an item reaches MAX_RETRY_ATTEMPTS and will not retry sooner", async () => {
    const exhaustedItem = {
      id: "sync-1",
      entity: "plants",
      entityId: "plant-1",
      operation: "update" as const,
      payload: "{}",
      status: "pending" as const,
      attemptCount: 9, // one more failure = 10 total
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-05-01T10:00:00.000Z",
      updatedAt: "2026-05-04T10:00:00.000Z",
    };

    mockStorage.listProcessable.mockResolvedValueOnce([exhaustedItem]);
    const failingProcessor = jest.fn().mockRejectedValue(new Error("Permanent failure"));

    const service = createSyncQueueService(mockStorage);
    await service.syncPendingChanges({
      processOperation: failingProcessor,
      nowIso: "2026-05-04T12:00:00.000Z",
    });

    expect(mockLogger).toHaveBeenCalledWith(
      "sync.item_abandoned",
      expect.objectContaining({ id: "sync-1" }),
    );
  });

  it("does not log abandoned warning when attempt count is below ceiling", async () => {
    const normalItem = {
      id: "sync-2",
      entity: "plants",
      entityId: "plant-2",
      operation: "update" as const,
      payload: "{}",
      status: "pending" as const,
      attemptCount: 3,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-05-04T10:00:00.000Z",
      updatedAt: "2026-05-04T10:00:00.000Z",
    };

    mockStorage.listProcessable.mockResolvedValueOnce([normalItem]);
    const failingProcessor = jest.fn().mockRejectedValue(new Error("Transient failure"));

    const service = createSyncQueueService(mockStorage);
    await service.syncPendingChanges({
      processOperation: failingProcessor,
      nowIso: "2026-05-04T12:00:00.000Z",
    });

    expect(mockLogger).not.toHaveBeenCalledWith("sync.item_abandoned", expect.anything());
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --runInBand --testPathPattern="sync-retry-ceiling"
```

Expected: FAIL — `sync.item_abandoned` not called yet.

- [ ] **Step 3: Add ceiling to `services/database/sync.ts`**

At the top of the file, add after the existing imports:

```typescript
import { logger } from "@/utils/logger";

const MAX_RETRY_ATTEMPTS = 10;
```

In the `catch` block of `syncPendingChanges` (around line 289–299), after `await storage.markFailed(...)`:

```typescript
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown sync failure.";
          const nextRetryAt = computeRetryAt(item.attemptCount + 1, nowIso);
          await storage.markFailed(
            item.id,
            errorMessage,
            nextRetryAt,
            new Date().toISOString(),
          );
          if (item.attemptCount + 1 >= MAX_RETRY_ATTEMPTS) {
            logger.warn("sync.item_abandoned", {
              id: item.id,
              entity: item.entity,
              entityId: item.entityId,
              attempts: item.attemptCount + 1,
              lastError: errorMessage,
            });
          }
          failed += 1;
        }
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --runInBand --testPathPattern="sync-retry-ceiling"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/database/sync.ts \
        tests/services/sync-retry-ceiling.test.ts
git commit -m "feat(sync): log warning when sync queue item exceeds max retry ceiling (10 attempts)"
```

---

## Task 10: Care Log Pagination

**Files:**
- Modify: `features/care-logs/api/careLogsClient.ts`
- Modify: `features/care-logs/hooks/useLogs.ts`

`listCareLogs` currently returns all records unbounded. For a plant with years of daily logs this becomes a performance hazard. Add `limit` / `offset` support with a sensible default.

- [ ] **Step 1: Modify `listCareLogs` in `features/care-logs/api/careLogsClient.ts`**

Change the function signature and query:

```typescript
export async function listCareLogs(
  plantId: string,
  options?: { limit?: number; offset?: number },
): Promise<CareLog[]> {
  const database = await getDatabase();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const rows = await database.getAllAsync<CareLogRow>(
    `SELECT * FROM care_logs
     WHERE plant_id = ?
     ORDER BY logged_at DESC
     LIMIT ? OFFSET ?;`,
    plantId,
    limit,
    offset,
  );
  return rows.map(mapRow);
}
```

(The `CareLogRow` and `mapRow` names may differ in the file — use whatever is already defined.)

- [ ] **Step 2: Modify `useLogs` in `features/care-logs/hooks/useLogs.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { listCareLogs } from "@/features/care-logs/api/careLogsClient";

export function useLogs(plantId: string, options?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...queryKeys.careLogs(plantId), options?.limit ?? 50, options?.offset ?? 0],
    enabled: Boolean(plantId),
    queryFn: () => listCareLogs(plantId, options),
  });
}
```

- [ ] **Step 3: Verify all call sites still compile**

```bash
npm run typecheck
```

Expected: 0 errors (the new `options` param is optional, so existing call sites remain valid).

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --runInBand 2>&1 | tail -5
```

Expected: same pass/fail counts as before this task.

- [ ] **Step 5: Commit**

```bash
git add features/care-logs/api/careLogsClient.ts \
        features/care-logs/hooks/useLogs.ts
git commit -m "feat(care-logs): add limit/offset pagination to listCareLogs — default 50 per page"
```

---

## Task 11: Remove Dead Location Code from `permissionsService.ts`

**Files:**
- Modify: `features/onboarding/services/permissionsService.ts`

`getLocationPermissionState` and `requestLocationPermission` are exported but never called anywhere in the app. Remove them and the `expo-location` import to reduce surface area.

- [ ] **Step 1: Confirm the functions are unused**

```bash
grep -r "getLocationPermissionState\|requestLocationPermission\|expo-location" \
  --include="*.ts" --include="*.tsx" \
  features/ app/ hooks/ providers/ services/ \
  | grep -v "permissionsService.ts"
```

Expected: no output (no other file imports or calls these).

- [ ] **Step 2: Remove the dead code from `features/onboarding/services/permissionsService.ts`**

Remove the `import * as Location from "expo-location";` line (or `import { ... } from "expo-location"`, whatever form it takes).

Remove the `getLocationPermissionState` function entirely.

Remove the `requestLocationPermission` function entirely.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add features/onboarding/services/permissionsService.ts
git commit -m "chore: remove unused location permission exports from permissionsService"
```

---

## Task 12: Per-Table Sync Status in Backup Summary

**Files:**
- Modify: `features/profile/api/profileClient.ts`

Add a `tableLastSyncedAt` map to `BackupSummary` so the UI can show per-entity freshness rather than a single max-across-all-tables timestamp.

- [ ] **Step 1: Add `tableLastSyncedAt` to `BackupSummary`**

In `features/profile/api/profileClient.ts`, add to the `BackupSummary` interface:

```typescript
  tableLastSyncedAt: {
    plants: string | null;
    careLogs: string | null;
    photos: string | null;
    careReminders: string | null;
    graveyardPlants: string | null;
    userPreferences: string | null;
  };
```

- [ ] **Step 2: Add per-table queries to `getBackupSummary`**

In the `Promise.all` array, after `completedSync`, add six queries:

```typescript
    database.getFirstAsync<{ last_synced_at: string | null }>(
      "SELECT MAX(synced_at) AS last_synced_at FROM plants WHERE user_id = ?;",
      userId,
    ),
    database.getFirstAsync<{ last_synced_at: string | null }>(
      "SELECT MAX(synced_at) AS last_synced_at FROM care_logs WHERE user_id = ?;",
      userId,
    ),
    database.getFirstAsync<{ last_synced_at: string | null }>(
      "SELECT MAX(synced_at) AS last_synced_at FROM photos WHERE user_id = ?;",
      userId,
    ),
    database.getFirstAsync<{ last_synced_at: string | null }>(
      "SELECT MAX(synced_at) AS last_synced_at FROM care_reminders WHERE user_id = ?;",
      userId,
    ),
    database.getFirstAsync<{ last_synced_at: string | null }>(
      "SELECT MAX(synced_at) AS last_synced_at FROM graveyard_plants WHERE user_id = ?;",
      userId,
    ),
    database.getFirstAsync<{ last_synced_at: string | null }>(
      "SELECT MAX(synced_at) AS last_synced_at FROM user_preferences WHERE user_id = ?;",
      userId,
    ),
```

Destructure the new results at the top of the `Promise.all` destructuring:

```typescript
    plantsLastSynced,
    careLogsLastSynced,
    photosLastSynced,
    careRemindersLastSynced,
    graveyardPlantsLastSynced,
    userPreferencesLastSynced,
```

Add to the `return` object:

```typescript
    tableLastSyncedAt: {
      plants: plantsLastSynced?.last_synced_at ?? null,
      careLogs: careLogsLastSynced?.last_synced_at ?? null,
      photos: photosLastSynced?.last_synced_at ?? null,
      careReminders: careRemindersLastSynced?.last_synced_at ?? null,
      graveyardPlants: graveyardPlantsLastSynced?.last_synced_at ?? null,
      userPreferences: userPreferencesLastSynced?.last_synced_at ?? null,
    },
```

- [ ] **Step 3: Update the `profile-client-backup-summary.test.ts` mock**

The test mock will now need 6 more `mockResolvedValueOnce` entries (one per new query). Add them after the existing 24 with `{ last_synced_at: null }` for each.

- [ ] **Step 4: Run typecheck and test**

```bash
npm run typecheck && npm test -- --runInBand --testPathPattern="profile-client-backup-summary"
```

Expected: 0 typecheck errors, test passes.

- [ ] **Step 5: Commit**

```bash
git add features/profile/api/profileClient.ts \
        tests/features/profile/profile-client-backup-summary.test.ts
git commit -m "feat(profile): add per-table last-synced timestamps to BackupSummary"
```

---

## Task 13: Final Verification Pass

**Files:** no new changes — verification only

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 2: Run full test suite**

```bash
npm test -- --runInBand 2>&1 | grep -E "Test Suites:|Tests:"
```

Expected: 5 failed (pre-existing), all others pass.

- [ ] **Step 3: Verify all hard blockers are closed**

```bash
# 1. Error boundary exists
ls app/error.tsx

# 2. deleteAccount function exists
grep -n "export async function deleteAccount" features/auth/api/authClient.ts

# 3. No "coming soon" toast on privacy screen
grep -n "coming soon\|Account deletion isn" app/privacy-security.tsx

# 4. No dataSharingEnabled state
grep -n "dataSharingEnabled" app/privacy-security.tsx

# 5. Species suggestion shows "Pattern match" not fabricated confidence for local matches
grep -n "Pattern match" features/ai/components/SpeciesSuggestionBanner.tsx
```

Expected: error.tsx exists; deleteAccount is found; no "coming soon" or stale account alert; no dataSharingEnabled; "Pattern match" is present.

- [ ] **Step 4: Commit verification result (no-op if already clean)**

If any small fix was required during verification, commit it here.

---

## Self-Review Checklist

After writing this plan, checking spec coverage:

| Audit Finding | Task |
|---|---|
| No global error boundary | Task 1 |
| Account deletion non-functional | Task 2 |
| Privacy policy link "coming soon" | Task 2 |
| Analytics toggle fake | Task 3 (covered in Task 2 rewrite) |
| Species suggestion fabricated confidence | Task 4 |
| `lastWateredAt` uses transaction time not `loggedAt` | Task 5 |
| Notification failure silently swallowed | Task 6 |
| No UNIQUE constraint on `care_reminders(plant_id, user_id)` | Task 7 |
| Sync-disabled state not surfaced | Task 8 |
| No max retry ceiling | Task 9 |
| No care log pagination | Task 10 |
| Dead location code | Task 11 |
| Per-table sync status missing | Task 12 |
| Full verification | Task 13 |

**Deferred (out of scope for V1):**
- `users` table in sync outbox — no profile-edit UI exists yet; add when profile editing is built
- Streak denormalization — premature optimization; revisit when performance data warrants it
- Photo capture timezone display — cosmetic; acceptable for V1
- `isPrimary` vs `photoRole` duplication — schema migration risk; fix in a dedicated data model task
