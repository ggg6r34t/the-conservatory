import { STORAGE_BUCKET } from "@/config/constants";
import { supabase } from "@/config/supabase";
import { getDatabase } from "@/services/database/sqlite";
import type { SyncQueueItem } from "@/services/database/sync";
import {
  getStorageAssetUrl,
  normalizeStoragePath,
} from "@/services/supabase/storage";
import type { CareLogCondition } from "@/types/models";

type SyncableEntity =
  | "user_preferences"
  | "plants"
  | "care_logs"
  | "care_reminders"
  | "photos"
  | "graveyard_plants";

function canTrackLocalSync(entity: string): entity is SyncableEntity {
  return (
    entity === "user_preferences" ||
    entity === "plants" ||
    entity === "care_logs" ||
    entity === "care_reminders" ||
    entity === "photos" ||
    entity === "graveyard_plants"
  );
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
    photo_role: row.photo_role ?? (row.is_primary === 1 ? "primary" : "progress"),
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

  const response = await fetch(row.local_uri);
  if (!response.ok) {
    throw new Error("Unable to read local photo for upload.");
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

async function upsertRemoteRecord(item: SyncQueueItem) {
  if (!supabase) {
    throw new Error("Supabase client is unavailable.");
  }

  if (item.entity === "plants") {
    const row = await loadPlantRecord(item.entityId);
    if (!row) {
      return;
    }
    const { error } = await supabase
      .from("plants")
      .upsert(row, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  if (item.entity === "user_preferences") {
    const row = await loadUserPreferencesRecord(item.entityId);
    if (!row) {
      return;
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
      return;
    }
    const { error } = await supabase
      .from("care_logs")
      .upsert(row, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  if (item.entity === "care_reminders") {
    const row = await loadReminderRecord(item.entityId);
    if (!row) {
      return;
    }
    const { error } = await supabase
      .from("care_reminders")
      .upsert(row, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  if (item.entity === "photos") {
    const localRow = await loadPhotoRecord(item.entityId);
    const row = await uploadPhotoAsset(localRow);
    if (!row) {
      return;
    }
    const { error } = await supabase.from("photos").upsert(
      {
        id: row.id,
        user_id: row.user_id,
        plant_id: row.plant_id,
        storage_path: row.storage_path,
        mime_type: row.mime_type,
        width: row.width,
        height: row.height,
        photo_role: row.photo_role,
        captured_at: row.captured_at,
        taken_at: row.taken_at,
        caption: row.caption,
        is_primary: row.is_primary,
        created_at: row.created_at,
        updated_at: row.updated_at,
        updated_by: row.updated_by,
      },
      { onConflict: "id" },
    );
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  if (item.entity === "graveyard_plants") {
    const row = await loadGraveyardRecord(item.entityId);
    if (!row) {
      return;
    }
    const { error } = await supabase
      .from("graveyard_plants")
      .upsert(row, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  throw new Error(`Unsupported sync entity: ${item.entity}`);
}

export async function processSyncQueueItemWithSupabase(item: SyncQueueItem) {
  try {
    if (item.operation === "delete") {
      await deleteRemoteRecord(item);
    } else {
      await upsertRemoteRecord(item);
    }

    if (canTrackLocalSync(item.entity) && item.operation !== "delete") {
      await markLocalSynced(item.entity, item.entityId);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync failure.";
    if (canTrackLocalSync(item.entity) && item.operation !== "delete") {
      await markLocalSyncError(item.entity, item.entityId, message);
    }
    throw error;
  }
}
