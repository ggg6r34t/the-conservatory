import { optimizeReminderTiming } from "@/features/ai/services/reminderOptimizationService";
import { upsertReminder } from "@/features/notifications/api/remindersClient";
import { getPlantById } from "@/features/plants/api/plantsClient";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import { getDatabase } from "@/services/database/sqlite";
import {
  runAtomicMutationWithSyncOutbox,
  type SyncOutboxOperation,
} from "@/services/database/syncOutbox";
import type { CareLog, CareLogCondition, CareLogType } from "@/types/models";
import { createId } from "@/utils/id";

export interface RecordCareEventResult {
  careLog: CareLog;
  warningMessage: string | null;
}

export interface UpdateCareLogNoteResult {
  careLog: CareLog;
}

function mapCareLog(row: {
  id: string;
  user_id: string;
  plant_id: string;
  log_type: CareLogType;
  current_condition: CareLogCondition | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}): CareLog {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    logType: row.log_type,
    currentCondition: row.current_condition,
    notes: row.notes,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

function computeNextWaterDueAt(loggedAt: string, intervalDays: number) {
  const date = new Date(loggedAt);
  date.setDate(date.getDate() + intervalDays);
  return date.toISOString();
}

export async function listCareLogs(plantId: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    log_type: CareLogType;
    current_condition: CareLogCondition | null;
    notes: string | null;
    logged_at: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
    pending: number;
    synced_at: string | null;
    sync_error: string | null;
  }>(
    "SELECT * FROM care_logs WHERE plant_id = ? ORDER BY logged_at DESC;",
    plantId,
  );

  return rows.map(mapCareLog);
}

export async function listCareLogsForPlants(plantIds: string[]) {
  const uniquePlantIds = Array.from(new Set(plantIds.filter(Boolean)));
  if (!uniquePlantIds.length) {
    return [];
  }

  const database = await getDatabase();
  const placeholders = uniquePlantIds.map(() => "?").join(", ");
  const rows = await database.getAllAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    log_type: CareLogType;
    current_condition: CareLogCondition | null;
    notes: string | null;
    logged_at: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
    pending: number;
    synced_at: string | null;
    sync_error: string | null;
  }>(
    `SELECT * FROM care_logs WHERE plant_id IN (${placeholders}) ORDER BY logged_at DESC;`,
    ...uniquePlantIds,
  );

  return rows.map(mapCareLog);
}

