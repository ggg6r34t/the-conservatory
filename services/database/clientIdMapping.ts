import { supabase } from "@/config/supabase";
import { getDatabase } from "@/services/database/sqlite";
import type { SyncProcessResult } from "@/services/database/sync";
import { SYNC_OUTCOME_REASON_CODES } from "@/services/database/syncOutcomes";

export const CLIENT_ID_ENTITY_TABLES = [
  "plants",
  "photos",
  "care_logs",
  "care_log_tags",
  "care_reminders",
  "plant_status_snapshots",
  "specimen_tags",
  "archive_curation_overrides",
  "graveyard_plants",
  "feature_usage",
] as const;

export type ClientIdEntityTable = (typeof CLIENT_ID_ENTITY_TABLES)[number];

export function isClientIdEntity(entity: string): entity is ClientIdEntityTable {
  return (CLIENT_ID_ENTITY_TABLES as readonly string[]).includes(entity);
}

export function getLocalEntityId(row: {
  id: string;
  client_id?: string | null;
}): string {
  const clientId = row.client_id?.trim();
  return clientId || row.id;
}

export async function readCachedRemoteId(
  table: ClientIdEntityTable,
  localId: string,
): Promise<string | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ remote_id: string | null }>(
    `SELECT remote_id FROM ${table} WHERE id = ? LIMIT 1;`,
    localId,
  );
  return row?.remote_id ?? null;
}

export async function persistRemoteId(
  table: ClientIdEntityTable,
  localId: string,
  remoteId: string,
) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE ${table} SET remote_id = ?, updated_at = ? WHERE id = ?;`,
    remoteId,
    new Date().toISOString(),
    localId,
  );
}

export async function resolveRemoteId(
  table: ClientIdEntityTable,
  localId: string,
): Promise<string | null> {
  const cached = await readCachedRemoteId(table, localId);
  if (cached) {
    return cached;
  }

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("client_id", localId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id) {
    await persistRemoteId(table, localId, data.id);
    return data.id;
  }

  return null;
}

export function buildParentNotSyncedOutcome(parentEntity: string): SyncProcessResult {
  return {
    status: "deferred",
    reason: `Waiting for ${parentEntity} to finish backing up.`,
    reasonCode: SYNC_OUTCOME_REASON_CODES.PARENT_NOT_SYNCED,
  };
}

export async function upsertByClientId(
  table: ClientIdEntityTable,
  clientId: string,
  row: Record<string, unknown>,
): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase client is unavailable.");
  }

  const { id: _ignored, client_id: _clientIgnored, ...rest } = row;
  const { data, error } = await supabase
    .from(table)
    .upsert({ ...rest, client_id: clientId }, { onConflict: "user_id,client_id" })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) {
    throw new Error(`Remote upsert for ${table} did not return an id.`);
  }

  await persistRemoteId(table, clientId, data.id);
  return data.id;
}

export async function deleteByClientId(
  table: ClientIdEntityTable,
  clientId: string,
  userId?: string | null,
) {
  if (!supabase) {
    throw new Error("Supabase client is unavailable.");
  }

  let query = supabase.from(table).delete().eq("client_id", clientId);
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { error } = await query;
  if (error) {
    throw new Error(error.message);
  }
}
