import { isGuestUserId } from "@/features/auth/constants/guestUser";
import {
  clearPendingGuestMigrationId,
  writePendingGuestMigrationId,
} from "@/features/auth/services/guestSessionService";
import { getDatabase } from "@/services/database/sqlite";
import { enqueueSyncOperation } from "@/services/database/sync";
import { logger } from "@/utils/logger";

const USER_SCOPED_TABLES = [
  "care_log_tags",
  "care_logs",
  "care_reminders",
  "photos",
  "plants",
  "graveyard_plants",
  "plant_status_snapshots",
  "specimen_tags",
  "archive_curation_overrides",
  "import_runs",
  "feature_usage",
  "care_schedule_suggestions",
  "user_preferences",
] as const;

export async function deleteGuestLocalData(guestUserId: string) {
  if (!isGuestUserId(guestUserId)) {
    throw new Error("Only guest data can be cleared with this action.");
  }

  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    for (const table of USER_SCOPED_TABLES) {
      await database.runAsync(`DELETE FROM ${table} WHERE user_id = ?;`, guestUserId);
    }

    await database.runAsync(`DELETE FROM users WHERE id = ?;`, guestUserId);
  });

  await clearPendingGuestMigrationId();
  logger.info("guest.data.cleared", { guestUserId });
}

export async function deferGuestMigration(guestUserId: string) {
  if (!isGuestUserId(guestUserId)) {
    return;
  }

  await writePendingGuestMigrationId(guestUserId);
}

export async function migrateGuestDataToUser(input: {
  guestUserId: string;
  authenticatedUserId: string;
}) {
  const { guestUserId, authenticatedUserId } = input;

  if (!isGuestUserId(guestUserId)) {
    throw new Error("Migration requires a guest user id.");
  }

  if (isGuestUserId(authenticatedUserId)) {
    throw new Error("Migration target must be an authenticated account.");
  }

  const database = await getDatabase();
  const nowIso = new Date().toISOString();

  await database.withTransactionAsync(async () => {
    for (const table of USER_SCOPED_TABLES) {
      await database.runAsync(
        `UPDATE ${table} SET user_id = ? WHERE user_id = ?;`,
        authenticatedUserId,
        guestUserId,
      );
    }

    await database.runAsync(`DELETE FROM users WHERE id = ?;`, guestUserId);
  });

  const migratedEntities: Array<{ entity: string; table: string }> = [
    { entity: "plants", table: "plants" },
    { entity: "care_logs", table: "care_logs" },
    { entity: "care_log_tags", table: "care_log_tags" },
    { entity: "care_reminders", table: "care_reminders" },
    { entity: "photos", table: "photos" },
    { entity: "graveyard_plants", table: "graveyard_plants" },
    { entity: "plant_status_snapshots", table: "plant_status_snapshots" },
    { entity: "specimen_tags", table: "specimen_tags" },
    { entity: "archive_curation_overrides", table: "archive_curation_overrides" },
    { entity: "feature_usage", table: "feature_usage" },
    { entity: "care_schedule_suggestions", table: "care_schedule_suggestions" },
    { entity: "user_preferences", table: "user_preferences" },
  ];

  let enqueuedCount = 0;
  for (const { entity, table } of migratedEntities) {
    const idColumn = entity === "user_preferences" ? "user_id" : "id";
    const rows = await database.getAllAsync<{ id: string }>(
      `SELECT ${idColumn} AS id FROM ${table} WHERE user_id = ?;`,
      authenticatedUserId,
    );

    for (const row of rows) {
      await enqueueSyncOperation({
        entity,
        entityId: row.id,
        operation: "update",
        payload: { userId: authenticatedUserId },
      });
      enqueuedCount += 1;
    }
  }

  await enqueueSyncOperation({
    entity: "users",
    entityId: authenticatedUserId,
    operation: "update",
    payload: { userId: authenticatedUserId },
  });
  enqueuedCount += 1;

  await clearPendingGuestMigrationId();
  logger.info("guest.data.migrated", {
    guestUserId,
    authenticatedUserId,
    enqueuedCount,
  });
}

export async function countGuestScopedRows(guestUserId: string) {
  const database = await getDatabase();
  const tables = ["plants", "care_logs", "photos", "care_reminders"] as const;
  const counts: Record<string, number> = {};

  for (const table of tables) {
    const row = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${table} WHERE user_id = ?;`,
      guestUserId,
    );
    counts[table] = row?.count ?? 0;
  }

  return counts;
}
