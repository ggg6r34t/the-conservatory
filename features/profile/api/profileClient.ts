import { bootstrapUserDataSync } from "@/services/database/bootstrapSync";
import { getDatabase } from "@/services/database/sqlite";
import { probeRemoteBackendAvailability } from "@/services/supabase/backendReadiness";

export interface BackupSummary {
  activePlants: number;
  archivedPlants: number;
  photos: number;
  careLogs: number;
  reminders: number;
  pendingSyncUser: number;
  failedSyncUser: number;
  pendingSyncQueueAccount: number;
  failedSyncQueueAccount: number;
  pendingSyncDevice: number;
  failedSyncDevice: number;
  processingSync: number;
  completedSync: number;
}

function sumCounts(
  values: ({
    count: number;
  } | null)[],
) {
  return values.reduce((total, value) => total + (value?.count ?? 0), 0);
}

export async function getBackupSummary(userId: string): Promise<BackupSummary> {
  const database = await getDatabase();

  const [
    activePlants,
    archivedPlants,
    photos,
    careLogs,
    reminders,
    pendingPlants,
    pendingPhotos,
    pendingCareLogs,
    pendingReminders,
    pendingMemorials,
    failedPlants,
    failedPhotos,
    failedCareLogs,
    failedReminders,
    failedMemorials,
    pendingSyncQueueAccount,
    failedSyncQueueAccount,
    pendingSyncDevice,
    failedSyncDevice,
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
      "SELECT COUNT(*) AS count FROM plants WHERE user_id = ? AND pending = 1;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM photos WHERE user_id = ? AND pending = 1;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM care_logs WHERE user_id = ? AND pending = 1;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM care_reminders WHERE user_id = ? AND pending = 1;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM graveyard_plants WHERE user_id = ? AND pending = 1;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM plants WHERE user_id = ? AND sync_error IS NOT NULL;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM photos WHERE user_id = ? AND sync_error IS NOT NULL;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM care_logs WHERE user_id = ? AND sync_error IS NOT NULL;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM care_reminders WHERE user_id = ? AND sync_error IS NOT NULL;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM graveyard_plants WHERE user_id = ? AND sync_error IS NOT NULL;",
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM sync_queue
       WHERE status = 'pending'
         AND payload IS NOT NULL
         AND payload LIKE ?;`,
      `%"userId":"${userId}"%`,
    ),
    database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM sync_queue
       WHERE status = 'failed'
         AND payload IS NOT NULL
         AND payload LIKE ?;`,
      `%"userId":"${userId}"%`,
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
    pendingSyncUser: sumCounts([
      pendingPlants,
      pendingPhotos,
      pendingCareLogs,
      pendingReminders,
      pendingMemorials,
    ]),
    failedSyncUser: sumCounts([
      failedPlants,
      failedPhotos,
      failedCareLogs,
      failedReminders,
      failedMemorials,
    ]),
    pendingSyncQueueAccount: pendingSyncQueueAccount?.count ?? 0,
    failedSyncQueueAccount: failedSyncQueueAccount?.count ?? 0,
    pendingSyncDevice: pendingSyncDevice?.count ?? 0,
    failedSyncDevice: failedSyncDevice?.count ?? 0,
    processingSync: processingSync?.count ?? 0,
    completedSync: completedSync?.count ?? 0,
  };
}

export async function runBackupSync(userId: string) {
  const remoteAvailability = await probeRemoteBackendAvailability();

  if (!remoteAvailability.canSync) {
    throw new Error(
      remoteAvailability.detail ?? remoteAvailability.description,
    );
  }

  await bootstrapUserDataSync(userId);
}

export async function getRemoteBackupAvailability() {
  return probeRemoteBackendAvailability();
}
