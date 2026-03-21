import { createId } from "@/utils/id";
import { getDatabase } from "@/services/database/sqlite";
import { enqueueSyncOperation } from "@/services/database/sync";
import type { CareReminder } from "@/types/models";

function mapReminder(row: {
  id: string;
  user_id: string;
  plant_id: string;
  reminder_type: "water" | "mist" | "feed";
  frequency_days: number;
  enabled: number;
  next_due_at: string | null;
  last_triggered_at: string | null;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}): CareReminder {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    reminderType: row.reminder_type,
    frequencyDays: row.frequency_days,
    enabled: row.enabled,
    nextDueAt: row.next_due_at,
    lastTriggeredAt: row.last_triggered_at,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

export async function listReminders(userId: string, plantId?: string) {
  const database = await getDatabase();
  const rows = plantId
    ? await database.getAllAsync<{
        id: string;
        user_id: string;
        plant_id: string;
        reminder_type: "water" | "mist" | "feed";
        frequency_days: number;
        enabled: number;
        next_due_at: string | null;
        last_triggered_at: string | null;
        notification_id: string | null;
        created_at: string;
        updated_at: string;
        updated_by: string | null;
        pending: number;
        synced_at: string | null;
        sync_error: string | null;
      }>(
        "SELECT * FROM care_reminders WHERE user_id = ? AND plant_id = ? ORDER BY created_at DESC;",
        userId,
        plantId,
      )
    : await database.getAllAsync<{
        id: string;
        user_id: string;
        plant_id: string;
        reminder_type: "water" | "mist" | "feed";
        frequency_days: number;
        enabled: number;
        next_due_at: string | null;
        last_triggered_at: string | null;
        notification_id: string | null;
        created_at: string;
        updated_at: string;
        updated_by: string | null;
        pending: number;
        synced_at: string | null;
        sync_error: string | null;
      }>(
        "SELECT * FROM care_reminders WHERE user_id = ? ORDER BY next_due_at ASC;",
        userId,
      );

  return rows.map(mapReminder);
}

export async function upsertReminder(input: {
  userId: string;
  plantId: string;
  frequencyDays: number;
  nextDueAt: string | null;
  enabled: boolean;
}) {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<{ id: string }>(
    "SELECT id FROM care_reminders WHERE plant_id = ? LIMIT 1;",
    input.plantId,
  );
  const now = new Date().toISOString();

  if (existing) {
    await database.runAsync(
      `UPDATE care_reminders
       SET frequency_days = ?, next_due_at = ?, enabled = ?, updated_at = ?, updated_by = ?, pending = 1
       WHERE id = ?;`,
      input.frequencyDays,
      input.nextDueAt,
      Number(input.enabled),
      now,
      input.userId,
      existing.id,
    );

    const updated = await database.getFirstAsync<{
      id: string;
      user_id: string;
      plant_id: string;
      reminder_type: "water" | "mist" | "feed";
      frequency_days: number;
      enabled: number;
      next_due_at: string | null;
      last_triggered_at: string | null;
      notification_id: string | null;
      created_at: string;
      updated_at: string;
      updated_by: string | null;
      pending: number;
      synced_at: string | null;
      sync_error: string | null;
    }>("SELECT * FROM care_reminders WHERE id = ? LIMIT 1;", existing.id);

    await enqueueSyncOperation({
      entity: "care_reminders",
      entityId: existing.id,
      operation: "update",
      payload: {
        userId: input.userId,
        plantId: input.plantId,
        frequencyDays: input.frequencyDays,
        enabled: input.enabled,
      },
    });

    return mapReminder(updated!);
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
    now,
    now,
    input.userId,
    1,
    null,
    null,
  );

  const reminder = await database.getFirstAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    reminder_type: "water" | "mist" | "feed";
    frequency_days: number;
    enabled: number;
    next_due_at: string | null;
    last_triggered_at: string | null;
    notification_id: string | null;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
    pending: number;
    synced_at: string | null;
    sync_error: string | null;
  }>("SELECT * FROM care_reminders WHERE id = ? LIMIT 1;", reminderId);

  await enqueueSyncOperation({
    entity: "care_reminders",
    entityId: reminderId,
    operation: "insert",
    payload: {
      userId: input.userId,
      plantId: input.plantId,
      frequencyDays: input.frequencyDays,
      enabled: input.enabled,
    },
  });

  return mapReminder(reminder!);
}

export async function updateReminderNotificationId(
  reminderId: string,
  notificationId: string | null,
) {
  const database = await getDatabase();
  await database.runAsync(
    "UPDATE care_reminders SET notification_id = ?, updated_at = ? WHERE id = ?;",
    notificationId,
    new Date().toISOString(),
    reminderId,
  );

  await enqueueSyncOperation({
    entity: "care_reminders",
    entityId: reminderId,
    operation: "update",
    payload: {
      notificationId,
    },
  });
}
