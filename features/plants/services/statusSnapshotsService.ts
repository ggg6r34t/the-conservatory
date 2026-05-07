import type { PlantHealthState } from "@/features/plants/services/plantStatusService";
import { getDatabase } from "@/services/database/sqlite";
import { runAtomicMutationWithSyncOutbox } from "@/services/database/syncOutbox";
import { createId } from "@/utils/id";

export type PlantStatusSnapshotValue = "thriving" | "stable" | "needs_water";

export interface PlantStatusSnapshot {
  id: string;
  userId: string;
  plantId: string;
  status: PlantStatusSnapshotValue;
  reason: string | null;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  pending: number;
  syncedAt: string | null;
  syncError: string | null;
}

function normalizeHealthState(
  state: PlantHealthState,
): PlantStatusSnapshotValue {
  return state === "needs_attention" ? "needs_water" : state;
}

export function buildStatusSnapshot(input: {
  userId: string;
  plantId: string;
  healthState: PlantHealthState;
  reason?: string | null;
  capturedAt: string;
}): PlantStatusSnapshot {
  const now = new Date().toISOString();
  return {
    id: createId("status"),
    userId: input.userId,
    plantId: input.plantId,
    status: normalizeHealthState(input.healthState),
    reason: input.reason ?? null,
    capturedAt: input.capturedAt,
    createdAt: now,
    updatedAt: now,
    updatedBy: input.userId,
    pending: 1,
    syncedAt: null,
    syncError: null,
  };
}

export function shouldStoreStatusSnapshot(input: {
  previousStatus?: PlantStatusSnapshotValue | null;
  nextStatus: PlantStatusSnapshotValue;
  previousCapturedAt?: string | null;
  nextCapturedAt: string;
}) {
  if (!input.previousStatus) {
    return true;
  }

  return input.previousStatus !== input.nextStatus;
}

function mapSnapshot(row: {
  id: string;
  user_id: string;
  plant_id: string;
  status: PlantStatusSnapshotValue;
  reason: string | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  pending: number;
  synced_at: string | null;
  sync_error: string | null;
}): PlantStatusSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    status: row.status,
    reason: row.reason,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    pending: row.pending,
    syncedAt: row.synced_at,
    syncError: row.sync_error,
  };
}

export async function recordPlantStatusSnapshot(input: {
  userId: string;
  plantId: string;
  healthState: PlantHealthState;
  reason?: string | null;
  capturedAt?: string;
}) {
  const database = await getDatabase();
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const snapshot = buildStatusSnapshot({ ...input, capturedAt });

  const previous = await database.getFirstAsync<{
    status: PlantStatusSnapshotValue;
    captured_at: string;
  }>(
    `SELECT status, captured_at FROM plant_status_snapshots
     WHERE user_id = ? AND plant_id = ?
     ORDER BY captured_at DESC LIMIT 1;`,
    input.userId,
    input.plantId,
  );

  if (
    !shouldStoreStatusSnapshot({
      previousStatus: previous?.status ?? null,
      previousCapturedAt: previous?.captured_at ?? null,
      nextStatus: snapshot.status,
      nextCapturedAt: snapshot.capturedAt,
    })
  ) {
    return null;
  }

  return runAtomicMutationWithSyncOutbox(database, {
    nowIso: snapshot.createdAt,
    perform: async (nowIso) => {
      await database.runAsync(
        `INSERT INTO plant_status_snapshots (
          id, user_id, plant_id, status, reason, captured_at, created_at,
          updated_at, updated_by, pending, synced_at, sync_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        snapshot.id,
        snapshot.userId,
        snapshot.plantId,
        snapshot.status,
        snapshot.reason,
        snapshot.capturedAt,
        nowIso,
        nowIso,
        snapshot.userId,
        1,
        null,
        null,
      );

      return {
        result: snapshot,
        operations: [
          {
            entity: "plant_status_snapshots",
            entityId: snapshot.id,
            operation: "insert" as const,
            payload: {
              userId: snapshot.userId,
              plantId: snapshot.plantId,
              status: snapshot.status,
            },
          },
        ],
      };
    },
  });
}

export async function listPlantStatusSnapshots(plantId: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Parameters<typeof mapSnapshot>[0]>(
    `SELECT * FROM plant_status_snapshots
     WHERE plant_id = ?
     ORDER BY captured_at DESC;`,
    plantId,
  );
  return rows.map(mapSnapshot);
}
