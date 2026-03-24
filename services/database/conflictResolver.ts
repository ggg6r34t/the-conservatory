export interface ConflictRecord {
  entity: string;
  entityId: string;
  strategy: "last-write-wins";
  localUpdatedAt: string | null;
  remoteUpdatedAt: string;
  localPending: boolean;
}

export type ConflictWinner = "local" | "remote";

export interface ConflictResolutionResult {
  winner: ConflictWinner;
  reason: "local-pending" | "remote-newer" | "local-newer-or-equal";
}

export function resolveConflict(
  record: ConflictRecord,
): ConflictResolutionResult {
  if (record.localPending) {
    return {
      winner: "local",
      reason: "local-pending",
    };
  }

  const localUpdatedAt = record.localUpdatedAt
    ? new Date(record.localUpdatedAt).getTime()
    : Number.NEGATIVE_INFINITY;
  const remoteUpdatedAt = new Date(record.remoteUpdatedAt).getTime();

  if (remoteUpdatedAt > localUpdatedAt) {
    return {
      winner: "remote",
      reason: "remote-newer",
    };
  }

  return {
    winner: "local",
    reason: "local-newer-or-equal",
  };
}
