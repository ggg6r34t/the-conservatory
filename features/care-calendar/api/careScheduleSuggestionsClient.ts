import { assertFeatureAccess } from "@/features/billing/services/featureAccess";
import { getDatabase } from "@/services/database/sqlite";
import { runAtomicMutationWithSyncOutbox } from "@/services/database/syncOutbox";
import { getEntitlementState } from "@/services/entitlementState";
import { createId } from "@/utils/id";
import type { CareScheduleSuggestionRecord } from "@/types/models";
import type { CareCalendarCareType } from "@/features/care-calendar/types";

type ScheduleRow = {
  id: string;
  user_id: string;
  plant_id: string;
  care_type: string;
  frequency_days: number;
  next_due_at: string;
  enabled: number;
  reason: string | null;
  confidence: string | null;
  source: "ai_suggested" | "manual";
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
};

function mapRow(row: ScheduleRow): CareScheduleSuggestionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    careType: row.care_type as CareScheduleSuggestionRecord["careType"],
    frequencyDays: row.frequency_days,
    nextDueAt: row.next_due_at,
    enabled: row.enabled,
    reason: row.reason,
    confidence: row.confidence,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

export async function listCareScheduleSuggestions(userId: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<ScheduleRow>(
    `SELECT * FROM care_schedule_suggestions
     WHERE user_id = ? AND enabled = 1
     ORDER BY next_due_at ASC;`,
    userId,
  );

  return rows.map(mapRow);
}

export async function upsertCareScheduleSuggestion(input: {
  userId: string;
  plantId: string;
  careType: CareCalendarCareType;
  frequencyDays: number;
  nextDueAt: string;
  enabled: boolean;
  reason?: string | null;
  confidence?: string | null;
  source?: "ai_suggested" | "manual";
}) {
  if (input.source === "ai_suggested") {
    assertFeatureAccess("ai_care_schedule", getEntitlementState());
  }

  const database = await getDatabase();
  const existing = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM care_schedule_suggestions
     WHERE plant_id = ? AND user_id = ? AND care_type = ? LIMIT 1;`,
    input.plantId,
    input.userId,
    input.careType,
  );
  const now = new Date().toISOString();

  if (existing) {
    return runAtomicMutationWithSyncOutbox(database, {
      nowIso: now,
      perform: async (transactionNowIso) => {
        await database.runAsync(
          `UPDATE care_schedule_suggestions
           SET frequency_days = ?, next_due_at = ?, enabled = ?, reason = ?, confidence = ?,
               source = ?, updated_at = ?, updated_by = ?, pending = 1
           WHERE id = ?;`,
          input.frequencyDays,
          input.nextDueAt,
          Number(input.enabled),
          input.reason ?? null,
          input.confidence ?? null,
          input.source ?? "manual",
          transactionNowIso,
          input.userId,
          existing.id,
        );

        const updated = await database.getFirstAsync<ScheduleRow>(
          "SELECT * FROM care_schedule_suggestions WHERE id = ? LIMIT 1;",
          existing.id,
        );

        return {
          result: mapRow(updated!),
          operations: [
            {
              entity: "care_schedule_suggestions",
              entityId: existing.id,
              operation: "update" as const,
              payload: {
                userId: input.userId,
                plantId: input.plantId,
                careType: input.careType,
              },
            },
          ],
        };
      },
    });
  }

  const scheduleId = createId("schedule");
  return runAtomicMutationWithSyncOutbox(database, {
    nowIso: now,
    perform: async (transactionNowIso) => {
      await database.runAsync(
        `INSERT INTO care_schedule_suggestions (
          id, user_id, plant_id, care_type, frequency_days, next_due_at, enabled,
          reason, confidence, source, created_at, updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        scheduleId,
        input.userId,
        input.plantId,
        input.careType,
        input.frequencyDays,
        input.nextDueAt,
        Number(input.enabled),
        input.reason ?? null,
        input.confidence ?? null,
        input.source ?? "manual",
        transactionNowIso,
        transactionNowIso,
        input.userId,
        1,
        null,
        null,
      );

      const inserted = await database.getFirstAsync<ScheduleRow>(
        "SELECT * FROM care_schedule_suggestions WHERE id = ? LIMIT 1;",
        scheduleId,
      );

      return {
        result: mapRow(inserted!),
        operations: [
          {
            entity: "care_schedule_suggestions",
            entityId: scheduleId,
            operation: "insert" as const,
            payload: {
              userId: input.userId,
              plantId: input.plantId,
              careType: input.careType,
            },
          },
        ],
      };
    },
  });
}
