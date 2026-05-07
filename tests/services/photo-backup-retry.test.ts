const mockNotifySyncQueueChanged = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: jest.fn(),
}));

jest.mock("@/services/database/syncSignals", () => ({
  notifySyncQueueChanged: () => mockNotifySyncQueueChanged(),
}));

jest.mock("@/utils/id", () => ({
  createId: (prefix: string) => `${prefix}-retry-1`,
}));

describe("photo backup retry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requeues eligible local photos after premium entitlement becomes active", async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValue([
        { id: "photo-1", user_id: "user-1", plant_id: "plant-1" },
      ]);
    const getFirstAsync = jest.fn().mockResolvedValue(null);
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getAllAsync,
      getFirstAsync,
      runAsync,
      withTransactionAsync,
    });

    const {
      retryDeferredPremiumPhotoBackups,
    } = require("@/services/database/photoBackupRetry");

    const result = await retryDeferredPremiumPhotoBackups("user-1");

    expect(result).toEqual({ scanned: 1, requeued: 1 });
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("FROM photos"),
      "user-1",
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE photos"),
      expect.any(String),
      "photo-1",
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_queue"),
      "sync-retry-1",
      "photos",
      "photo-1",
      "insert",
      expect.stringContaining('"userId":"user-1"'),
      "pending",
      0,
      null,
      null,
      expect.any(String),
      expect.any(String),
    );
    expect(mockNotifySyncQueueChanged).toHaveBeenCalledTimes(1);
  });

  it("does not duplicate existing pending photo queue work", async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValue([
        { id: "photo-1", user_id: "user-1", plant_id: "plant-1" },
      ]);
    const getFirstAsync = jest.fn().mockResolvedValue({ id: "sync-existing" });
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getAllAsync,
      getFirstAsync,
      runAsync,
      withTransactionAsync,
    });

    const {
      retryDeferredPremiumPhotoBackups,
    } = require("@/services/database/photoBackupRetry");

    const result = await retryDeferredPremiumPhotoBackups("user-1");

    expect(result).toEqual({ scanned: 1, requeued: 0 });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE photos"),
      expect.any(String),
      "photo-1",
    );
    expect(
      runAsync.mock.calls.some((call) =>
        String(call[0]).includes("INSERT INTO sync_queue"),
      ),
    ).toBe(false);
    expect(mockNotifySyncQueueChanged).toHaveBeenCalledTimes(1);
  });
});
