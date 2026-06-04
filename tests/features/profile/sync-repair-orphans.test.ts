import {
  requeueOrphanedPendingSyncRecords,
  terminalizeStaleUpsertQueueWithoutLocalRows,
} from "@/features/profile/services/syncRepairOrphans";

const mockGetDatabase = jest.fn();
const mockNotifySyncQueueChanged = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/services/database/syncSignals", () => ({
  notifySyncQueueChanged: (...args: unknown[]) =>
    mockNotifySyncQueueChanged(...args),
}));

jest.mock("@/utils/id", () => ({
  createId: jest.fn(() => "sync-requeued-1"),
}));

describe("terminalizeStaleUpsertQueueWithoutLocalRows", () => {
  it("terminalizes pending upserts when the local row no longer exists", async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 2 });
    mockGetDatabase.mockResolvedValue({
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
      runAsync,
    });

    const result = await terminalizeStaleUpsertQueueWithoutLocalRows("user-1");

    expect(result.terminalized).toBeGreaterThan(0);
    expect(String(runAsync.mock.calls[0][0])).toContain(
      "deleted_before_sync",
    );
    expect(mockNotifySyncQueueChanged).toHaveBeenCalled();
  });
});

describe("requeueOrphanedPendingSyncRecords", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("inserts queue rows for pending plants missing active queue coverage", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getAllAsync = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes("FROM plants")) {
        return Promise.resolve([{ entity_id: "plant-orphan-1" }]);
      }
      return Promise.resolve([]);
    });

    mockGetDatabase.mockResolvedValue({
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
      getAllAsync,
      runAsync,
    });

    const result = await requeueOrphanedPendingSyncRecords("user-1");

    expect(result.requeued).toBe(1);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_queue"),
      "sync-requeued-1",
      "plants",
      "plant-orphan-1",
      "update",
      JSON.stringify({ userId: "user-1" }),
      "pending",
      0,
      null,
      null,
      expect.any(String),
      expect.any(String),
    );
    expect(mockNotifySyncQueueChanged).toHaveBeenCalled();
  });
});
