import { STORAGE_BUCKET } from "@/config/constants";
import { supabase } from "@/config/supabase";
import { trackMonetizationEvent } from "@/services/analytics/analyticsService";
import {
  buildParentNotSyncedOutcome,
  deleteByClientId,
  isClientIdEntity,
  resolveRemoteId,
  upsertByClientId,
} from "@/services/database/clientIdMapping";
import { getDatabase } from "@/services/database/sqlite";
import type { SyncProcessResult, SyncQueueItem } from "@/services/database/sync";
import {
  buildDeletedBeforeSyncOutcome,
  SYNC_OUTCOME_REASON_CODES,
} from "@/services/database/syncOutcomes";
import { getEntitlementState } from "@/services/entitlementState";
import {
  getStorageAssetUrl,
  normalizeStoragePath,
} from "@/services/supabase/storage";
import type { CareLogCondition } from "@/types/models";

const PREMIUM_PHOTO_BACKUP_DEFERRED_REASON =
  "Premium photo backup is deferred until subscription is active.";

type SyncableEntity =
  | "user_preferences"
  | "plants"
  | "care_logs"
  | "care_log_tags"
  | "care_reminders"
  | "photos"
  | "plant_status_snapshots"
  | "specimen_tags"
  | "archive_curation_overrides"
  | "graveyard_plants";

function canTrackLocalSync(entity: string): entity is SyncableEntity {
  return (
    entity === "user_preferences" ||
    entity === "plants" ||
    entity === "care_logs" ||
    entity === "care_log_tags" ||
    entity === "care_reminders" ||
    entity === "photos" ||
    entity === "plant_status_snapshots" ||
    entity === "specimen_tags" ||
    entity === "archive_curation_overrides" ||
    entity === "graveyard_plants"
  );
}

// feature_usage is synced but not tracked via pending/synced_at (no those columns)
async function loadFeatureUsageRecord(entityId: string) {
  const database = await getDatabase();
  return database.getFirstAsync<{
    id: string;
    user_id: string;
    feature: string;
    period: string;
    count: number;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM feature_usage WHERE id = ? LIMIT 1;", entityId);
}

async function mergeFeatureUsageRecordWithRemote(row: Awaited<ReturnType<typeof loadFeatureUsageRecord>>) {
  if (!row) return null;

  const remote = await supabase!
    .from("feature_usage")
    .select("count")
    .eq("client_id", row.id)
    .maybeSingle();

  if (remote.error) {
    throw new Error(remote.error.message);
  }

  const remoteCount =
    typeof remote.data?.count === "number" ? remote.data.count : 0;
  const mergedCount = Math.max(row.count, remoteCount);
  if (mergedCount !== row.count) {
    const database = await getDatabase();
    await database.runAsync(
      "UPDATE feature_usage SET count = ?, updated_at = ? WHERE id = ?;",
      mergedCount,
      new Date().toISOString(),
      row.id,
    );
  }

  return {
    ...row,
    count: mergedCount,
  };
}

function getLocalSyncKeyColumn(entity: SyncableEntity) {
  return entity === "user_preferences" ? "user_id" : "id";
}

async function markLocalSynced(entity: SyncableEntity, entityId: string) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE ${entity}
     SET pending = 0, synced_at = ?, sync_error = NULL
     WHERE ${getLocalSyncKeyColumn(entity)} = ?;`,
    new Date().toISOString(),
    entityId,
  );
}

async function markLocalSyncError(
  entity: SyncableEntity,
  entityId: string,
  message: string,
) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE ${entity}
     SET sync_error = ?, updated_at = ?
     WHERE ${getLocalSyncKeyColumn(entity)} = ?;`,
    message,
    new Date().toISOString(),
    entityId,
  );
}

