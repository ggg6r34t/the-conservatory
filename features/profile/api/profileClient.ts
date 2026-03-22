import { getDatabase } from "@/services/database/sqlite";
import { bootstrapUserDataSync } from "@/services/database/bootstrapSync";

export interface BackupSummary {
  activePlants: number;
  archivedPlants: number;
  photos: number;
  careLogs: number;
  reminders: number;
  pendingSync: number;
  failedSync: number;
  processingSync: number;
  completedSync: number;
}

export async function getBackupSummary(userId: string): Promise<BackupSummary> {
  const database = await getDatabase();

  const [
    activePlants,
    archivedPlants,
    photos,
    careLogs,
    reminders,
    pendingSync,
    failedSync,
    processingSync,
    completedSync,
  ] = await Promise.all([
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM plants WHERE user_id = ? AND status = 'active';",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM graveyard_plants WHERE user_id = ?;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM photos WHERE user_id = ?;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM care_logs WHERE user_id = ?;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM care_reminders WHERE user_id = ?;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sync_queue WHERE status = 'pending';",
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sync_queue WHERE status = 'failed';",
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sync_queue WHERE status = 'processing';",
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sync_queue WHERE status = 'completed';",
    ),
  ]);

  return {
    activePlants: activePlants?.count ?? 0,
    archivedPlants: archivedPlants?.count ?? 0,
    photos: photos?.count ?? 0,
    careLogs: careLogs?.count ?? 0,
    reminders: reminders?.count ?? 0,
    pendingSync: pendingSync?.count ?? 0,
    failedSync: failedSync?.count ?? 0,
    processingSync: processingSync?.count ?? 0,
    completedSync: completedSync?.count ?? 0,
  };
}

export async function runBackupSync(userId: string) {
  await bootstrapUserDataSync(userId);
}
