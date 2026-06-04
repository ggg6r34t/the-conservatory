import type { BackupSummary } from "@/features/profile/api/profileClient";

export interface SyncHealthSnapshot {
  hasIssues: boolean;
  hasPending: boolean;
  hasDeferredPremiumPhotos: boolean;
  issueCount: number;
  pendingCount: number;
  deferredQueueCount: number;
  failedRecordCount: number;
  failedQueueAccountCount: number;
  failedQueueDeviceCount: number;
  abandonedQueueAccountCount: number;
  abandonedQueueDeviceCount: number;
  unrecoverableQueueCount: number;
}

export function deriveSyncHealth(
  summary: BackupSummary | undefined,
): SyncHealthSnapshot {
  if (!summary) {
    return {
      hasIssues: false,
      hasPending: false,
      hasDeferredPremiumPhotos: false,
      issueCount: 0,
      pendingCount: 0,
      deferredQueueCount: 0,
      failedRecordCount: 0,
      failedQueueAccountCount: 0,
      failedQueueDeviceCount: 0,
      abandonedQueueAccountCount: 0,
      abandonedQueueDeviceCount: 0,
      unrecoverableQueueCount: 0,
    };
  }

  const failedRecordCount = summary.failedSyncUser;
  const failedQueueAccountCount = summary.failedSyncQueueAccount;
  const failedQueueDeviceCount = summary.failedSyncQueueDevice;
  const abandonedQueueAccountCount = summary.abandonedSyncQueueAccount;
  const abandonedQueueDeviceCount = summary.abandonedSyncQueueDevice;
  const unrecoverableQueueCount =
    abandonedQueueAccountCount + abandonedQueueDeviceCount;

  const issueCount =
    failedRecordCount +
    failedQueueAccountCount +
    failedQueueDeviceCount +
    abandonedQueueAccountCount +
    abandonedQueueDeviceCount;

  const deferredQueueCount =
    summary.deferredSyncQueueAccount + summary.deferredSyncQueueDevice;
  const pendingCount =
    summary.pendingSyncUser +
    summary.pendingSyncQueueAccount +
    summary.pendingSyncQueueDevice +
    summary.processingSync;

  return {
    hasIssues: issueCount > 0,
    hasPending: pendingCount > 0,
    hasDeferredPremiumPhotos: deferredQueueCount > 0,
    issueCount,
    pendingCount,
    deferredQueueCount,
    failedRecordCount,
    failedQueueAccountCount,
    failedQueueDeviceCount,
    abandonedQueueAccountCount,
    abandonedQueueDeviceCount,
    unrecoverableQueueCount,
  };
}
