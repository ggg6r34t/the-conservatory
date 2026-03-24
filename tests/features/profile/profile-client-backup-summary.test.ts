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
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce({ count: 2 }) // activePlants
      .mockResolvedValueOnce({ count: 1 }) // archivedPlants
      .mockResolvedValueOnce({ count: 4 }) // photos
      .mockResolvedValueOnce({ count: 6 }) // careLogs
      .mockResolvedValueOnce({ count: 3 }) // reminders
      .mockResolvedValueOnce({ count: 1 }) // pendingPlants
      .mockResolvedValueOnce({ count: 2 }) // pendingPhotos
      .mockResolvedValueOnce({ count: 0 }) // pendingCareLogs
      .mockResolvedValueOnce({ count: 1 }) // pendingReminders
      .mockResolvedValueOnce({ count: 0 }) // pendingMemorials
      .mockResolvedValueOnce({ count: 0 }) // failedPlants
      .mockResolvedValueOnce({ count: 1 }) // failedPhotos
      .mockResolvedValueOnce({ count: 0 }) // failedCareLogs
      .mockResolvedValueOnce({ count: 2 }) // failedReminders
      .mockResolvedValueOnce({ count: 0 }) // failedMemorials
      .mockResolvedValueOnce({ count: 7 }) // pendingSyncDevice
      .mockResolvedValueOnce({ count: 2 }) // failedSyncDevice
      .mockResolvedValueOnce({ count: 1 }) // processingSync
      .mockResolvedValueOnce({ count: 9 }); // completedSync

    mockGetDatabase.mockResolvedValue({ getFirstAsync });

    const summary = await getBackupSummary("user-1");

    expect(summary.pendingSyncUser).toBe(4);
    expect(summary.failedSyncUser).toBe(3);
    expect(summary.pendingSyncDevice).toBe(7);
    expect(summary.failedSyncDevice).toBe(2);
  });
});
