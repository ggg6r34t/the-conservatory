import { getBackupSummary } from "@/features/profile/api/profileClient";

const mockGetDatabase = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

describe("profileClient.getBackupSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("separates account-scoped pending/error counts from device queue totals", async () => {
    // 24 calls in Promise.all order: activePlants, archivedPlants, photos, careLogs,
    // reminders, lastSuccessfulSyncAt, pendingPlants, pendingPhotos, pendingCareLogs,
    // pendingReminders, pendingMemorials, pendingPreferences, failedPlants, failedPhotos,
    // failedCareLogs, failedReminders, failedMemorials, failedPreferences,
    // pendingSyncQueueAccount, failedSyncQueueAccount, pendingSyncQueueDevice,
    // failedSyncQueueDevice, processingSync, completedSync
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce({ count: 2 })   // activePlants
      .mockResolvedValueOnce({ count: 1 })   // archivedPlants
      .mockResolvedValueOnce({ count: 4 })   // photos
      .mockResolvedValueOnce({ count: 6 })   // careLogs
      .mockResolvedValueOnce({ count: 3 })   // reminders
      .mockResolvedValueOnce({ last_synced_at: null }) // lastSuccessfulSyncAt
      .mockResolvedValueOnce({ count: 2 })   // pendingPlants
      .mockResolvedValueOnce({ count: 0 })   // pendingPhotos
      .mockResolvedValueOnce({ count: 1 })   // pendingCareLogs
      .mockResolvedValueOnce({ count: 0 })   // pendingReminders
      .mockResolvedValueOnce({ count: 1 })   // pendingMemorials
      .mockResolvedValueOnce({ count: 1 })   // pendingPreferences → sum = 5
      .mockResolvedValueOnce({ count: 1 })   // failedPlants
      .mockResolvedValueOnce({ count: 0 })   // failedPhotos
      .mockResolvedValueOnce({ count: 2 })   // failedCareLogs
      .mockResolvedValueOnce({ count: 0 })   // failedReminders
      .mockResolvedValueOnce({ count: 1 })   // failedMemorials
      .mockResolvedValueOnce({ count: 0 })   // failedPreferences → sum = 4
      .mockResolvedValueOnce({ count: 5 })   // pendingSyncQueueAccount
      .mockResolvedValueOnce({ count: 1 })   // failedSyncQueueAccount
      .mockResolvedValueOnce({ count: 7 })   // pendingSyncQueueDevice
      .mockResolvedValueOnce({ count: 2 })   // failedSyncQueueDevice
      .mockResolvedValueOnce({ count: 1 })   // processingSync
      .mockResolvedValueOnce({ count: 9 });  // completedSync

    mockGetDatabase.mockResolvedValue({ getFirstAsync });

    const summary = await getBackupSummary("user-1");

    expect(summary.pendingSyncUser).toBe(5);
    expect(summary.failedSyncUser).toBe(4);
    expect(summary.pendingSyncQueueAccount).toBe(5);
    expect(summary.failedSyncQueueAccount).toBe(1);
    expect(summary.pendingSyncQueueDevice).toBe(7);
    expect(summary.failedSyncQueueDevice).toBe(2);
  });
});
