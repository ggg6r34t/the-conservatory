import { getDatabase } from "@/services/database/sqlite";
import { runUserDataSync } from "@/services/database/userDataSync";
import { probeRemoteBackendAvailability } from "@/services/supabase/backendReadiness";

export interface BackupSummary {
  activePlants: number;
  archivedPlants: number;
  photos: number;
  careLogs: number;
  reminders: number;
  lastSuccessfulSyncAt: string | null;
  pendingSyncUser: number;
  failedSyncUser: number;
  pendingSyncQueueAccount: number;
  failedSyncQueueAccount: number;
  pendingSyncQueueDevice: number;
  failedSyncQueueDevice: number;
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
    lastSuccessfulSyncAt,
    pendingPlants,
    pendingPhotos,
    pendingCareLogs,
    pendingReminders,
    pendingMemorials,
    pendingPreferences,
    failedPlants,
    failedPhotos,
    failedCareLogs,
    failedReminders,
    failedMemorials,
    failedPreferences,
    pendingSyncQueueAccount,
    failedSyncQueueAccount,
    pendingSyncQueueDevice,
    failedSyncQueueDevice,
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
    database.getFirstAsync<{ last_synced_at: string | null }>(
      `SELECT MAX(synced_at) AS last_synced_at
       FROM (
         SELECT synced_at FROM plants WHERE user_id = ?
         UNION ALL
         SELECT synced_at FROM photos WHERE user_id = ?
         UNION ALL
         SELECT synced_at FROM care_logs WHERE user_id = ?
         UNION ALL
         SELECT synced_at FROM care_reminders WHERE user_id = ?
         UNION ALL
         SELECT synced_at FROM graveyard_plants WHERE user_id = ?
         UNION ALL
         SELECT synced_at FROM user_preferences WHERE user_id = ?
       );`,
      userId,
      userId,
      userId,
      userId,
      userId,
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
      "SELECT COUNT(*) AS count FROM user_preferences WHERE user_id = ? AND pending = 1;",
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
      "SELECT COUNT(*) AS count FROM user_preferences WHERE user_id = ? AND sync_error IS NOT NULL;",
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
    lastSuccessfulSyncAt: lastSuccessfulSyncAt?.last_synced_at ?? null,
    pendingSyncUser: sumCounts([
      pendingPlants,
      pendingPhotos,
      pendingCareLogs,
      pendingReminders,
      pendingMemorials,
      pendingPreferences,
    ]),
    failedSyncUser: sumCounts([
      failedPlants,
      failedPhotos,
      failedCareLogs,
      failedReminders,
      failedMemorials,
      failedPreferences,
    ]),
    pendingSyncQueueAccount: pendingSyncQueueAccount?.count ?? 0,
    failedSyncQueueAccount: failedSyncQueueAccount?.count ?? 0,
    pendingSyncQueueDevice: pendingSyncQueueDevice?.count ?? 0,
    failedSyncQueueDevice: failedSyncQueueDevice?.count ?? 0,
    processingSync: processingSync?.count ?? 0,
    completedSync: completedSync?.count ?? 0,
  };
}

export async function runBackupSync(userId: string) {
  await runUserDataSync({
    userId,
    trigger: "manual",
  });
}

export async function getRemoteBackupAvailability() {
  const availability = await probeRemoteBackendAvailability();

  if (availability.state === "available") {
    return {
      ...availability,
      title: "Cloud sync available",
      description:
        "Cloud backup is reachable, so local changes can be replayed safely and restored across devices.",
    };
  }

  if (availability.state === "local-only") {
    return {
      ...availability,
      title: "Local-only mode",
      description:
        "This build is currently storing your conservatory only on this device until cloud sync is configured.",
    };
  }

  return {
    ...availability,
    title: "Cloud sync unavailable",
    description:
      "Cloud sync can't be reached right now. Your conservatory is still safe on this device.",
  };
}