async function loadUserPreferencesRecord(entityId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    user_id: string;
    reminders_enabled: number;
    auto_sync_enabled: number;
    preferred_theme: "linen-light";
    timezone: string;
    default_watering_hour: number;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
  }>("SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1;", entityId);

  if (!row) {
    return null;
  }

  return {
    user_id: row.user_id,
    reminders_enabled: Boolean(row.reminders_enabled),
    auto_sync_enabled: Boolean(row.auto_sync_enabled),
    preferred_theme: row.preferred_theme,
    timezone: row.timezone,
    default_watering_hour: row.default_watering_hour,
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.updated_by ?? row.user_id,
  };
}

async function loadPlantRecord(entityId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    user_id: string;
    name: string;
    species_name: string;
    nickname: string | null;
    status: "active" | "graveyard";
    location: string | null;
    watering_interval_days: number;
    last_watered_at: string | null;
    next_water_due_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
  }>("SELECT * FROM plants WHERE id = ? LIMIT 1;", entityId);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    species_name: row.species_name,
    nickname: row.nickname,
    status: row.status,
    location: row.location,
    watering_interval_days: row.watering_interval_days,
    last_watered_at: row.last_watered_at,
    next_water_due_at: row.next_water_due_at,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.updated_by ?? row.user_id,
  };
}

async function loadCareLogRecord(entityId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    log_type:
      | "water"
      | "mist"
      | "feed"
      | "repot"
      | "prune"
      | "inspect"
      | "pest"
      | "note";
    current_condition: CareLogCondition | null;
    notes: string | null;
    tags: string | null;
    logged_at: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
  }>("SELECT * FROM care_logs WHERE id = ? LIMIT 1;", entityId);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    plant_id: row.plant_id,
    log_type: row.log_type,
    current_condition: row.current_condition,
    notes: row.notes,
    tags: row.tags,
    logged_at: row.logged_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.updated_by ?? row.user_id,
  };
}

async function loadReminderRecord(entityId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    reminder_type: "water" | "mist" | "feed";
    frequency_days: number;
    enabled: number;
    next_due_at: string | null;
    last_triggered_at: string | null;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
  }>("SELECT * FROM care_reminders WHERE id = ? LIMIT 1;", entityId);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    plant_id: row.plant_id,
    reminder_type: row.reminder_type,
    frequency_days: row.frequency_days,
    enabled: Boolean(row.enabled),
    next_due_at: row.next_due_at,
    last_triggered_at: row.last_triggered_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.updated_by ?? row.user_id,
  };
}

async function loadCareLogTagRecord(entityId: string) {
  const database = await getDatabase();
  return database.getFirstAsync<{
    id: string;
    user_id: string;
    care_log_id: string;
    plant_id: string;
    tag: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
  }>("SELECT * FROM care_log_tags WHERE id = ? LIMIT 1;", entityId);
}

async function loadStatusSnapshotRecord(entityId: string) {
  const database = await getDatabase();
  return database.getFirstAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    status: "thriving" | "stable" | "needs_water";
    reason: string | null;
    captured_at: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
  }>("SELECT * FROM plant_status_snapshots WHERE id = ? LIMIT 1;", entityId);
}

async function loadSpecimenTagRecord(entityId: string) {
  const database = await getDatabase();
  return database.getFirstAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    code: string;
    payload: string;
    qr_matrix: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
  }>("SELECT * FROM specimen_tags WHERE id = ? LIMIT 1;", entityId);
}

async function loadArchiveOverrideRecord(entityId: string) {
  const database = await getDatabase();
  return database.getFirstAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    before_photo_id: string;
    after_photo_id: string;
    caption: string | null;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
  }>(
    "SELECT * FROM archive_curation_overrides WHERE id = ? LIMIT 1;",
    entityId,
  );
}

