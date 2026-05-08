const mockTrackMonetizationEvent = jest.fn();

jest.mock("@/services/analytics/analyticsService", () => ({
  trackMonetizationEvent: (...args: unknown[]) =>
    mockTrackMonetizationEvent(...args),
}));

jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: false,
  },
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: jest.fn(),
}));

import {
  createSyncQueueService,
  type SyncQueueItem,
  type SyncQueueStorage,
} from "@/services/database/sync";

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
      .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))
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
    _staleBeforeIso: string,
    _nowIso: string,
    _errorMessage: string,
  ) {
    return 0;
  }

  async markProcessing(id: string, updatedAt: string) {
    this.items = this.items.map((item) =>
      item.id === id ? { ...item, status: "processing", updatedAt } : item,
    );
  }

  async markCompleted(id: string, updatedAt: string) {
    this.items = this.items.map((item) =>
      item.id === id
        ? { ...item, status: "completed", lastError: null, nextRetryAt: null, updatedAt }
        : item,
    );
  }

  async markDeferred(id: string, reason: string, updatedAt: string) {
    this.items = this.items.map((item) =>
      item.id === id
        ? { ...item, status: "pending", lastError: reason, nextRetryAt: null, updatedAt }
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

  seed(item: SyncQueueItem) {
    this.items.push(item);
  }

  findById(id: string) {
    return this.items.find((item) => item.id === id);
  }
}

describe("sync abandoned analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fires trackMonetizationEvent('sync_item_abandoned') when attemptCount reaches max retries (10)", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    // Seed an item with attemptCount = 9: one more failure tips newAttemptCount to 10 >= 10
    storage.seed({
      id: "sync-abandon-test-1",
      entity: "care_logs",
      entityId: "log-abandon-1",
      operation: "insert",
      payload: null,
      status: "failed",
      attemptCount: 9,
      lastError: "previous failure",
      nextRetryAt: "2026-03-21T09:00:00.000Z",
      queuedAt: "2026-03-21T08:00:00.000Z",
      updatedAt: "2026-03-21T09:00:00.000Z",
    });

    await service.syncPendingChanges({
      nowIso: "2026-03-21T10:00:00.000Z",
      processOperation: async () => {
        throw new Error("persistent sync failure");
      },
    });

    const item = storage.findById("sync-abandon-test-1");
    expect(item?.status).toBe("abandoned");

    expect(mockTrackMonetizationEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackMonetizationEvent).toHaveBeenCalledWith(
      "sync_item_abandoned",
      expect.objectContaining({
        entity: "care_logs",
        entityId: "log-abandon-1",
        attemptCount: 10,
      }),
    );
  });

  it("does NOT fire trackMonetizationEvent('sync_item_abandoned') when item is below max retries", async () => {
    const storage = new InMemorySyncQueueStorage();
    const service = createSyncQueueService(storage);

    // Seed an item with attemptCount = 5: newAttemptCount = 6 < 10, so markFailed is called
    storage.seed({
      id: "sync-not-abandon-test-1",
      entity: "plants",
      entityId: "plant-not-abandon-1",
      operation: "update",
      payload: null,
      status: "failed",
      attemptCount: 5,
      lastError: "previous failure",
      nextRetryAt: "2026-03-21T09:00:00.000Z",
      queuedAt: "2026-03-21T08:00:00.000Z",
      updatedAt: "2026-03-21T09:00:00.000Z",
    });

    await service.syncPendingChanges({
      nowIso: "2026-03-21T10:00:00.000Z",
      processOperation: async () => {
        throw new Error("transient failure");
      },
    });

    const item = storage.findById("sync-not-abandon-test-1");
    expect(item?.status).toBe("failed");

    expect(mockTrackMonetizationEvent).not.toHaveBeenCalledWith(
      "sync_item_abandoned",
      expect.anything(),
    );
  });
});
