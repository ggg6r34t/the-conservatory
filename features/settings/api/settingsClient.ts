import { getDatabase } from "@/services/database/sqlite";
import type { UserPreferences } from "@/types/models";

function defaultPreferences(userId: string): UserPreferences {
  const now = new Date().toISOString();
  return {
    userId,
    remindersEnabled: true,
    preferredTheme: "linen-light",
    timezone: "UTC",
    defaultWateringHour: 9,
    createdAt: now,
    updatedAt: now,
  };
}

function mapPreferences(row: {
  user_id: string;
  reminders_enabled: number;
  preferred_theme: "linen-light";
  timezone: string;
  default_watering_hour: number;
  created_at: string;
  updated_at: string;
}): UserPreferences {
  return {
    userId: row.user_id,
    remindersEnabled: Boolean(row.reminders_enabled),
    preferredTheme: row.preferred_theme,
    timezone: row.timezone,
    defaultWateringHour: row.default_watering_hour,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getUserPreferences(userId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    user_id: string;
    reminders_enabled: number;
    preferred_theme: "linen-light";
    timezone: string;
    default_watering_hour: number;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1;", userId);

  if (row) {
    return mapPreferences(row);
  }

  const preferences = defaultPreferences(userId);
  await database.runAsync(
    `INSERT INTO user_preferences (
      user_id, reminders_enabled, preferred_theme, timezone, default_watering_hour, created_at, updated_at, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    preferences.userId,
    Number(preferences.remindersEnabled),
    preferences.preferredTheme,
    preferences.timezone,
    preferences.defaultWateringHour,
    preferences.createdAt,
    preferences.updatedAt,
    preferences.userId,
  );

  return preferences;
}

export async function updateUserPreferences(
  userId: string,
  patch: Partial<
    Pick<
      UserPreferences,
      "remindersEnabled" | "defaultWateringHour" | "timezone"
    >
  >,
) {
  const database = await getDatabase();
  const current = await getUserPreferences(userId);
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await database.runAsync(
    `UPDATE user_preferences
     SET reminders_enabled = ?, timezone = ?, default_watering_hour = ?, updated_at = ?, updated_by = ?
     WHERE user_id = ?;`,
    Number(next.remindersEnabled),
    next.timezone,
    next.defaultWateringHour,
    next.updatedAt,
    userId,
    userId,
  );

  return next;
}
