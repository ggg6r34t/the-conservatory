import {
  terminalizePendingUpsertSyncQueueInTransaction,
} from "@/services/database/syncOutbox";

describe("terminalizePendingUpsertSyncQueueInTransaction", () => {
  it("marks pending insert/update queue rows as deleted_before_sync", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const database = { runAsync };

    await terminalizePendingUpsertSyncQueueInTransaction(database as never, {
      entity: "care_logs",
      entityId: "log-1",
      nowIso: "2026-06-04T12:00:00.000Z",
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE sync_queue"),
      expect.stringContaining("removed before changes could be uploaded"),
      "2026-06-04T12:00:00.000Z",
      "care_logs",
      "log-1",
      "pending",
      "failed",
      "processing",
      "deferred",
    );
    expect(String(runAsync.mock.calls[0][0])).toContain(
      "status = 'deleted_before_sync'",
    );
    expect(String(runAsync.mock.calls[0][0])).toContain(
      "operation IN ('insert', 'update')",
    );
  });
});
