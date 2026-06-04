import { getDatabase } from "@/services/database/sqlite";
import { runAtomicMutationWithSyncOutbox } from "@/services/database/syncOutbox";
import type { CareReminder, ReminderType } from "@/types/models";
import { createId } from "@/utils/id";

function mapReminder(row: {
  id: string;
  user_id: string;
  plant_id: string;
  reminder_type: ReminderType;
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
        reminder_type: ReminderType;
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
        reminder_type: ReminderType;
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

export async function upsertReminderInTransaction(
  database: Awaited<ReturnType<typeof getDatabase>>,
  nowIso: string,
  input: {
    userId: string;
    plantId: string;
    reminderType?: ReminderType;
    frequencyDays: number;
    nextDueAt: string | null;
    enabled: boolean;
  },
): Promise<{ reminderId: string; operation: "insert" | "update" }> {
  const existing = await database.getFirstAsync<{ id: string }>(
    "SELECT id FROM care_reminders WHERE plant_id = ? AND user_id = ? AND reminder_type = ? LIMIT 1;",
    input.plantId,
    input.userId,
    input.reminderType ?? "water",
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
    input.reminderType ?? "water",
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

export async function upsertReminder(input: {
  userId: string;
  plantId: string;
  reminderType?: ReminderType;
  frequencyDays: number;
  nextDueAt: string | null;
  enabled: boolean;
}) {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<{ id: string }>(
    "SELECT id FROM care_reminders WHERE plant_id = ? AND user_id = ? AND reminder_type = ? LIMIT 1;",
    input.plantId,
    input.userId,
    input.reminderType ?? "water",
  );
  const now = new Date().toISOString();

  if (existing) {
    return runAtomicMutationWithSyncOutbox(database, {
      nowIso: now,
      perform: async (transactionNowIso) => {
        await database.runAsync(
          `UPDATE care_reminders
           SET frequency_days = ?, next_due_at = ?, enabled = ?, updated_at = ?, updated_by = ?, pending = 1
           WHERE id = ?;`,
          input.frequencyDays,
          input.nextDueAt,
          Number(input.enabled),
          transactionNowIso,
          input.userId,
          existing.id,
        );

        const updated = await database.getFirstAsync<{
          id: string;
          user_id: string;
          plant_id: string;
          reminder_type: ReminderType;
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

        return {
          result: mapReminder(updated!),
          operations: [
            {
              entity: "care_reminders",
              entityId: existing.id,
              operation: "update" as const,
              payload: {
                userId: input.userId,
                plantId: input.plantId,
                frequencyDays: input.frequencyDays,
                enabled: input.enabled,
              },
            },
          ],
        };
      },
    });
  }

  const reminderId = createId("reminder");
  return runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `INSERT INTO care_reminders (
          id, user_id, plant_id, reminder_type, frequency_days, enabled, next_due_at, last_triggered_at,
          notification_id, created_at, updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        reminderId,
        input.userId,
        input.plantId,
        input.reminderType ?? "water",
        input.frequencyDays,
        Number(input.enabled),
        input.nextDueAt,
        null,
        null,
        transactionNowIso,
        transactionNowIso,
        input.userId,
        1,
        null,
        null,
      );

      const reminder = await database.getFirstAsync<{
        id: string;
        user_id: string;
        plant_id: string;
        reminder_type: ReminderType;
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

      return {
        result: mapReminder(reminder!),
        operations: [
          {
            entity: "care_reminders",
            entityId: reminderId,
            operation: "insert" as const,
            payload: {
              userId: input.userId,
              plantId: input.plantId,
              frequencyDays: input.frequencyDays,
              enabled: input.enabled,
            },
          },
        ],
      };
    },
  });
}

export async function updateReminderNotificationId(
  reminderId: string,
  notificationId: string | null,
) {
  const database = await getDatabase();
  const updatedAt = new Date().toISOString();

  await runAtomicMutationWithSyncOutbox(database, {
    nowIso: updatedAt,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        "UPDATE care_reminders SET notification_id = ?, updated_at = ?, pending = 1 WHERE id = ?;",
        notificationId,
        transactionNowIso,
        reminderId,
      );

      return {
        result: reminderId,
        operations: [
          {
            entity: "care_reminders",
            entityId: reminderId,
            operation: "update" as const,
            payload: {
              notificationId,
            },
          },
        ],
      };
    },
  });
}

export async function deleteReminder(input: {
  userId: string;
  reminderId: string;
}): Promise<{
  reminderId: string;
  plantId: string;
  notificationId: string | null;
}> {
  const database = await getDatabase();
  const now = new Date().toISOString();

  return runAtomicMutationWithSyncOutbox<{
    reminderId: string;
    plantId: string;
    notificationId: string | null;
  }>(database, {
    nowIso: now,
    perform: async () => {
      const existing = await database.getFirstAsync<{
        id: string;
        user_id: string;
        plant_id: string;
        notification_id: string | null;
      }>(
        "SELECT id, user_id, plant_id, notification_id FROM care_reminders WHERE id = ? AND user_id = ? LIMIT 1;",
        input.reminderId,
        input.userId,
      );

      if (!existing) {
        throw new Error("Reminder could not be found.");
      }

      await database.runAsync(
        "DELETE FROM care_reminders WHERE id = ? AND user_id = ?;",
        input.reminderId,
        input.userId,
      );

      return {
        result: {
          reminderId: existing.id,
          plantId: existing.plant_id,
          notificationId: existing.notification_id,
        },
        operations: [
          {
            entity: "care_reminders",
            entityId: existing.id,
            operation: "delete" as const,
            payload: {
              userId: input.userId,
              plantId: existing.plant_id,
            },
          },
        ],
      };
    },
  });
}
