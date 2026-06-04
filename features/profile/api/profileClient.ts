import {
  countSyncQueue,
  countUserFailedRecords,
  countUserPendingRecords,
  countUserRecords,
  getUserLastObservedSyncAt,
  getUserTableLastSyncedAt,
} from "@/features/profile/services/backupSummaryQueries";
import { runUserDataSync } from "@/services/database/userDataSync";
import { getDatabase } from "@/services/database/sqlite";
import { probeRemoteBackendAvailability } from "@/services/supabase/backendReadiness";

export interface BackupSummary {
  activePlants: number;
  archivedPlants: number;
  photos: number;
  careLogs: number;
  reminders: number;
  careLogTags: number;
  plantStatusSnapshots: number;
  specimenTags: number;
  archiveCurationOverrides: number;
  featureUsageRecords: number;
  lastSuccessfulSyncAt: string | null;
  pendingSyncUser: number;
  failedSyncUser: number;
  pendingSyncQueueAccount: number;
  failedSyncQueueAccount: number;
  pendingSyncQueueDevice: number;
  failedSyncQueueDevice: number;
  abandonedSyncQueueAccount: number;
  abandonedSyncQueueDevice: number;
  deferredSyncQueueAccount: number;
  deferredSyncQueueDevice: number;
  processingSync: number;
  completedSync: number;
  syncEnabled: boolean;
  tableLastSyncedAt: {
    plants: string | null;
    careLogs: string | null;
    photos: string | null;
    careReminders: string | null;
    graveyardPlants: string | null;
    userPreferences: string | null;
    careLogTags: string | null;
    plantStatusSnapshots: string | null;
    specimenTags: string | null;
    archiveCurationOverrides: string | null;
  };
}

