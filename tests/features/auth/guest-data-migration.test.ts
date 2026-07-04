/**
 * @jest-environment node
 */

const mockGetDatabase = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/services/database/sync", () => ({
  enqueueSyncOperation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/features/auth/services/guestSessionService", () => ({
  clearPendingGuestMigrationId: jest.fn().mockResolvedValue(undefined),
}));

import { migrateGuestDataToUser } from "@/features/auth/services/guestDataMigrationService";
import { enqueueSyncOperation } from "@/services/database/sync";

describe("guestDataMigrationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getAllAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM plants")) {
        return [{ id: "plant-1" }];
      }
      if (sql.includes("FROM care_logs")) {
        return [{ id: "log-1" }];
      }
      return [];
    });
    const withTransactionAsync = jest.fn(async (callback: () => Promise<void>) => {
      await callback();
    });

    mockGetDatabase.mockResolvedValue({
      runAsync,
      getAllAsync,
      withTransactionAsync,
    });
  });

  it("reassigns guest rows and enqueues sync for migrated entities", async () => {
    await migrateGuestDataToUser({
      guestUserId: "guest-abc",
      authenticatedUserId: "user-real",
    });

    expect(enqueueSyncOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "plants",
        entityId: "plant-1",
      }),
    );
    expect(enqueueSyncOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "care_logs",
        entityId: "log-1",
      }),
    );
    expect(enqueueSyncOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "users",
        entityId: "user-real",
      }),
    );
  });

  it("rejects non-guest migration sources", async () => {
    await expect(
      migrateGuestDataToUser({
        guestUserId: "user-real",
        authenticatedUserId: "user-other",
      }),
    ).rejects.toThrow("guest user id");
  });
});
