const mockGetDatabase = jest.fn();
const mockCancelReminderNotification = jest.fn().mockResolvedValue(undefined);
const mockUpsertReminder = jest.fn().mockResolvedValue(undefined);
const mockUpsertReminderInTransaction = jest
  .fn()
  .mockResolvedValue({ reminderId: "reminder-1", operation: "insert" });
const mockReschedulePlantReminder = jest.fn().mockResolvedValue(undefined);

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/features/notifications/services/notificationService", () => ({
  cancelReminderNotification: (...args: unknown[]) =>
    mockCancelReminderNotification(...args),
}));

jest.mock("@/features/notifications/services/remindersScheduler", () => ({
  reschedulePlantReminder: (...args: unknown[]) =>
    mockReschedulePlantReminder(...args),
}));

jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: jest.fn().mockResolvedValue({ defaultWateringHour: 9 }),
}));

jest.mock("@/features/notifications/api/remindersClient", () => ({
  upsertReminder: (...args: unknown[]) => mockUpsertReminder(...args),
  upsertReminderInTransaction: (...args: unknown[]) =>
    mockUpsertReminderInTransaction(...args),
}));

jest.mock("@/services/supabase/storage", () => ({
  getStorageAssetUrl: jest.fn().mockResolvedValue(null),
}));