async function loadPhotoRecord(entityId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    local_uri: string | null;
    remote_url: string | null;
    storage_path: string | null;
    mime_type: string | null;
    width: number | null;
    height: number | null;
    photo_role: "primary" | "progress" | null;
    captured_at: string | null;
    taken_at: string | null;
    caption: string | null;
    is_primary: number;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM photos WHERE id = ? LIMIT 1;", entityId);

  if (!row) {
    return null;
  }

  const normalizedStoragePath = normalizeStoragePath(row.storage_path);

  if (!normalizedStoragePath || !row.mime_type) {
    throw new Error(
      "Photo sync missing required storage metadata (storage_path or mime_type).",
    );
  }

  return {
    id: row.id,
    user_id: row.user_id,
    plant_id: row.plant_id,
    local_uri: row.local_uri,
    remote_url: row.remote_url,
    storage_path: normalizedStoragePath,
    mime_type: row.mime_type,
    width: row.width,
    height: row.height,
    photo_role:
      row.photo_role ?? (row.is_primary === 1 ? "primary" : "progress"),
    captured_at: row.captured_at ?? row.taken_at ?? row.created_at,
    taken_at: row.taken_at,
    caption: row.caption,
    is_primary: Boolean(row.is_primary),
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.user_id,
  };
}

async function loadGraveyardRecord(entityId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    user_id: string;
    plant_id: string;
    cause_of_passing: string | null;
    memorial_note: string | null;
    archived_at: string;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
  }>("SELECT * FROM graveyard_plants WHERE id = ? LIMIT 1;", entityId);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    plant_id: row.plant_id,
    cause_of_passing: row.cause_of_passing,
    memorial_note: row.memorial_note,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.updated_by ?? row.user_id,
  };
}

