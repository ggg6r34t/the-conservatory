import { supabase } from "@/config/supabase";
import { getDatabase } from "@/services/database/sqlite";
import type { SyncQueueItem } from "@/services/database/sync";
import { SYNC_OUTCOME_REASON_CODES } from "@/services/database/syncOutcomes";

const ENTITY_USER_ID_COLUMNS: Record<string, string> = {
  users: "id",
  user_preferences: "user_id",
  plants: "user_id",
  care_logs: "user_id",
  care_log_tags: "user_id",
  care_reminders: "user_id",
  care_schedule_suggestions: "user_id",
  photos: "user_id",
  plant_status_snapshots: "user_id",
  specimen_tags: "user_id",
  archive_curation_overrides: "user_id",
  graveyard_plants: "user_id",
  feature_usage: "user_id",
};

function parsePayloadUserId(item: SyncQueueItem): string | null {
  if (!item.payload) {
    return null;
  }

  try {
    const payload = JSON.parse(item.payload) as Record<string, unknown>;
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

async function resolveLocalUserId(item: SyncQueueItem): Promise<string | null> {
  const payloadUserId = parsePayloadUserId(item);
  if (payloadUserId) {
    return payloadUserId;
  }

  const userColumn = ENTITY_USER_ID_COLUMNS[item.entity];
  if (!userColumn) {
    return null;
  }

  const keyColumn = item.entity === "user_preferences" ? "user_id" : "id";
  const database = await getDatabase();
  const row = await database.getFirstAsync<Record<string, string>>(
    `SELECT ${userColumn} AS user_id FROM ${item.entity} WHERE ${keyColumn} = ? LIMIT 1;`,
    item.entityId,
  );

  return row?.user_id ?? null;
}

export async function assertSyncItemMatchesAuthenticatedUser(
  item: SyncQueueItem,
) {
  if (!supabase) {
    throw new Error("Supabase client is unavailable.");
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }

  const authUserId = data.user?.id;
  if (!authUserId) {
    throw new Error("Sync requires an authenticated user.");
  }

  const localUserId = await resolveLocalUserId(item);
  if (!localUserId) {
    if (item.operation === "delete") {
      return authUserId;
    }
    throw new Error(
      `Cannot verify ownership for ${item.entity} ${item.entityId}.`,
    );
  }

  if (localUserId !== authUserId) {
    throw new Error(
      `Sync blocked: ${item.entity} belongs to a different account than the signed-in user.`,
    );
  }

  return authUserId;
}

export function isPremiumDeferredOutcome(reasonCode?: string) {
  return reasonCode === SYNC_OUTCOME_REASON_CODES.PREMIUM_PHOTO_DEFERRED;
}
