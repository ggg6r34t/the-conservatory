import { getDatabase } from "@/services/database/sqlite";
import type { UserDataSyncTrigger } from "@/services/database/userDataSync";

export interface SyncQueueDiagnostics {
  pending: number;
  failed: number;
  abandoned: number;
  processing: number;
  deletedBeforeSync: number;
  skipped: number;
  deferred: number;
  completed: number;
}

export function formatSyncRepairStatus(status: string) {
  switch (status) {
    case "failed":
      return "Retryable failure";
    case "abandoned":
      return "Unrecoverable after retries";
    case "processing":
      return "Interrupted in progress";
    case "deleted_before_sync":
      return "Local record removed before upload";
    case "skipped":
      return "Skipped by sync processor";
    default:
      return status.replace(/_/g, " ");
  }
}

export function canRetrySyncRepairItem(status: string) {
  return status === "failed" || status === "abandoned" || status === "processing";
}

export function describeSyncRunFailure(input: {
  trigger: UserDataSyncTrigger;
  message: string;
}) {
  return `Sync (${input.trigger}) stopped: ${input.message}`;
}

export async function getSyncQueueDiagnostics(): Promise<SyncQueueDiagnostics> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ status: string; count: number }>(
    `SELECT status, COUNT(*) AS count
     FROM sync_queue
     GROUP BY status;`,
  );

  const counts = Object.fromEntries(
    rows.map((row) => [row.status, row.count]),
  ) as Record<string, number>;

  return {
    pending: counts.pending ?? 0,
    failed: counts.failed ?? 0,
    abandoned: counts.abandoned ?? 0,
    processing: counts.processing ?? 0,
    deletedBeforeSync: counts.deleted_before_sync ?? 0,
    skipped: counts.skipped ?? 0,
    deferred: counts.deferred ?? 0,
    completed: counts.completed ?? 0,
  };
}
