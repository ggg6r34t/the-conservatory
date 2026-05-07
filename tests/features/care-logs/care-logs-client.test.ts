const mockGetDatabase = jest.fn();
const mockGetPlantById = jest.fn();
const mockUpsertReminderInTransaction = jest
  .fn()
  .mockResolvedValue({ reminderId: "reminder-1", operation: "insert" });
const mockReschedulePlantReminder = jest.fn().mockResolvedValue(undefined);

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/features/plants/api/plantsClient", () => ({
  getPlantById: (...args: unknown[]) => mockGetPlantById(...args),
}));

jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: jest.fn().mockResolvedValue({ defaultWateringHour: 9 }),
}));

jest.mock("@/features/notifications/api/remindersClient", () => ({
  upsertReminderInTransaction: (...args: unknown[]) =>
    mockUpsertReminderInTransaction(...args),
}));

jest.mock("@/features/notifications/services/remindersScheduler", () => ({
  reschedulePlantReminder: (...args: unknown[]) =>
    mockReschedulePlantReminder(...args),
}));

describe("care logs client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const settingsClient = require("@/features/settings/api/settingsClient");
    settingsClient.getUserPreferences.mockResolvedValue({
      remindersEnabled: true,
      defaultWateringHour: 9,
    });
    mockUpsertReminderInTransaction.mockResolvedValue({
      reminderId: "reminder-1",
      operation: "insert",
    });
    mockReschedulePlantReminder.mockResolvedValue(undefined);
  });

  it("persists current condition when creating a care log", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "log-1",
      user_id: "user-1",
      plant_id: "plant-1",
      log_type: "note",
      current_condition: "Declining",
      notes: "Leaves softened near the base.",
      logged_at: "2026-03-24T10:00:00.000Z",
      created_at: "2026-03-24T10:00:00.000Z",
      updated_at: "2026-03-24T10:00:00.000Z",
      updated_by: "user-1",
      pending: 1,
      synced_at: null,
      sync_error: null,
    });

    mockGetDatabase.mockResolvedValue({
      runAsync,
      getFirstAsync,
      withTransactionAsync,
    });

    const {
      createCareLog,
    } = require("@/features/care-logs/api/careLogsClient");

    const result = await createCareLog({
      userId: "user-1",
      plantId: "plant-1",
      logType: "note",
      currentCondition: "Declining",
      notes: "Leaves softened near the base.",
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("current_condition"),
      expect.any(String),
      "user-1",
      "plant-1",
      "note",
      "Declining",
      "Leaves softened near the base.",
      null,
      expect.any(String),
      expect.any(String),
      expect.any(String),
      "user-1",
      1,
      null,
      null,
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_queue"),
      expect.any(String),
      "care_logs",
      expect.any(String),
      "insert",
      expect.stringContaining('"currentCondition":"Declining"'),
      "pending",
      0,
      null,
      null,
      expect.any(String),
      expect.any(String),
    );
    expect(result.careLog.currentCondition).toBe("Declining");
    expect(result.warningMessage).toBeNull();
  });

  it("rolls back create when outbox insert fails", async () => {
    const runAsync = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("sync queue unavailable"));
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "log-1",
      user_id: "user-1",
      plant_id: "plant-1",
      log_type: "note",
      current_condition: "Declining",
      notes: "Leaves softened near the base.",
      logged_at: "2026-03-24T10:00:00.000Z",
      created_at: "2026-03-24T10:00:00.000Z",
      updated_at: "2026-03-24T10:00:00.000Z",
      updated_by: "user-1",
      pending: 1,
      synced_at: null,
      sync_error: null,
    });

    mockGetDatabase.mockResolvedValue({
      runAsync,
      getFirstAsync,
      withTransactionAsync,
    });

    const {
      createCareLog,
    } = require("@/features/care-logs/api/careLogsClient");

    await expect(
      createCareLog({
        userId: "user-1",
        plantId: "plant-1",
        logType: "note",
        currentCondition: "Declining",
        notes: "Leaves softened near the base.",
      }),
    ).rejects.toThrow("sync queue unavailable");

    expect(getFirstAsync).toHaveBeenCalled();
  });

  it("creates one new care-log row per submission and preserves append-only history", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce({
        id: "log-1",
        user_id: "user-1",
        plant_id: "plant-1",
        log_type: "note",
        current_condition: null,
        notes: "First note.",
        logged_at: "2026-03-24T10:00:00.000Z",
        created_at: "2026-03-24T10:00:00.000Z",
        updated_at: "2026-03-24T10:00:00.000Z",
        updated_by: "user-1",
        pending: 1,
        synced_at: null,
        sync_error: null,
      })
      .mockResolvedValueOnce({
        id: "log-2",
        user_id: "user-1",
        plant_id: "plant-1",
        log_type: "note",
        current_condition: null,
        notes: "Second note.",
        logged_at: "2026-03-24T10:05:00.000Z",
        created_at: "2026-03-24T10:05:00.000Z",
        updated_at: "2026-03-24T10:05:00.000Z",
        updated_by: "user-1",
        pending: 1,
        synced_at: null,
        sync_error: null,
      });

    mockGetDatabase.mockResolvedValue({
      runAsync,
      getFirstAsync,
      withTransactionAsync,
    });

    const {
      createCareLog,
    } = require("@/features/care-logs/api/careLogsClient");

    const first = await createCareLog({
      userId: "user-1",
      plantId: "plant-1",
      logType: "note",
      notes: "First note.",
    });
    const second = await createCareLog({
      userId: "user-1",
      plantId: "plant-1",
      logType: "note",
      notes: "Second note.",
    });

    expect(
      runAsync.mock.calls.filter(([sql]) =>
        String(sql).includes("INSERT INTO care_logs"),
      ),
    ).toHaveLength(2);
    expect(first.careLog.notes).toBe("First note.");
    expect(second.careLog.notes).toBe("Second note.");
  });

  it("updates plant summary fields for water logs and keeps save truthful if reminder reschedule fails", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "log-water",
      user_id: "user-1",
      plant_id: "plant-1",
      log_type: "water",
      current_condition: null,
      notes: null,
      logged_at: "2026-03-24T10:00:00.000Z",
      created_at: "2026-03-24T10:00:00.000Z",
      updated_at: "2026-03-24T10:00:00.000Z",
      updated_by: "user-1",
      pending: 1,
      synced_at: null,
      sync_error: null,
    });

    mockGetPlantById.mockResolvedValue({
      plant: {
        id: "plant-1",
        userId: "user-1",
        name: "Aster",
        speciesName: "Monstera deliciosa",
        status: "active",
        wateringIntervalDays: 7,
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
        pending: 0,
      },
      photos: [],
      reminders: [
        {
          id: "reminder-1",
          userId: "user-1",
          plantId: "plant-1",
          reminderType: "water",
          frequencyDays: 7,
          enabled: 1,
          nextDueAt: "2026-03-31T09:00:00.000Z",
          lastTriggeredAt: null,
          notificationId: null,
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-24T10:00:00.000Z",
          updatedBy: "user-1",
          pending: 1,
          syncedAt: null,
          syncError: null,
        },
      ],
      logs: [],
    });
    mockReschedulePlantReminder.mockRejectedValue(
      new Error("scheduler unavailable"),
    );

    mockGetDatabase.mockResolvedValue({
      runAsync,
      getFirstAsync,
      withTransactionAsync,
    });

    const {
      createCareLog,
    } = require("@/features/care-logs/api/careLogsClient");

    const result = await createCareLog({
      userId: "user-1",
      plantId: "plant-1",
      logType: "water",
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE plants SET last_watered_at"),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      "user-1",
      "plant-1",
    );
    expect(result.careLog.logType).toBe("water");
    expect(result.warningMessage).toMatch(/saved on this device/i);
  });

  it("maps stored current condition when listing care logs", async () => {
    mockGetDatabase.mockResolvedValue({
      getAllAsync: jest.fn().mockResolvedValue([
        {
          id: "log-2",
          user_id: "user-1",
          plant_id: "plant-1",
          log_type: "inspect",
          current_condition: "Needs Attention",
          notes: "Edges are crisping.",
          logged_at: "2026-03-24T10:00:00.000Z",
          created_at: "2026-03-24T10:00:00.000Z",
          updated_at: "2026-03-24T10:00:00.000Z",
          updated_by: "user-1",
          pending: 0,
          synced_at: "2026-03-24T10:05:00.000Z",
          sync_error: null,
        },
      ]),
    });

    const { listCareLogs } = require("@/features/care-logs/api/careLogsClient");
    const result = await listCareLogs("plant-1");

    expect(result[0]?.currentCondition).toBe("Needs Attention");
  });

  it("reads normalized care log tags when legacy JSON tags are empty", async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: "log-1",
          user_id: "user-1",
          plant_id: "plant-1",
          log_type: "inspect",
          current_condition: null,
          notes: "Leaf check",
          tags: null,
          logged_at: "2026-03-24T10:00:00.000Z",
          created_at: "2026-03-24T10:00:00.000Z",
          updated_at: "2026-03-24T10:00:00.000Z",
          updated_by: "user-1",
          pending: 0,
          synced_at: null,
          sync_error: null,
        },
      ])
      .mockResolvedValueOnce([
        { care_log_id: "log-1", tag: "leaf" },
        { care_log_id: "log-1", tag: "pest-check" },
      ]);
    mockGetDatabase.mockResolvedValue({ getAllAsync });

    const { listCareLogs } = require("@/features/care-logs/api/careLogsClient");

    const logs = await listCareLogs("plant-1");

    expect(logs[0].tags).toEqual(["leaf", "pest-check"]);
  });

  it("updates the same just-created care log note without inserting a second row", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "log-1",
      user_id: "user-1",
      plant_id: "plant-1",
      log_type: "water",
      current_condition: null,
      notes: "Watered more deeply than usual.",
      logged_at: "2026-03-24T10:00:00.000Z",
      created_at: "2026-03-24T10:00:00.000Z",
      updated_at: "2026-03-24T10:02:00.000Z",
      updated_by: "user-1",
      pending: 1,
      synced_at: null,
      sync_error: null,
    });

    mockGetDatabase.mockResolvedValue({
      runAsync,
      getFirstAsync,
      withTransactionAsync,
    });

    const {
      updateCareLogNote,
    } = require("@/features/care-logs/api/careLogsClient");

    const result = await updateCareLogNote({
      userId: "user-1",
      plantId: "plant-1",
      careLogId: "log-1",
      notes: "  Watered more deeply than usual.  ",
    });

    expect(
      runAsync.mock.calls.filter(([sql]) =>
        String(sql).includes("INSERT INTO care_logs"),
      ),
    ).toHaveLength(0);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE care_logs"),
      "Watered more deeply than usual.",
      null,
      expect.any(String),
      "user-1",
      "log-1",
      "user-1",
      "plant-1",
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_queue"),
      expect.any(String),
      "care_logs",
      "log-1",
      "update",
      expect.stringContaining('"notes":"Watered more deeply than usual."'),
      "pending",
      0,
      null,
      null,
      expect.any(String),
      expect.any(String),
    );
    expect(result.careLog.id).toBe("log-1");
    expect(result.careLog.notes).toBe("Watered more deeply than usual.");
  });

  it("preserves the global reminders setting when water logs update reminder rows", async () => {
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
      id: "log-water",
      user_id: "user-1",
      plant_id: "plant-1",
      log_type: "water",
      current_condition: null,
      notes: null,
      tags: null,
      logged_at: "2026-03-24T10:00:00.000Z",
      created_at: "2026-03-24T10:00:00.000Z",
      updated_at: "2026-03-24T10:00:00.000Z",
      updated_by: "user-1",
      pending: 1,
      synced_at: null,
      sync_error: null,
    });

    mockGetPlantById.mockResolvedValue({
      plant: {
        id: "plant-1",
        userId: "user-1",
        name: "Aster",
        speciesName: "Monstera deliciosa",
        status: "active",
        wateringIntervalDays: 7,
        lastWateredAt: "2026-03-17T10:00:00.000Z",
        nextWaterDueAt: "2026-03-24T09:00:00.000Z",
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
        pending: 0,
      },
      photos: [],
      reminders: [
        {
          id: "reminder-1",
          userId: "user-1",
          plantId: "plant-1",
          reminderType: "water",
          frequencyDays: 7,
          enabled: 1,
          nextDueAt: "2026-03-24T09:00:00.000Z",
          lastTriggeredAt: null,
          notificationId: null,
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-24T10:00:00.000Z",
          updatedBy: "user-1",
          pending: 1,
          syncedAt: null,
          syncError: null,
        },
      ],
      logs: [],
    });

    mockGetDatabase.mockResolvedValue({
      runAsync,
      getFirstAsync,
      withTransactionAsync,
    });

    const {
      createCareLog,
    } = require("@/features/care-logs/api/careLogsClient");

    await createCareLog({
      userId: "user-1",
      plantId: "plant-1",
      logType: "water",
    });

    expect(mockUpsertReminderInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({
        plantId: "plant-1",
        enabled: false,
      }),
    );
    expect(mockReschedulePlantReminder).not.toHaveBeenCalled();
  });

  it("uses the water reminder when care logs reschedule after watering", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "log-water",
      user_id: "user-1",
      plant_id: "plant-1",
      log_type: "water",
      current_condition: null,
      notes: null,
      tags: null,
      logged_at: "2026-03-24T10:00:00.000Z",
      created_at: "2026-03-24T10:00:00.000Z",
      updated_at: "2026-03-24T10:00:00.000Z",
      updated_by: "user-1",
      pending: 1,
      synced_at: null,
      sync_error: null,
    });

    const mistReminder = {
      id: "reminder-mist",
      userId: "user-1",
      plantId: "plant-1",
      reminderType: "mist",
      frequencyDays: 3,
      enabled: 1,
      nextDueAt: "2026-03-26T09:00:00.000Z",
      lastTriggeredAt: "2026-03-20T09:00:00.000Z",
      notificationId: null,
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-24T10:00:00.000Z",
      updatedBy: "user-1",
      pending: 1,
      syncedAt: null,
      syncError: null,
    };
    const waterReminder = {
      ...mistReminder,
      id: "reminder-water",
      reminderType: "water",
      frequencyDays: 7,
      nextDueAt: "2026-03-31T09:00:00.000Z",
    };
    mockGetPlantById.mockResolvedValue({
      plant: {
        id: "plant-1",
        userId: "user-1",
        name: "Aster",
        speciesName: "Monstera deliciosa",
        status: "active",
        wateringIntervalDays: 7,
        lastWateredAt: "2026-03-17T10:00:00.000Z",
        nextWaterDueAt: "2026-03-24T09:00:00.000Z",
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
        pending: 0,
      },
      photos: [],
      reminders: [mistReminder, waterReminder],
      logs: [],
    });
    mockGetDatabase.mockResolvedValue({
      runAsync,
      getFirstAsync,
      withTransactionAsync,
    });

    const {
      createCareLog,
    } = require("@/features/care-logs/api/careLogsClient");

    await createCareLog({
      userId: "user-1",
      plantId: "plant-1",
      logType: "water",
    });

    expect(mockUpsertReminderInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({
        reminderType: "water",
      }),
    );
    expect(mockReschedulePlantReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "reminder-water",
        reminderType: "water",
      }),
      "Aster",
    );
  });

  it("reschedules the matching mist reminder when a mist log is recorded", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "log-mist",
      user_id: "user-1",
      plant_id: "plant-1",
      log_type: "mist",
      current_condition: null,
      notes: null,
      tags: null,
      logged_at: "2026-03-24T10:00:00.000Z",
      created_at: "2026-03-24T10:00:00.000Z",
      updated_at: "2026-03-24T10:00:00.000Z",
      updated_by: "user-1",
      pending: 1,
      synced_at: null,
      sync_error: null,
    });
    const mistReminder = {
      id: "reminder-mist",
      userId: "user-1",
      plantId: "plant-1",
      reminderType: "mist",
      frequencyDays: 3,
      enabled: 1,
      nextDueAt: "2026-03-26T09:00:00.000Z",
      lastTriggeredAt: null,
      notificationId: null,
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-24T10:00:00.000Z",
      updatedBy: "user-1",
      pending: 1,
      syncedAt: null,
      syncError: null,
    };
    mockGetPlantById.mockResolvedValue({
      plant: {
        id: "plant-1",
        userId: "user-1",
        name: "Aster",
        speciesName: "Monstera deliciosa",
        status: "active",
        wateringIntervalDays: 7,
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
        pending: 0,
      },
      photos: [],
      reminders: [mistReminder],
      logs: [],
    });
    mockGetDatabase.mockResolvedValue({
      runAsync,
      getFirstAsync,
      withTransactionAsync,
    });

    const {
      createCareLog,
    } = require("@/features/care-logs/api/careLogsClient");

    await createCareLog({
      userId: "user-1",
      plantId: "plant-1",
      logType: "mist",
      loggedAt: "2026-03-24T10:00:00.000Z",
    });

    expect(mockUpsertReminderInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({
        reminderType: "mist",
        frequencyDays: 3,
        nextDueAt: "2026-03-27T10:00:00.000Z",
      }),
    );
    expect(mockReschedulePlantReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "reminder-mist",
        reminderType: "mist",
      }),
      "Aster",
    );
  });
});
