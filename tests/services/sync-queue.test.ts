import {
  createSyncQueueService,
  type SyncQueueItem,
  type SyncQueueStorage,
} from "@/services/database/sync";

jest.mock("@/config/env", () => ({
  env: {
    enableSyncTrials: false,
    isSupabaseConfigured: true,
  },
}));

class InMemorySyncQueueStorage implements SyncQueueStorage {
  private items: SyncQueueItem[] = [];

  async insert(item: SyncQueueItem) {
    this.items.push(item);
  }

  async listProcessable(nowIso: string, limit: number) {
    return this.items
      .filter(
        (item) =>
          (item.status === "pending" || item.status === "failed") &&
          (!item.nextRetryAt || item.nextRetryAt <= nowIso),
      )
      .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
      .slice(0, limit);
  }

  async countProcessable(nowIso: string) {
    return this.items.filter(
      (item) =>
        (item.status === "pending" || item.status === "failed") &&
        (!item.nextRetryAt || item.nextRetryAt <= nowIso),
    ).length;
  }

  async markProcessing(id: string, updatedAt: string) {
    this.items = this.items.map((item) =>
      item.id === id ? { ...item, status: "processing", updatedAt } : item,
    );
  }

  async markCompleted(id: string, updatedAt: string) {
    this.items = this.items.map((item) =>
      item.id === id
        ? {
            ...item,
            status: "completed",
            lastError: null,
            nextRetryAt: null,
            updatedAt,
          }
        : item,
    );
  }

  async markFailed(
    id: string,
    errorMessage: string,
    nextRetryAt: string,
    updatedAt: string,
  ) {
    this.items = this.items.map((item) =>
      item.id === id
        ? {
            ...item,
            status: "failed",
            attemptCount: item.attemptCount + 1,
            lastError: errorMessage,
            nextRetryAt,
            updatedAt,
          }
        : item,
    );
  }

  findByEntity(entity: string) {
    return this.items.find((item) => item.entity === entity);
  }

  getAll() {
    return this.items;
  }
}

describe("sync queue replay", () => {
  it("should skip default replay when sync trials are disabled", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    await service.enqueueSyncOperation({
      entity: "plants",
      entityId: "plant-1",
      operation: "insert",
      nowIso: "2026-03-21T10:00:00.000Z",
    });

    const report = await service.syncPendingChanges({
      nowIso: "2026-03-21T10:05:00.000Z",
    });

    expect(report.processed).toBe(0);
    expect(report.successful).toBe(0);
    expect(report.failed).toBe(0);
    expect(report.remaining).toBe(1);
    expect(storage.findByEntity("plants")?.status).toBe("pending");
  });

  it("should enqueue and process pending operations", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    const queued = await service.enqueueSyncOperation({
      entity: "plants",
      entityId: "plant-1",
      operation: "insert",
      payload: { name: "Monstera" },
      nowIso: "2026-03-21T10:00:00.000Z",
    });

    expect(queued.status).toBe("pending");

    const report = await service.syncPendingChanges({
      nowIso: "2026-03-21T10:05:00.000Z",
      processOperation: async () => undefined,
    });

    expect(report.processed).toBe(1);
    expect(report.successful).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.remaining).toBe(0);

    expect(storage.findByEntity("plants")?.status).toBe("completed");
  });

  it("should retry failed operations with backoff", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    await service.enqueueSyncOperation({
      entity: "care_logs",
      entityId: "log-1",
      operation: "insert",
      payload: { logType: "water" },
      nowIso: "2026-03-21T10:00:00.000Z",
    });

    const firstAttempt = await service.syncPendingChanges({
      nowIso: "2026-03-21T10:01:00.000Z",
      processOperation: async () => {
        throw new Error("network unavailable");
      },
    });

    expect(firstAttempt.failed).toBe(1);

    const blockedAttempt = await service.syncPendingChanges({
      nowIso: "2026-03-21T10:01:30.000Z",
      processOperation: async () => undefined,
    });

    expect(blockedAttempt.processed).toBe(0);

    const replayAttempt = await service.syncPendingChanges({
      nowIso: "2026-03-21T10:03:30.000Z",
      processOperation: async () => undefined,
    });

    expect(replayAttempt.processed).toBe(1);
    expect(replayAttempt.successful).toBe(1);

    const logQueueItem = storage.findByEntity("care_logs");
    expect(logQueueItem?.attemptCount).toBe(1);
    expect(logQueueItem?.status).toBe("completed");
  });

  it("should respect sync batch limits", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    await service.enqueueSyncOperation({
      entity: "plants",
      entityId: "plant-1",
      operation: "insert",
      nowIso: "2026-03-21T10:00:00.000Z",
    });

    await service.enqueueSyncOperation({
      entity: "plants",
      entityId: "plant-2",
      operation: "insert",
      nowIso: "2026-03-21T10:00:01.000Z",
    });

    const report = await service.syncPendingChanges({
      nowIso: "2026-03-21T10:02:00.000Z",
      limit: 1,
      processOperation: async () => undefined,
    });

    expect(report.processed).toBe(1);
    expect(report.remaining).toBe(1);
    expect(
      storage.getAll().filter((item) => item.status === "completed").length,
    ).toBe(1);
  });
});
