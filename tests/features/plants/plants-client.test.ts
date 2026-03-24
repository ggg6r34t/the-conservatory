const mockGetDatabase = jest.fn();
const mockEnqueueSyncOperation = jest.fn().mockResolvedValue(undefined);
const mockCancelReminderNotification = jest.fn().mockResolvedValue(undefined);

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/services/database/sync", () => ({
  enqueueSyncOperation: (...args: unknown[]) =>
    mockEnqueueSyncOperation(...args),
}));

jest.mock("@/features/notifications/services/notificationService", () => ({
  cancelReminderNotification: (...args: unknown[]) =>
    mockCancelReminderNotification(...args),
}));

jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: jest.fn().mockResolvedValue({ defaultWateringHour: 9 }),
}));

jest.mock("@/features/notifications/api/remindersClient", () => ({
  upsertReminder: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/supabase/storage", () => ({
  getStorageAssetUrl: jest.fn().mockResolvedValue(null),
}));

describe("plants client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates memorial content and queues a graveyard sync update", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce({ id: "graveyard-1", plant_id: "plant-1" })
      .mockResolvedValueOnce({
        id: "graveyard-1",
        user_id: "user-1",
        plant_id: "plant-1",
        cause_of_passing: "Root rot",
        memorial_note: "A generous grower.",
        archived_at: "2026-03-10T10:00:00.000Z",
        created_at: "2026-03-10T10:00:00.000Z",
        updated_at: "2026-03-24T10:00:00.000Z",
        updated_by: "user-1",
        pending: 1,
        synced_at: null,
        sync_error: null,
      });

    mockGetDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync,
    });

    const {
      updateGraveyardMemorial,
    } = require("@/features/plants/api/plantsClient");

    const result = await updateGraveyardMemorial({
      userId: "user-1",
      graveyardId: "graveyard-1",
      causeOfPassing: "Root rot",
      memorialNote: "A generous grower.",
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE graveyard_plants"),
      "Root rot",
      "A generous grower.",
      expect.any(String),
      "user-1",
      "graveyard-1",
    );
    expect(mockEnqueueSyncOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "graveyard_plants",
        entityId: "graveyard-1",
        operation: "update",
      }),
    );
    expect(result.memorialNote).toBe("A generous grower.");
  });

  it("queues explicit child deletes before removing the remote plant", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        { id: "photo-1", storage_path: "user-1/plant-1/photo-1.jpg" },
      ])
      .mockResolvedValueOnce([{ id: "graveyard-1" }])
      .mockResolvedValueOnce([{ id: "log-1" }])
      .mockResolvedValueOnce([
        { id: "reminder-1", notification_id: "notif-1" },
      ]);

    mockGetDatabase.mockResolvedValue({
      getAllAsync,
      withTransactionAsync,
      runAsync,
    });

    const { deletePlant } = require("@/features/plants/api/plantsClient");

    await deletePlant("user-1", "plant-1");

    expect(mockCancelReminderNotification).toHaveBeenCalledWith("notif-1");
    expect(mockEnqueueSyncOperation).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        entity: "photos",
        entityId: "photo-1",
        operation: "delete",
        payload: expect.objectContaining({
          storagePath: "user-1/plant-1/photo-1.jpg",
        }),
      }),
    );
    expect(mockEnqueueSyncOperation).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        entity: "plants",
        entityId: "plant-1",
        operation: "delete",
      }),
    );
    expect(runAsync).toHaveBeenCalledWith(
      "DELETE FROM plants WHERE id = ? AND user_id = ?;",
      "plant-1",
      "user-1",
    );
  });
});
