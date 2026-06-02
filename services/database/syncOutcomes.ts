export const SYNC_OUTCOME_REASON_CODES = {
  LOCAL_ROW_MISSING: "LOCAL_ROW_MISSING",
  PREMIUM_PHOTO_DEFERRED: "PREMIUM_PHOTO_DEFERRED",
  UNSUPPORTED_ENTITY: "UNSUPPORTED_ENTITY",
} as const;

export type SyncOutcomeReasonCode =
  (typeof SYNC_OUTCOME_REASON_CODES)[keyof typeof SYNC_OUTCOME_REASON_CODES];

export function buildDeletedBeforeSyncOutcome(entity: string) {
  return {
    status: "deleted_before_sync" as const,
    reason: `Local ${entity} record was removed before changes could be uploaded to the cloud.`,
    reasonCode: SYNC_OUTCOME_REASON_CODES.LOCAL_ROW_MISSING,
  };
}