describe("plants client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const settingsClient = require("@/features/settings/api/settingsClient");
    settingsClient.getUserPreferences.mockResolvedValue({
      remindersEnabled: true,
      defaultWateringHour: 9,
    });
  });

  it("updates memorial content and queues a graveyard sync update", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
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
      withTransactionAsync,
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
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_queue"),
      expect.any(String),
      "graveyard_plants",
      "graveyard-1",
      "update",
      expect.stringContaining('"plantId":"plant-1"'),
      "pending",
      0,
      null,
      null,
      expect.any(String),
      expect.any(String),
    );
    expect(result.memorialNote).toBe("A generous grower.");
  });

  it("rolls back plant creation when outbox insert fails", async () => {
    const runAsync = jest
      .fn()
      .mockResolvedValueOnce(undefined) // plant INSERT
      .mockResolvedValueOnce(undefined) // reminder INSERT (upsertReminderInTransaction)
      .mockRejectedValueOnce(new Error("sync queue unavailable")); // sync_queue INSERT
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );

    mockGetDatabase.mockResolvedValue({
      runAsync,
      withTransactionAsync,
      getFirstAsync: jest.fn().mockResolvedValue(null), // no existing reminder
    });

    const { createPlant } = require("@/features/plants/api/plantsClient");

    await expect(
      createPlant({
        userId: "user-1",
        name: "Aster",
        speciesName: "Monstera deliciosa",
        wateringIntervalDays: 7,
      }),
    ).rejects.toThrow("sync queue unavailable");

    expect(mockUpsertReminder).not.toHaveBeenCalled();
  });

  it("rolls back archive mutation when outbox insert fails", async () => {
    const runAsync = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("sync queue unavailable"));
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getAllAsync = jest.fn().mockResolvedValue([]);
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce({
        id: "plant-1",
        user_id: "user-1",
        name: "Aster",
        species_name: "Monstera deliciosa",
        nickname: null,
        status: "active",
        location: null,
        watering_interval_days: 7,
        last_watered_at: null,
        next_water_due_at: "2026-03-30T10:00:00.000Z",
        notes: "Original note",
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-24T10:00:00.000Z",
        updated_by: "user-1",
        pending: 0,
        synced_at: null,
        sync_error: null,
      })
      .mockResolvedValueOnce(null);

    mockGetDatabase.mockResolvedValue({
      runAsync,
      withTransactionAsync,
      getAllAsync,
      getFirstAsync,
    });

    const { archivePlant } = require("@/features/plants/api/plantsClient");

    await expect(
      archivePlant({
        userId: "user-1",
        plantId: "plant-1",
      }),
    ).rejects.toThrow("sync queue unavailable");

    expect(mockCancelReminderNotification).not.toHaveBeenCalled();
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
    const syncInsertCalls = runAsync.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO sync_queue"),
    );

    expect(syncInsertCalls).toHaveLength(5);
    expect(syncInsertCalls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          expect.stringContaining("INSERT INTO sync_queue"),
          expect.any(String),
          "photos",
          "photo-1",
          "delete",
          expect.stringContaining('"storagePath":"user-1/plant-1/photo-1.jpg"'),
        ]),
        expect.arrayContaining([
          expect.stringContaining("INSERT INTO sync_queue"),
          expect.any(String),
          "plants",
          "plant-1",
          "delete",
          expect.stringContaining('"userId":"user-1"'),
        ]),
      ]),
    );
    expect(runAsync).toHaveBeenCalledWith(
      "DELETE FROM plants WHERE id = ? AND user_id = ?;",
      "plant-1",
      "user-1",
    );
  });

  it("keeps reminder rows disabled when creating a plant while reminders are paused", async () => {
    const settingsClient = require("@/features/settings/api/settingsClient");
    settingsClient.getUserPreferences.mockResolvedValue({
      remindersEnabled: false,
      defaultWateringHour: 9,
    });

    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getFirstAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM plants WHERE id")) {
        return {
          id: "plant-1",
          user_id: "user-1",
          name: "Aster",
          species_name: "Monstera deliciosa",
          nickname: null,
          status: "active",
          location: null,
          watering_interval_days: 7,
          last_watered_at: "2026-03-24T10:00:00.000Z",
          next_water_due_at: "2026-03-31T09:00:00.000Z",
          notes: null,
          created_at: "2026-03-24T10:00:00.000Z",
          updated_at: "2026-03-24T10:00:00.000Z",
          updated_by: "user-1",
          pending: 1,
          synced_at: null,
          sync_error: null,
        };
      }

      return null;
    });
    const getAllAsync = jest.fn().mockResolvedValue([]);

    mockGetDatabase.mockResolvedValue({
      getFirstAsync,
      getAllAsync,
      runAsync,
      withTransactionAsync,
    });

    const { createPlant } = require("@/features/plants/api/plantsClient");

    await createPlant({
      userId: "user-1",
      name: "Aster",
      speciesName: "Monstera deliciosa",
      wateringIntervalDays: 7,
    });

    expect(mockUpsertReminderInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({
        enabled: false,
        frequencyDays: 7,
      }),
    );
  });

  it("keeps reminder rows disabled when updating a plant while reminders are paused", async () => {
    const settingsClient = require("@/features/settings/api/settingsClient");
    settingsClient.getUserPreferences.mockResolvedValue({
      remindersEnabled: false,
      defaultWateringHour: 9,
    });

    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "plant-1",
      user_id: "user-1",
      name: "Aster",
      species_name: "Monstera deliciosa",
      nickname: null,
      status: "active",
      location: null,
      watering_interval_days: 7,
      last_watered_at: "2026-03-20T10:00:00.000Z",
      next_water_due_at: "2026-03-27T09:00:00.000Z",
      notes: null,
      created_at: "2026-03-01T10:00:00.000Z",
      updated_at: "2026-03-24T10:00:00.000Z",
      updated_by: "user-1",
      pending: 0,
      synced_at: "2026-03-24T10:05:00.000Z",
      sync_error: null,
    });
    const getAllAsync = jest.fn().mockResolvedValue([]);

    mockGetDatabase.mockResolvedValue({
      getFirstAsync,
      getAllAsync,
      runAsync,
      withTransactionAsync,
    });

    const { updatePlant } = require("@/features/plants/api/plantsClient");

    await updatePlant({
      userId: "user-1",
      plantId: "plant-1",
      patch: {
        name: "Aster",
        speciesName: "Monstera deliciosa",
        wateringIntervalDays: 10,
      },
    });

    expect(mockUpsertReminderInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({
        plantId: "plant-1",
        enabled: false,
        frequencyDays: 10,
      }),
    );
  });
});
