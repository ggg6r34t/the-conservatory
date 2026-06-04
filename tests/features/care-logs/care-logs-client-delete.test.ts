const mockGetDatabase = jest.fn();
const mockRunAtomicMutationWithSyncOutbox = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

const mockTerminalizePendingUpsertSyncQueueInTransaction = jest.fn();
const mockTerminalizePendingUpsertSyncQueueItemsInTransaction = jest.fn();

jest.mock("@/services/database/syncOutbox", () => ({
  runAtomicMutationWithSyncOutbox: (...args: unknown[]) =>
    mockRunAtomicMutationWithSyncOutbox(...args),
  terminalizePendingUpsertSyncQueueInTransaction: (...args: unknown[]) =>
    mockTerminalizePendingUpsertSyncQueueInTransaction(...args),
  terminalizePendingUpsertSyncQueueItemsInTransaction: (...args: unknown[]) =>
    mockTerminalizePendingUpsertSyncQueueItemsInTransaction(...args),
}));

describe("deleteCareLog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunAtomicMutationWithSyncOutbox.mockImplementation(
      async (_db: unknown, input: { perform: () => Promise<unknown> }) =>
        input.perform(),
    );
  });

  it("deletes care log tags and queues sync deletes", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest.fn().mockResolvedValue({ id: "log-1" });
    const getAllAsync = jest
      .fn()
      .mockResolvedValue([{ id: "tag-1" }, { id: "tag-2" }]);

    mockGetDatabase.mockResolvedValue({ runAsync, getFirstAsync, getAllAsync });

    const { deleteCareLog } = require("@/features/care-logs/api/careLogsClient");

    const result = await deleteCareLog({
      userId: "user-1",
      plantId: "plant-1",
      careLogId: "log-1",
    });

    expect(result.careLogId).toBe("log-1");
    expect(mockTerminalizePendingUpsertSyncQueueInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entity: "care_logs",
        entityId: "log-1",
      }),
    );
    expect(mockTerminalizePendingUpsertSyncQueueItemsInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entity: "care_log_tags",
        entityIds: ["tag-1", "tag-2"],
      }),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM care_log_tags"),
      "log-1",
      "user-1",
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM care_logs"),
      "log-1",
      "user-1",
      "plant-1",
    );

    const performResult = await mockRunAtomicMutationWithSyncOutbox.mock
      .calls[0][1].perform();
    expect(performResult.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: "care_log_tags",
          entityId: "tag-1",
          operation: "delete",
        }),
        expect.objectContaining({
          entity: "care_logs",
          entityId: "log-1",
          operation: "delete",
        }),
      ]),
    );
  });

  it("throws when the care log does not exist", async () => {
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue(null),
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
    });

    const { deleteCareLog } = require("@/features/care-logs/api/careLogsClient");

    await expect(
      deleteCareLog({
        userId: "user-1",
        plantId: "plant-1",
        careLogId: "missing",
      }),
    ).rejects.toThrow(/not found/i);
  });
});