export async function getBackupSummary(userId: string): Promise<BackupSummary> {
  const database = await getDatabase();

  const [
    activePlants,
    archivedPlants,
    photos,
    careLogs,
    reminders,
    careLogTags,
    plantStatusSnapshots,
    specimenTags,
    archiveCurationOverrides,
    featureUsageRecords,
    lastSuccessfulSyncAt,
    pendingPlants,
    pendingPhotos,
    pendingCareLogs,
    pendingReminders,
    pendingMemorials,
    pendingPreferences,
    pendingCareLogTags,
    pendingStatusSnapshots,
    pendingSpecimenTags,
    pendingArchiveOverrides,
    failedPlants,
    failedPhotos,
    failedCareLogs,
    failedReminders,
    failedMemorials,
    failedPreferences,
    failedCareLogTags,
    failedStatusSnapshots,
    failedSpecimenTags,
    failedArchiveOverrides,
    pendingSyncQueueAccount,
    failedSyncQueueAccount,
    pendingSyncQueueDevice,
    failedSyncQueueDevice,
    abandonedSyncQueueAccount,
    abandonedSyncQueueDevice,
    deferredSyncQueueAccount,
    deferredSyncQueueDevice,
    processingSync,
    completedSync,
    userPreferences,
    plantsLastSynced,
    careLogsLastSynced,
    photosLastSynced,
    remindersLastSynced,
    graveyardPlantsLastSynced,
    userPreferencesLastSynced,
    careLogTagsLastSynced,
    statusSnapshotsLastSynced,
    specimenTagsLastSynced,
    archiveOverridesLastSynced,
  ] = await Promise.all([
    countUserRecords("plants", userId, "status = 'active'"),
    countUserRecords("graveyard_plants", userId),
    countUserRecords("photos", userId),
    countUserRecords("care_logs", userId),
    countUserRecords("care_reminders", userId),
    countUserRecords("care_log_tags", userId),
    countUserRecords("plant_status_snapshots", userId),
    countUserRecords("specimen_tags", userId),
    countUserRecords("archive_curation_overrides", userId),
    countUserRecords("feature_usage", userId),
    getUserLastObservedSyncAt(userId),
    countUserPendingRecords("plants", userId),
    countUserPendingRecords("photos", userId),
    countUserPendingRecords("care_logs", userId),
    countUserPendingRecords("care_reminders", userId),
    countUserPendingRecords("graveyard_plants", userId),
    countUserPendingRecords("user_preferences", userId),
    countUserPendingRecords("care_log_tags", userId),
    countUserPendingRecords("plant_status_snapshots", userId),
    countUserPendingRecords("specimen_tags", userId),
    countUserPendingRecords("archive_curation_overrides", userId),
    countUserFailedRecords("plants", userId),
    countUserFailedRecords("photos", userId),
    countUserFailedRecords("care_logs", userId),
    countUserFailedRecords("care_reminders", userId),
    countUserFailedRecords("graveyard_plants", userId),
    countUserFailedRecords("user_preferences", userId),
    countUserFailedRecords("care_log_tags", userId),
    countUserFailedRecords("plant_status_snapshots", userId),
    countUserFailedRecords("specimen_tags", userId),
    countUserFailedRecords("archive_curation_overrides", userId),
    countSyncQueue("pending", userId),
    countSyncQueue("failed", userId),
    countSyncQueue("pending"),
    countSyncQueue("failed"),
    countSyncQueue("abandoned", userId),
    countSyncQueue("abandoned"),
    countSyncQueue("deferred", userId),
    countSyncQueue("deferred"),
    countSyncQueue("processing"),
    countSyncQueue("completed"),
    database.getFirstAsync<{ auto_sync_enabled: number | null }>(
      "SELECT auto_sync_enabled FROM user_preferences WHERE user_id = ? LIMIT 1;",
      userId,
    ),
    getUserTableLastSyncedAt("plants", userId),
    getUserTableLastSyncedAt("care_logs", userId),
    getUserTableLastSyncedAt("photos", userId),
    getUserTableLastSyncedAt("care_reminders", userId),
    getUserTableLastSyncedAt("graveyard_plants", userId),
    getUserTableLastSyncedAt("user_preferences", userId),
    getUserTableLastSyncedAt("care_log_tags", userId),
    getUserTableLastSyncedAt("plant_status_snapshots", userId),
    getUserTableLastSyncedAt("specimen_tags", userId),
    getUserTableLastSyncedAt("archive_curation_overrides", userId),
  ]);

  const pendingSyncUser =
    pendingPlants +
    pendingPhotos +
    pendingCareLogs +
    pendingReminders +
    pendingMemorials +
    pendingPreferences +
    pendingCareLogTags +
    pendingStatusSnapshots +
    pendingSpecimenTags +
    pendingArchiveOverrides;

  const failedSyncUser =
    failedPlants +
    failedPhotos +
    failedCareLogs +
    failedReminders +
    failedMemorials +
    failedPreferences +
    failedCareLogTags +
    failedStatusSnapshots +
    failedSpecimenTags +
    failedArchiveOverrides;

  return {
    activePlants,
    archivedPlants,
    photos,
    careLogs,
    reminders,
    careLogTags,
    plantStatusSnapshots,
    specimenTags,
    archiveCurationOverrides,
    featureUsageRecords,
    lastSuccessfulSyncAt,
    pendingSyncUser,
    failedSyncUser,
    pendingSyncQueueAccount,
    failedSyncQueueAccount,
    pendingSyncQueueDevice,
    failedSyncQueueDevice,
    abandonedSyncQueueAccount,
    abandonedSyncQueueDevice,
    deferredSyncQueueAccount,
    deferredSyncQueueDevice,
    processingSync,
    completedSync,
    syncEnabled: (userPreferences?.auto_sync_enabled ?? 1) !== 0,
    tableLastSyncedAt: {
      plants: plantsLastSynced,
      careLogs: careLogsLastSynced,
      photos: photosLastSynced,
      careReminders: remindersLastSynced,
      graveyardPlants: graveyardPlantsLastSynced,
      userPreferences: userPreferencesLastSynced,
      careLogTags: careLogTagsLastSynced,
      plantStatusSnapshots: statusSnapshotsLastSynced,
      specimenTags: specimenTagsLastSynced,
      archiveCurationOverrides: archiveOverridesLastSynced,
    },
  };
}

export async function runBackupSync(userId: string) {
  return runUserDataSync({
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