export async function createCareLog(input: {
  userId: string;
  plantId: string;
  logType: CareLogType;
  currentCondition?: CareLogCondition;
  notes?: string;
}): Promise<RecordCareEventResult> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const logId = createId("log");
  const execution = (await runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `INSERT INTO care_logs (
          id, user_id, plant_id, log_type, current_condition, notes, logged_at, created_at, updated_at, updated_by,
          pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        logId,
        input.userId,
        input.plantId,
        input.logType,
        input.currentCondition ?? null,
        input.notes ?? null,
        transactionNowIso,
        transactionNowIso,
        transactionNowIso,
        input.userId,
        1,
        null,
        null,
      );

      const operations: SyncOutboxOperation[] = [
        {
          entity: "care_logs",
          entityId: logId,
          operation: "insert",
          payload: {
            userId: input.userId,
            plantId: input.plantId,
            logType: input.logType,
            currentCondition: input.currentCondition ?? null,
          },
        },
      ];

      let reminderInput: {
        frequencyDays: number;
        nextDueAt: string;
      } | null = null;

      if (input.logType === "water") {
        const plant = await getPlantById(input.userId, input.plantId);
        if (plant) {
          const nextWaterDueAt = computeNextWaterDueAt(
            transactionNowIso,
            plant.plant.wateringIntervalDays,
          );
          const preferences = await getUserPreferences(input.userId);
          const optimized = optimizeReminderTiming({
            plantName: plant.plant.name,
            speciesName: plant.plant.speciesName,
            wateringIntervalDays: plant.plant.wateringIntervalDays,
            nextDueAt: nextWaterDueAt,
            lastWateredAt: transactionNowIso,
            reminderEnabled: true,
            lastTriggeredAt: plant.reminders[0]?.lastTriggeredAt ?? null,
            defaultWateringHour: preferences.defaultWateringHour,
          });

          await database.runAsync(
            "UPDATE plants SET last_watered_at = ?, next_water_due_at = ?, updated_at = ?, updated_by = ?, pending = 1 WHERE id = ?;",
            transactionNowIso,
            optimized.nextDueAt,
            transactionNowIso,
            input.userId,
            input.plantId,
          );

          operations.push({
            entity: "plants",
            entityId: input.plantId,
            operation: "update",
            payload: {
              userId: input.userId,
              lastWateredAt: transactionNowIso,
              nextWaterDueAt: optimized.nextDueAt,
            },
          });

          if (optimized.nextDueAt) {
            reminderInput = {
              frequencyDays: plant.plant.wateringIntervalDays,
              nextDueAt: optimized.nextDueAt,
            };
          }
        }
      }

      const created = await database.getFirstAsync<{
        id: string;
        user_id: string;
        plant_id: string;
        log_type: CareLogType;
        current_condition: CareLogCondition | null;
        notes: string | null;
        logged_at: string;
        created_at: string;
        updated_at: string;
        updated_by: string | null;
        pending: number;
        synced_at: string | null;
        sync_error: string | null;
      }>("SELECT * FROM care_logs WHERE id = ? LIMIT 1;", logId);

      return {
        result: {
          careLog: mapCareLog(created!),
          reminderInput,
        },
        operations,
      };
    },
  })) as {
    careLog: CareLog;
    reminderInput: {
      frequencyDays: number;
      nextDueAt: string;
    } | null;
  };

  let warningMessage: string | null = null;
  if (execution.reminderInput) {
    try {
      await upsertReminder({
        userId: input.userId,
        plantId: input.plantId,
        frequencyDays: execution.reminderInput.frequencyDays,
        nextDueAt: execution.reminderInput.nextDueAt,
        enabled: true,
      });
    } catch {
      warningMessage =
        "Care log saved on this device, but the reminder schedule needs another retry.";
    }
  }

  return {
    careLog: execution.careLog,
    warningMessage,
  };
}

export async function updateCareLogNote(input: {
  userId: string;
  plantId: string;
  careLogId: string;
  notes: string;
}): Promise<UpdateCareLogNoteResult> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const trimmedNotes = input.notes.trim();

  if (!trimmedNotes) {
    throw new Error("Add a note before saving.");
  }

  const careLog = await runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `UPDATE care_logs
         SET notes = ?, updated_at = ?, updated_by = ?, pending = 1, synced_at = NULL, sync_error = NULL
         WHERE id = ? AND user_id = ? AND plant_id = ?;`,
        trimmedNotes,
        transactionNowIso,
        input.userId,
        input.careLogId,
        input.userId,
        input.plantId,
      );

      const updated = await database.getFirstAsync<{
        id: string;
        user_id: string;
        plant_id: string;
        log_type: CareLogType;
        current_condition: CareLogCondition | null;
        notes: string | null;
        logged_at: string;
        created_at: string;
        updated_at: string;
        updated_by: string | null;
        pending: number;
        synced_at: string | null;
        sync_error: string | null;
      }>(
        "SELECT * FROM care_logs WHERE id = ? AND user_id = ? AND plant_id = ? LIMIT 1;",
        input.careLogId,
        input.userId,
        input.plantId,
      );

      if (!updated) {
        throw new Error("Unable to find the saved care event for note update.");
      }

      return {
        result: mapCareLog(updated),
        operations: [
          {
            entity: "care_logs",
            entityId: input.careLogId,
            operation: "update",
            payload: {
              userId: input.userId,
              plantId: input.plantId,
              notes: trimmedNotes,
            },
          },
        ],
      };
    },
  });

  return { careLog };
}
