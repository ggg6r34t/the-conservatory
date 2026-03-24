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

export interface ConflictTelemetryMeta {
  conflictClass: "local-pending" | "remote-newer" | "local-newer-or-equal";
  clockSkewSuspected: boolean;
  source: string;
}

const CLOCK_SKEW_SUSPECT_MS = 5 * 60 * 1000;

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

export function buildConflictTelemetryMeta(input: {
  record: ConflictRecord;
  result: ConflictResolutionResult;
  source: string;
}): ConflictTelemetryMeta {
  const localUpdatedAtMs = input.record.localUpdatedAt
    ? new Date(input.record.localUpdatedAt).getTime()
    : Number.NEGATIVE_INFINITY;
  const remoteUpdatedAtMs = new Date(input.record.remoteUpdatedAt).getTime();
  const timestampDriftMs = Math.abs(remoteUpdatedAtMs - localUpdatedAtMs);

  const clockSkewSuspected =
    Number.isFinite(localUpdatedAtMs) &&
    Number.isFinite(remoteUpdatedAtMs) &&
    timestampDriftMs > CLOCK_SKEW_SUSPECT_MS;

  return {
    conflictClass: input.result.reason,
    clockSkewSuspected,
    source: input.source,
  };
}
