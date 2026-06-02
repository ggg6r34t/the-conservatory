import { getBackupSummary } from "@/features/profile/api/profileClient";

const mockCountUserRecords = jest.fn();
const mockCountUserPendingRecords = jest.fn();
const mockCountUserFailedRecords = jest.fn();
const mockGetUserLastObservedSyncAt = jest.fn();
const mockGetUserTableLastSyncedAt = jest.fn();
const mockCountSyncQueue = jest.fn();
const mockGetDatabase = jest.fn();

jest.mock("@/features/profile/services/backupSummaryQueries", () => ({
  countUserRecords: (...args: unknown[]) => mockCountUserRecords(...args),
  countUserPendingRecords: (...args: unknown[]) =>
    mockCountUserPendingRecords(...args),
  countUserFailedRecords: (...args: unknown[]) =>
    mockCountUserFailedRecords(...args),
  getUserLastObservedSyncAt: (...args: unknown[]) =>
    mockGetUserLastObservedSyncAt(...args),
  getUserTableLastSyncedAt: (...args: unknown[]) =>
    mockGetUserTableLastSyncedAt(...args),
  countSyncQueue: (...args: unknown[]) => mockCountSyncQueue(...args),
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

describe("profileClient.getBackupSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCountUserRecords.mockImplementation(async (table: string) => {
      if (table === "plants") return 2;
      if (table === "graveyard_plants") return 1;
      if (table === "photos") return 4;
      if (table === "care_logs") return 6;
      if (table === "care_reminders") return 3;
      if (table === "care_log_tags") return 8;
      if (table === "plant_status_snapshots") return 5;
      if (table === "specimen_tags") return 2;
      if (table === "archive_curation_overrides") return 1;
      if (table === "feature_usage") return 4;
      return 0;
    });
    mockCountUserPendingRecords.mockResolvedValue(1);
    mockCountUserFailedRecords.mockResolvedValue(1);
    mockGetUserLastObservedSyncAt.mockResolvedValue("2026-05-01T10:00:00.000Z");
    mockGetUserTableLastSyncedAt.mockResolvedValue("2026-05-01T09:00:00.000Z");
    mockCountSyncQueue.mockImplementation(async (status: string, userId?: string) => {
      if (status === "pending" && userId) return 5;
      if (status === "failed" && userId) return 1;
      if (status === "pending") return 7;
      if (status === "failed") return 2;
      if (status === "abandoned" && userId) return 1;
      if (status === "abandoned") return 3;
      if (status === "processing") return 1;
      if (status === "completed") return 9;
      return 0;
    });
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ auto_sync_enabled: 1 }),
    });
  });

  it("includes all synced entity counts and queue health metrics", async () => {
    const summary = await getBackupSummary("user-1");

    expect(summary.activePlants).toBe(2);
    expect(summary.archivedPlants).toBe(1);
    expect(summary.careLogTags).toBe(8);
    expect(summary.plantStatusSnapshots).toBe(5);
    expect(summary.specimenTags).toBe(2);
    expect(summary.archiveCurationOverrides).toBe(1);
    expect(summary.featureUsageRecords).toBe(4);
    expect(summary.pendingSyncUser).toBe(10);
    expect(summary.failedSyncUser).toBe(10);
    expect(summary.pendingSyncQueueAccount).toBe(5);
    expect(summary.failedSyncQueueAccount).toBe(1);
    expect(summary.abandonedSyncQueueAccount).toBe(1);
    expect(summary.abandonedSyncQueueDevice).toBe(3);
    expect(summary.lastSuccessfulSyncAt).toBe("2026-05-01T10:00:00.000Z");
    expect(summary.tableLastSyncedAt.careLogTags).toBe(
      "2026-05-01T09:00:00.000Z",
    );
  });
});
