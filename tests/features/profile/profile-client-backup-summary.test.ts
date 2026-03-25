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
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 4 })
      .mockResolvedValueOnce({ count: 6 })
      .mockResolvedValueOnce({ count: 3 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 5 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 7 })
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 9 });

    mockGetDatabase.mockResolvedValue({ getFirstAsync });

    const summary = await getBackupSummary("user-1");

    expect(summary.pendingSyncUser).toBe(5);
    expect(summary.failedSyncUser).toBe(4);
    expect(summary.pendingSyncQueueAccount).toBe(5);
    expect(summary.failedSyncQueueAccount).toBe(1);
    expect(summary.pendingSyncDevice).toBe(7);
    expect(summary.failedSyncDevice).toBe(2);
  });
});
