import { getDatabase } from "@/services/database/sqlite";
import {
  runAtomicMutationWithSyncOutbox,
  type SyncOutboxOperation,
} from "@/services/database/syncOutbox";
import type { UserPreferences } from "@/types/models";

function defaultPreferences(userId: string): UserPreferences {
  const now = new Date().toISOString();
  return {
    userId,
    remindersEnabled: true,
    autoSyncEnabled: true,
    preferredTheme: "linen-light",
    timezone: "UTC",
    defaultWateringHour: 9,
    createdAt: now,
    updatedAt: now,
    updatedBy: userId,
    pending: 0,
    syncedAt: null,
    syncError: null,
  };
}

function assertValidUserId(userId: string) {
  if (!userId.trim()) {
    throw new Error("A signed-in user is required.");
  }
}

function mapPreferences(row: {
  user_id: string;
  reminders_enabled: number;
  auto_sync_enabled: number;
  preferred_theme: "linen-light";
  timezone: string;
  default_watering_hour: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}): UserPreferences {
  return {
    userId: row.user_id,
    remindersEnabled: Boolean(row.reminders_enabled),
    autoSyncEnabled: Boolean(row.auto_sync_enabled),
    preferredTheme: row.preferred_theme,
    timezone: row.timezone,
    defaultWateringHour: row.default_watering_hour,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

async function readPreferencesRow(
  database: Awaited<ReturnType<typeof getDatabase>>,
  userId: string,
) {
  return database.getFirstAsync<{
    user_id: string;
    reminders_enabled: number;
    auto_sync_enabled: number;
    preferred_theme: "linen-light";
    timezone: string;
    default_watering_hour: number;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
    pending: number;
    synced_at: string | null;
    sync_error: string | null;
  }>("SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1;", userId);
}

export async function getUserPreferences(userId: string) {
  assertValidUserId(userId);
  const database = await getDatabase();
  const row = await readPreferencesRow(database, userId);

  if (row) {
    return mapPreferences(row);
  }

  const preferences = defaultPreferences(userId);
  await database.runAsync(
    `INSERT OR IGNORE INTO user_preferences (
      user_id, reminders_enabled, auto_sync_enabled, preferred_theme, timezone, default_watering_hour,
      created_at, updated_at, updated_by, pending, synced_at, sync_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    preferences.userId,
    Number(preferences.remindersEnabled),
    Number(preferences.autoSyncEnabled),
    preferences.preferredTheme,
    preferences.timezone,
    preferences.defaultWateringHour,
    preferences.createdAt,
    preferences.updatedAt,
    preferences.userId,
    preferences.pending,
    preferences.syncedAt ?? null,
    preferences.syncError ?? null,
  );

  const persistedRow = await readPreferencesRow(database, userId);
  if (persistedRow) {
    return mapPreferences(persistedRow);
  }

  return preferences;
}

export async function updateUserPreferences(
  userId: string,
  patch: Partial<
    Pick<
      UserPreferences,
      "remindersEnabled" | "autoSyncEnabled" | "defaultWateringHour" | "timezone"
    >
  >,
) {
  assertValidUserId(userId);
  const database = await getDatabase();
  const current = await getUserPreferences(userId);
  const operation: SyncOutboxOperation = {
    entity: "user_preferences",
    entityId: userId,
    operation: current.syncedAt ? "update" : "insert",
    payload: {
      userId,
    },
  };
  const next = {
    ...current,
    ...patch,
    defaultWateringHour: Math.min(
      23,
      Math.max(0, patch.defaultWateringHour ?? current.defaultWateringHour),
    ),
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
    pending: 1,
    syncError: null,
  };

  await runAtomicMutationWithSyncOutbox(database, {
    nowIso: next.updatedAt,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `UPDATE user_preferences
         SET reminders_enabled = ?, auto_sync_enabled = ?, timezone = ?, default_watering_hour = ?, updated_at = ?, updated_by = ?,
             pending = 1, sync_error = NULL
         WHERE user_id = ?;`,
        Number(next.remindersEnabled),
        Number(next.autoSyncEnabled),
        next.timezone,
        next.defaultWateringHour,
        transactionNowIso,
        userId,
        userId,
      );

      return {
        result: undefined,
        operations: [operation],
      };
    },
  });

  return next;
}
