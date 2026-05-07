import {
  createSyncQueueService,
  type SyncQueueItem,
  type SyncQueueStorage,
} from "@/services/database/sync";

jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: true,
  },
}));

const mockProcessSyncQueueItemWithSupabase = jest.fn();

jest.mock("@/services/database/supabaseSyncAdapter", () => ({
  processSyncQueueItemWithSupabase: (...args: unknown[]) =>
    mockProcessSyncQueueItemWithSupabase(...args),
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

  async reclaimStaleProcessing(
    staleBeforeIso: string,
    nowIso: string,
    errorMessage: string,
  ) {
    let reclaimed = 0;

    this.items = this.items.map((item) => {
      if (item.status !== "processing" || item.updatedAt > staleBeforeIso) {
        return item;
      }

      reclaimed += 1;
      return {
        ...item,
        status: "failed",
        attemptCount: item.attemptCount + 1,
        lastError: errorMessage,
        nextRetryAt: nowIso,
        updatedAt: nowIso,
      };
    });

    return reclaimed;
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

  async markDeferred(
    id: string,
    reason: string,
    updatedAt: string,
  ) {
    this.items = this.items.map((item) =>
      item.id === id
        ? {
            ...item,
            status: "pending",
            lastError: reason,
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

  async markAbandoned(id: string, errorMessage: string, updatedAt: string) {
    this.items = this.items.map((item) =>
      item.id === id
        ? {
            ...item,
            status: "abandoned",
            attemptCount: item.attemptCount + 1,
            lastError: errorMessage,
            nextRetryAt: null,
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

  seed(item: SyncQueueItem) {
    this.items.push(item);
  }
}

describe("sync queue replay", () => {
  beforeEach(() => {
    mockProcessSyncQueueItemWithSupabase.mockResolvedValue(undefined);
  });

  it("uses the Supabase replay adapter when Supabase is configured", async () => {
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

    expect(report.processed).toBe(1);
    expect(report.successful).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.remaining).toBe(0);
    expect(storage.findByEntity("plants")?.status).toBe("completed");
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

  it("leaves deferred premium-only photo backup retryable without counting it as failed", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    await service.enqueueSyncOperation({
      entity: "photos",
      entityId: "photo-1",
      operation: "insert",
      payload: { userId: "user-1", plantId: "plant-1" },
      nowIso: "2026-03-21T10:00:00.000Z",
    });

    const report = await service.syncPendingChanges({
      nowIso: "2026-03-21T10:05:00.000Z",
      processOperation: async () => ({
        status: "deferred" as const,
        reason: "Premium photo backup is deferred until subscription is active.",
      }),
    });

    expect(report.processed).toBe(1);
    expect(report.successful).toBe(0);
    expect(report.failed).toBe(0);
    expect(report.deferred).toBe(1);
    expect(report.remaining).toBe(1);

    const item = storage.findByEntity("photos");
    expect(item?.status).toBe("pending");
    expect(item?.attemptCount).toBe(0);
    expect(item?.lastError).toMatch(/premium photo backup/i);
    expect(item?.nextRetryAt).toBeNull();
  });

  it("reclaims stale processing items and replays them", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    storage.seed({
      id: "sync-stale-1",
      entity: "plants",
      entityId: "plant-stale-1",
      operation: "update",
      payload: null,
      status: "processing",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    const report = await service.syncPendingChanges({
      nowIso: "2026-03-21T10:10:00.000Z",
      processOperation: async () => undefined,
    });

    expect(report.reclaimed).toBe(1);
    expect(report.processed).toBe(1);
    expect(report.successful).toBe(1);
    expect(storage.getAll()[0]?.status).toBe("completed");
  });

  it("does not reclaim non-stale processing items", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    storage.seed({
      id: "sync-processing-fresh-1",
      entity: "plants",
      entityId: "plant-fresh-1",
      operation: "update",
      payload: null,
      status: "processing",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:08:00.000Z",
      updatedAt: "2026-03-21T10:08:00.000Z",
    });

    const report = await service.syncPendingChanges({
      nowIso: "2026-03-21T10:10:00.000Z",
      processOperation: async () => undefined,
    });

    expect(report.reclaimed).toBe(0);
    expect(report.processed).toBe(0);
    expect(storage.getAll()[0]?.status).toBe("processing");
  });
});

describe("sync queue abandoned path", () => {
  it("marks an item abandoned (not failed) when attempt count reaches 10", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    // Seed an item that has already failed 9 times — one more failure tips it over
    storage.seed({
      id: "sync-near-abandon-1",
      entity: "care_logs",
      entityId: "log-near-abandon-1",
      operation: "insert",
      payload: null,
      status: "failed",
      attemptCount: 9,
      lastError: "previous failure",
      nextRetryAt: "2026-03-21T09:00:00.000Z",
      queuedAt: "2026-03-21T08:00:00.000Z",
      updatedAt: "2026-03-21T09:00:00.000Z",
    });

    const report = await service.syncPendingChanges({
      nowIso: "2026-03-21T10:00:00.000Z",
      processOperation: async () => {
        throw new Error("persistent failure");
      },
    });

    expect(report.processed).toBe(1);
    expect(report.failed).toBe(1);

    const item = storage.findByEntity("care_logs");
    expect(item?.status).toBe("abandoned");
    expect(item?.nextRetryAt).toBeNull();
    expect(item?.lastError).toBe("persistent failure");
  });

  it("marks an item abandoned when attempt count is already at 10 at processing time", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    // item.attemptCount = 10 already (edge case: reclaimed from a stale processing state)
    storage.seed({
      id: "sync-abandon-exact-1",
      entity: "plants",
      entityId: "plant-abandon-exact-1",
      operation: "update",
      payload: null,
      status: "failed",
      attemptCount: 10,
      lastError: "previous failure",
      nextRetryAt: "2026-03-21T09:00:00.000Z",
      queuedAt: "2026-03-21T08:00:00.000Z",
      updatedAt: "2026-03-21T09:00:00.000Z",
    });

    await service.syncPendingChanges({
      nowIso: "2026-03-21T10:00:00.000Z",
      processOperation: async () => {
        throw new Error("still failing");
      },
    });

    const item = storage.getAll().find((i) => i.entityId === "plant-abandon-exact-1");
    expect(item?.status).toBe("abandoned");
    expect(item?.nextRetryAt).toBeNull();
  });

  it("does NOT abandon an item that fails for the 9th time (still within retry threshold)", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    // 8 prior failures — 9th failure should remain "failed" with a nextRetryAt
    storage.seed({
      id: "sync-not-yet-abandon-1",
      entity: "plants",
      entityId: "plant-not-yet-abandon-1",
      operation: "insert",
      payload: null,
      status: "failed",
      attemptCount: 8,
      lastError: "previous failure",
      nextRetryAt: "2026-03-21T09:00:00.000Z",
      queuedAt: "2026-03-21T08:00:00.000Z",
      updatedAt: "2026-03-21T09:00:00.000Z",
    });

    await service.syncPendingChanges({
      nowIso: "2026-03-21T10:00:00.000Z",
      processOperation: async () => {
        throw new Error("still failing");
      },
    });

    const item = storage.getAll().find((i) => i.entityId === "plant-not-yet-abandon-1");
    expect(item?.status).toBe("failed");
    expect(item?.nextRetryAt).not.toBeNull();
    expect(item?.attemptCount).toBe(9);
  });

  it("markAbandoned sets status to abandoned and clears next_retry_at", async () => {
    const storage = new InMemorySyncQueueStorage();

    storage.seed({
      id: "sync-direct-abandon-1",
      entity: "plants",
      entityId: "plant-direct-abandon-1",
      operation: "insert",
      payload: null,
      status: "failed",
      attemptCount: 9,
      lastError: "old error",
      nextRetryAt: "2026-03-21T11:00:00.000Z",
      queuedAt: "2026-03-21T08:00:00.000Z",
      updatedAt: "2026-03-21T09:00:00.000Z",
    });

    await storage.markAbandoned(
      "sync-direct-abandon-1",
      "terminal failure",
      "2026-03-21T10:00:00.000Z",
    );

    const item = storage.getAll().find((i) => i.id === "sync-direct-abandon-1");
    expect(item?.status).toBe("abandoned");
    expect(item?.nextRetryAt).toBeNull();
    expect(item?.lastError).toBe("terminal failure");
    // attemptCount is incremented by markAbandoned
    expect(item?.attemptCount).toBe(10);
  });
});
