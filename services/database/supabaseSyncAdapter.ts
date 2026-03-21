import { supabase } from "@/config/supabase";
import { getDatabase } from "@/services/database/sqlite";
import type { SyncQueueItem } from "@/services/database/sync";
import { logger } from "@/utils/logger";

type SyncableEntity = "plants" | "care_logs" | "care_reminders" | "photos";

function canTrackLocalSync(entity: string): entity is SyncableEntity {
  return (
    entity === "plants" ||
    entity === "care_logs" ||
    entity === "care_reminders" ||
    entity === "photos"
  );
}

async function markLocalSynced(entity: SyncableEntity, entityId: string) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE ${entity}
     SET pending = 0, synced_at = ?, sync_error = NULL
     WHERE id = ?;`,
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
     WHERE id = ?;`,
    message,
    new Date().toISOString(),
    entityId,
  );
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
    log_type: "water" | "mist" | "feed" | "prune" | "pest" | "note";
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
    storage_path: string | null;
    mime_type: string | null;
    width: number | null;
    height: number | null;
    taken_at: string | null;
    is_primary: number;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM photos WHERE id = ? LIMIT 1;", entityId);

  if (!row) {
    return null;
  }

  if (!row.storage_path || !row.mime_type) {
    logger.warn("sync.photo_missing_storage_path", { entityId });
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    plant_id: row.plant_id,
    storage_path: row.storage_path,
    mime_type: row.mime_type,
    width: row.width,
    height: row.height,
    taken_at: row.taken_at,
    is_primary: Boolean(row.is_primary),
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.user_id,
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

  if (!supabase) {
    throw new Error("Supabase client is unavailable.");
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
    const row = await loadPhotoRecord(item.entityId);
    if (!row) {
      return;
    }
    const { error } = await supabase
      .from("photos")
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
