import type { BackupSummary } from "@/features/profile/api/profileClient";
import { deriveSyncHealth } from "@/features/profile/services/syncHealthService";

function buildSummary(
  overrides: Partial<BackupSummary> = {},
): BackupSummary {
  return {
    activePlants: 0,
    archivedPlants: 0,
    photos: 0,
    careLogs: 0,
    reminders: 0,
    careLogTags: 0,
    plantStatusSnapshots: 0,
    specimenTags: 0,
    archiveCurationOverrides: 0,
    featureUsageRecords: 0,
    lastSuccessfulSyncAt: null,
    pendingSyncUser: 0,
    failedSyncUser: 0,
    pendingSyncQueueAccount: 0,
    failedSyncQueueAccount: 0,
    pendingSyncQueueDevice: 0,
    failedSyncQueueDevice: 0,
    abandonedSyncQueueAccount: 0,
    abandonedSyncQueueDevice: 0,
    processingSync: 0,
    completedSync: 0,
    syncEnabled: true,
    tableLastSyncedAt: {
      plants: null,
      careLogs: null,
      photos: null,
      careReminders: null,
      graveyardPlants: null,
      userPreferences: null,
      careLogTags: null,
      plantStatusSnapshots: null,
      specimenTags: null,
      archiveCurationOverrides: null,
    },
    ...overrides,
  };
}

describe("syncHealthService", () => {
  it("treats abandoned queue items as sync issues", () => {
    const health = deriveSyncHealth(
      buildSummary({
        abandonedSyncQueueDevice: 2,
      }),
    );

    expect(health.hasIssues).toBe(true);
    expect(health.issueCount).toBe(2);
    expect(health.unrecoverableQueueCount).toBe(2);
  });

  it("aggregates failed and abandoned queue issues together", () => {
    const health = deriveSyncHealth(
      buildSummary({
        failedSyncUser: 1,
        failedSyncQueueAccount: 2,
        abandonedSyncQueueAccount: 1,
        abandonedSyncQueueDevice: 3,
      }),
    );

    expect(health.hasIssues).toBe(true);
    expect(health.issueCount).toBe(7);
    expect(health.unrecoverableQueueCount).toBe(4);
  });

  it("reports pending work without marking it as an issue", () => {
    const health = deriveSyncHealth(
      buildSummary({
        pendingSyncQueueDevice: 4,
        processingSync: 1,
      }),
    );

    expect(health.hasIssues).toBe(false);
    expect(health.hasPending).toBe(true);
    expect(health.pendingCount).toBe(5);
  });
});
