import type { SyncQueueItem } from "@/services/database/sync";

const mockGetUser = jest.fn();
const mockGetDatabase = jest.fn();

jest.mock("@/config/supabase", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

describe("syncAuthGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-user-1" } },
      error: null,
    });
  });

  it("blocks sync when local row user_id does not match authenticated user", async () => {
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ user_id: "other-user" }),
    });

    const { assertSyncItemMatchesAuthenticatedUser } = require("@/services/database/syncAuthGuard");

    const item: SyncQueueItem = {
      id: "sync-1",
      entity: "plants",
      entityId: "plant-1",
      operation: "insert",
      payload: null,
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    };

    await expect(assertSyncItemMatchesAuthenticatedUser(item)).rejects.toThrow(
      /different account/i,
    );
  });

  it("allows sync when payload userId matches authenticated user", async () => {
    const { assertSyncItemMatchesAuthenticatedUser } = require("@/services/database/syncAuthGuard");

    const item: SyncQueueItem = {
      id: "sync-1",
      entity: "photos",
      entityId: "photo-1",
      operation: "delete",
      payload: JSON.stringify({ userId: "auth-user-1", storagePath: "photos/a.jpg" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    };

    await expect(assertSyncItemMatchesAuthenticatedUser(item)).resolves.toBe(
      "auth-user-1",
    );
  });
});
