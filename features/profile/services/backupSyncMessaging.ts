export function getBackupSyncSuccessMessage(input: {
  remoteCanSync: boolean;
  hasIssues: boolean;
  hasPending: boolean;
  completedWithFollowups?: boolean;
}) {
  if (!input.remoteCanSync) {
    return "Your local backup summary has been refreshed on this device.";
  }

  if (input.completedWithFollowups) {
    return "Sync finished. Some items are waiting on earlier cloud records and will retry on the next sync.";
  }

  if (input.hasIssues) {
    return "Sync finished with items that still need attention in Backup Repair.";
  }

  if (input.hasPending) {
    return "Sync pass completed. Some changes are still queued for the next cloud upload.";
  }

  return "Latest observed sync completed. Open Backup Details to review coverage.";
}

export function getBackupSyncFailureMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "We couldn't update your backup right now.";
}
