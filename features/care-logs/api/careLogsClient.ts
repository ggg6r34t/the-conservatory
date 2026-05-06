import { optimizeReminderTiming } from "@/features/ai/services/reminderOptimizationService";
import { upsertReminderInTransaction } from "@/features/notifications/api/remindersClient";
import { reschedulePlantReminder } from "@/features/notifications/services/remindersScheduler";
import { getPlantById } from "@/features/plants/api/plantsClient";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import { extractEmbeddedTags } from "@/services/database/migrations";
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
  tags: string | null;
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
    tags: row.tags ? (JSON.parse(row.tags) as string[]) : null,
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

export async function listCareLogs(
  plantId: string,
  options?: { limit?: number; offset?: number },
) {
  const database = await getDatabase();

  let sql = "SELECT * FROM care_logs WHERE plant_id = ? ORDER BY logged_at DESC";
  const params: (string | number)[] = [plantId];

  if (options?.limit !== undefined) {
    sql += " LIMIT ?";
    params.push(options.limit);
    if (options?.offset !== undefined) {
      sql += " OFFSET ?";
      params.push(options.offset);
    }
  }

  sql += ";";

  const rows = await database.getAllAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    log_type: CareLogType;
    current_condition: CareLogCondition | null;
    notes: string | null;
    tags: string | null;
    logged_at: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
    pending: number;
    synced_at: string | null;
    sync_error: string | null;
  }>(sql, ...params);

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
    tags: string | null;
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
  const { cleanNotes, tags: extractedTags } = input.notes
    ? extractEmbeddedTags(input.notes)
    : { cleanNotes: null, tags: [] };

  const tagsJson = extractedTags.length > 0 ? JSON.stringify(extractedTags) : null;

  const execution = (await runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (transactionNowIso) => {
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

      // loggedAt is the timestamp of when the care event occurred,
      // sourced from the care log's own logged_at field.
      const loggedAt = transactionNowIso;

      let reminderInput: {
        frequencyDays: number;
        nextDueAt: string;
      } | null = null;

      if (input.logType === "water") {
        const plant = await getPlantById(input.userId, input.plantId);
        if (plant) {
          const nextWaterDueAt = computeNextWaterDueAt(
            loggedAt,
            plant.plant.wateringIntervalDays,
          );
          const preferences = await getUserPreferences(input.userId);
          const optimized = optimizeReminderTiming({
            plantName: plant.plant.name,
            speciesName: plant.plant.speciesName,
            wateringIntervalDays: plant.plant.wateringIntervalDays,
            nextDueAt: nextWaterDueAt,
            lastWateredAt: loggedAt,
            reminderEnabled: true,
            lastTriggeredAt: plant.reminders[0]?.lastTriggeredAt ?? null,
            defaultWateringHour: preferences.defaultWateringHour,
          });

          await database.runAsync(
            "UPDATE plants SET last_watered_at = ?, next_water_due_at = ?, updated_at = ?, updated_by = ?, pending = 1 WHERE id = ?;",
            loggedAt,
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
              lastWateredAt: loggedAt,
              nextWaterDueAt: optimized.nextDueAt,
            },
          });

          if (optimized.nextDueAt) {
            const { reminderId, operation: reminderOp } = await upsertReminderInTransaction(
              database,
              transactionNowIso,
              {
                userId: input.userId,
                plantId: input.plantId,
                frequencyDays: plant.plant.wateringIntervalDays,
                nextDueAt: optimized.nextDueAt,
                enabled: true,
              },
            );
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
        }
      }

      const created = await database.getFirstAsync<{
        id: string;
        user_id: string;
        plant_id: string;
        log_type: CareLogType;
        current_condition: CareLogCondition | null;
        notes: string | null;
        tags: string | null;
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
      const plantData = await getPlantById(input.userId, input.plantId);
      const reminder = plantData?.reminders[0];
      if (reminder) {
        await reschedulePlantReminder(reminder, plantData?.plant.name ?? "plant");
      }
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

  const { cleanNotes: finalNotes, tags: extractedTags } = extractEmbeddedTags(trimmedNotes);
  const tagsJson = extractedTags.length > 0 ? JSON.stringify(extractedTags) : null;

  const careLog = await runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (transactionNowIso) => {
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

      const updated = await database.getFirstAsync<{
        id: string;
        user_id: string;
        plant_id: string;
        log_type: CareLogType;
        current_condition: CareLogCondition | null;
        notes: string | null;
        tags: string | null;
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