async function uploadPhotoAsset(
  row: Awaited<ReturnType<typeof loadPhotoRecord>>,
) {
  if (!supabase || !row || !row.storage_path || !row.local_uri) {
    return row;
  }

  let response: Response;
  try {
    response = await fetch(row.local_uri);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      `Photo upload failed while reading local file for ${row.id}: ${detail}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Photo upload failed: local file for ${row.id} could not be read (HTTP ${response.status}).`,
    );
  }

  const blob = await response.blob();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(row.storage_path, blob, {
      contentType: row.mime_type,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const database = await getDatabase();
  const remoteUrl = await getStorageAssetUrl(row.storage_path);
  await database.runAsync(
    "UPDATE photos SET remote_url = ?, updated_at = ? WHERE id = ?;",
    remoteUrl ?? null,
    new Date().toISOString(),
    row.id,
  );

  return {
    ...row,
    remote_url: remoteUrl,
  };
}

function parsePayload(item: SyncQueueItem): Record<string, unknown> {
  if (!item.payload) {
    return {};
  }

  try {
    return JSON.parse(item.payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function deleteRemoteRecord(item: SyncQueueItem) {
  const payload = parsePayload(item);
  const userId = typeof payload.userId === "string" ? payload.userId : null;
  const storagePath =
    typeof payload.storagePath === "string"
      ? normalizeStoragePath(payload.storagePath)
      : null;

  if (!supabase) {
    throw new Error("Supabase client is unavailable.");
  }

  if (item.entity === "photos" && storagePath) {
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (storageError) {
      throw new Error(storageError.message);
    }
  }

  if (isClientIdEntity(item.entity)) {
    await deleteByClientId(item.entity, item.entityId, userId);
    return;
  }

  const baseDelete = supabase
    .from(item.entity)
    .delete()
    .eq("id", item.entityId);
  const { error } = userId
    ? await baseDelete.eq("user_id", userId)
    : await baseDelete;

  if (error) {
    throw new Error(error.message);
  }
}

async function upsertRemoteRecord(
  item: SyncQueueItem,
): Promise<SyncProcessResult> {
  if (!supabase) {
    throw new Error("Supabase client is unavailable.");
  }

  if (item.entity === "plants") {
    const row = await loadPlantRecord(item.entityId);
    if (!row) {
      return buildDeletedBeforeSyncOutcome("plants");
    }
    const { id: _localId, ...plantPayload } = row;
    await upsertByClientId("plants", item.entityId, plantPayload);
    return;
  }

  if (item.entity === "user_preferences") {
    const row = await loadUserPreferencesRecord(item.entityId);
    if (!row) {
      return buildDeletedBeforeSyncOutcome("user_preferences");
    }
    const { error } = await supabase
      .from("user_preferences")
      .upsert(row, { onConflict: "user_id" });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  if (item.entity === "care_logs") {
    const row = await loadCareLogRecord(item.entityId);
    if (!row) {
      return buildDeletedBeforeSyncOutcome("care_logs");
    }
    const remotePlantId = await resolveRemoteId("plants", row.plant_id);
    if (!remotePlantId) {
      return buildParentNotSyncedOutcome("plants");
    }
    const { id: _localId, plant_id: _localPlantId, ...careLogPayload } = row;
    await upsertByClientId("care_logs", item.entityId, {
      ...careLogPayload,
      plant_id: remotePlantId,
    });
    return;
  }

  if (item.entity === "care_reminders") {
    const row = await loadReminderRecord(item.entityId);
    if (!row) {
      return buildDeletedBeforeSyncOutcome("care_reminders");
    }
    const remotePlantId = await resolveRemoteId("plants", row.plant_id);
    if (!remotePlantId) {
      return buildParentNotSyncedOutcome("plants");
    }
    const { id: _localId, plant_id: _localPlantId, ...reminderPayload } = row;
    await upsertByClientId("care_reminders", item.entityId, {
      ...reminderPayload,
      plant_id: remotePlantId,
    });
    return;
  }

  if (item.entity === "care_log_tags") {
    const row = await loadCareLogTagRecord(item.entityId);
    if (!row) {
      return buildDeletedBeforeSyncOutcome("care_log_tags");
    }
    const remotePlantId = await resolveRemoteId("plants", row.plant_id);
    const remoteCareLogId = await resolveRemoteId("care_logs", row.care_log_id);
    if (!remotePlantId) {
      return buildParentNotSyncedOutcome("plants");
    }
    if (!remoteCareLogId) {
      return buildParentNotSyncedOutcome("care_logs");
    }
    const {
      id: _localId,
      plant_id: _localPlantId,
      care_log_id: _localCareLogId,
      ...tagPayload
    } = row;
    await upsertByClientId("care_log_tags", item.entityId, {
      ...tagPayload,
      plant_id: remotePlantId,
      care_log_id: remoteCareLogId,
    });
    return;
  }

  if (item.entity === "plant_status_snapshots") {
    const row = await loadStatusSnapshotRecord(item.entityId);
    if (!row) {
      return buildDeletedBeforeSyncOutcome("plant_status_snapshots");
    }
    const remotePlantId = await resolveRemoteId("plants", row.plant_id);
    if (!remotePlantId) {
      return buildParentNotSyncedOutcome("plants");
    }
    const { id: _localId, plant_id: _localPlantId, ...snapshotPayload } = row;
    await upsertByClientId("plant_status_snapshots", item.entityId, {
      ...snapshotPayload,
      plant_id: remotePlantId,
    });
    return;
  }

  if (item.entity === "specimen_tags") {
    const row = await loadSpecimenTagRecord(item.entityId);
    if (!row) {
      return buildDeletedBeforeSyncOutcome("specimen_tags");
    }
    const remotePlantId = await resolveRemoteId("plants", row.plant_id);
    if (!remotePlantId) {
      return buildParentNotSyncedOutcome("plants");
    }
    const { id: _localId, plant_id: _localPlantId, ...tagPayload } = row;
    await upsertByClientId("specimen_tags", item.entityId, {
      ...tagPayload,
      plant_id: remotePlantId,
    });
    return;
  }

  if (item.entity === "archive_curation_overrides") {
    const row = await loadArchiveOverrideRecord(item.entityId);
    if (!row) {
      return buildDeletedBeforeSyncOutcome("archive_curation_overrides");
    }
    const remotePlantId = await resolveRemoteId("plants", row.plant_id);
    const remoteBeforePhotoId = await resolveRemoteId(
      "photos",
      row.before_photo_id,
    );
    const remoteAfterPhotoId = await resolveRemoteId(
      "photos",
      row.after_photo_id,
    );
    if (!remotePlantId) {
      return buildParentNotSyncedOutcome("plants");
    }
    if (!remoteBeforePhotoId || !remoteAfterPhotoId) {
      return buildParentNotSyncedOutcome("photos");
    }
    const {
      id: _localId,
      plant_id: _localPlantId,
      before_photo_id: _beforePhotoId,
      after_photo_id: _afterPhotoId,
      ...overridePayload
    } = row;
    await upsertByClientId("archive_curation_overrides", item.entityId, {
      ...overridePayload,
      plant_id: remotePlantId,
      before_photo_id: remoteBeforePhotoId,
      after_photo_id: remoteAfterPhotoId,
    });
    return;
  }

  if (item.entity === "photos") {
    if (!getEntitlementState()) {
      trackMonetizationEvent("sync_photo_deferred", {
        reason: "requires_premium",
      });
      return {
        status: "deferred" as const,
        reason: PREMIUM_PHOTO_BACKUP_DEFERRED_REASON,
        reasonCode: SYNC_OUTCOME_REASON_CODES.PREMIUM_PHOTO_DEFERRED,
      };
    }
    const localRow = await loadPhotoRecord(item.entityId);
    const row = await uploadPhotoAsset(localRow);
    if (!row) {
      return buildDeletedBeforeSyncOutcome("photos");
    }
    const remotePlantId = await resolveRemoteId("plants", row.plant_id);
    if (!remotePlantId) {
      return buildParentNotSyncedOutcome("plants");
    }
    const { id: _localId, plant_id: _localPlantId, ...photoPayload } = row;
    await upsertByClientId("photos", item.entityId, {
      ...photoPayload,
      plant_id: remotePlantId,
    });
    return;
  }

  if (item.entity === "graveyard_plants") {
    const row = await loadGraveyardRecord(item.entityId);
    if (!row) {
      return buildDeletedBeforeSyncOutcome("graveyard_plants");
    }
    const remotePlantId = await resolveRemoteId("plants", row.plant_id);
    if (!remotePlantId) {
      return buildParentNotSyncedOutcome("plants");
    }
    const { id: _localId, plant_id: _localPlantId, ...graveyardPayload } = row;
    await upsertByClientId("graveyard_plants", item.entityId, {
      ...graveyardPayload,
      plant_id: remotePlantId,
    });
    return;
  }

  if (item.entity === "feature_usage") {
    const row = await mergeFeatureUsageRecordWithRemote(
      await loadFeatureUsageRecord(item.entityId),
    );
    if (!row) {
      return buildDeletedBeforeSyncOutcome("feature_usage");
    }
    const { id: _localId, ...usagePayload } = row;
    await upsertByClientId("feature_usage", item.entityId, usagePayload);
    return;
  }

  throw new Error(`Unsupported sync entity: ${item.entity}`);
}

export async function processSyncQueueItemWithSupabase(
  item: SyncQueueItem,
): Promise<SyncProcessResult> {
  try {
    let result: SyncProcessResult = undefined;
    if (item.operation === "delete") {
      await deleteRemoteRecord(item);
    } else {
      result = await upsertRemoteRecord(item);
    }

    if (result?.status === "deferred") {
      return result;
    }

    if (
      result?.status === "deleted_before_sync" ||
      result?.status === "skipped"
    ) {
      return result;
    }

    if (canTrackLocalSync(item.entity) && item.operation !== "delete") {
      await markLocalSynced(item.entity, item.entityId);
    }

    return undefined;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync failure.";
    if (canTrackLocalSync(item.entity) && item.operation !== "delete") {
      await markLocalSyncError(item.entity, item.entityId, message);
    }
    throw error;
  }
}
