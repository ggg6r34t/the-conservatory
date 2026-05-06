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
  getUserPreferences: jest.fn().mockResolvedValue({
    remindersEnabled: true,
    defaultWateringHour: 9,
  }),
}));

jest.mock("@/features/notifications/api/remindersClient", () => ({
  upsertReminderInTransaction: (...args: unknown[]) =>
    mockUpsertReminderInTransaction(...args),
}));

jest.mock("@/features/notifications/services/remindersScheduler", () => ({
  reschedulePlantReminder: (...args: unknown[]) =>
    mockReschedulePlantReminder(...args),
}));

describe("createCareLog with explicit loggedAt", () => {
  const BACKDATED_LOGGED_AT = "2026-01-01T10:00:00.000Z";

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

  it("uses loggedAt for logged_at and last_watered_at but uses transaction time for created_at and updated_at", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );

    // The returned row simulates what the DB would return after insert.
    // created_at and updated_at reflect transaction time (NOT the backdated loggedAt).
    const TRANSACTION_TIME = "2026-05-06T12:00:00.000Z";
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "log-backdated",
      user_id: "user-1",
      plant_id: "plant-1",
      log_type: "water",
      current_condition: null,
      notes: null,
      tags: null,
      logged_at: BACKDATED_LOGGED_AT,
      created_at: TRANSACTION_TIME,
      updated_at: TRANSACTION_TIME,
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

    mockGetPlantById.mockResolvedValue({
      plant: {
        id: "plant-1",
        userId: "user-1",
        name: "Aster",
        speciesName: "Monstera deliciosa",
        status: "active",
        wateringIntervalDays: 7,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
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
          nextDueAt: "2026-01-08T09:00:00.000Z",
          lastTriggeredAt: null,
          notificationId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          updatedBy: "user-1",
          pending: 0,
          syncedAt: null,
          syncError: null,
        },
      ],
      logs: [],
    });

    const { createCareLog } = require("@/features/care-logs/api/careLogsClient");

    const result = await createCareLog({
      userId: "user-1",
      plantId: "plant-1",
      logType: "water",
      loggedAt: BACKDATED_LOGGED_AT,
    });

    // 1. The care_logs INSERT must use BACKDATED_LOGGED_AT for logged_at
    const careLogInsertCall = runAsync.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO care_logs"),
    );
    expect(careLogInsertCall).toBeDefined();

    // The INSERT positional args are:
    // logId, userId, plantId, logType, currentCondition, cleanNotes, tagsJson,
    // loggedAt, created_at (transactionNowIso), updated_at (transactionNowIso), updatedBy, pending, synced_at, sync_error
    const insertArgs = careLogInsertCall!.slice(1) as string[];
    const loggedAtArgIndex = 7; // 8th positional param (0-indexed = 7)
    const createdAtArgIndex = 8;
    const updatedAtArgIndex = 9;

    expect(insertArgs[loggedAtArgIndex]).toBe(BACKDATED_LOGGED_AT);
    // created_at and updated_at must NOT be the backdated loggedAt
    expect(insertArgs[createdAtArgIndex]).not.toBe(BACKDATED_LOGGED_AT);
    expect(insertArgs[updatedAtArgIndex]).not.toBe(BACKDATED_LOGGED_AT);

    // 2. The plants UPDATE must use BACKDATED_LOGGED_AT for last_watered_at
    const plantsUpdateCall = runAsync.mock.calls.find(([sql]) =>
      String(sql).includes("UPDATE plants SET last_watered_at"),
    );
    expect(plantsUpdateCall).toBeDefined();

    // UPDATE plants SET last_watered_at = ?, next_water_due_at = ?, updated_at = ?, updated_by = ?, ...
    // Positional: last_watered_at is first arg after SQL
    const plantsArgs = plantsUpdateCall!.slice(1) as string[];
    expect(plantsArgs[0]).toBe(BACKDATED_LOGGED_AT); // last_watered_at
    // updated_at (3rd arg, index 2) must NOT be the backdated loggedAt
    expect(plantsArgs[2]).not.toBe(BACKDATED_LOGGED_AT);

    // 3. The returned careLog reflects the backdated loggedAt
    expect(result.careLog.loggedAt).toBe(BACKDATED_LOGGED_AT);
    // created_at and updated_at in the returned row are the transaction time
    expect(result.careLog.createdAt).toBe(TRANSACTION_TIME);
    expect(result.careLog.updatedAt).toBe(TRANSACTION_TIME);
    expect(result.careLog.createdAt).not.toBe(BACKDATED_LOGGED_AT);
    expect(result.careLog.updatedAt).not.toBe(BACKDATED_LOGGED_AT);
  });

  it("uses loggedAt for logged_at even for non-water log types", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );

    const TRANSACTION_TIME = "2026-05-06T12:00:00.000Z";
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "log-note-backdated",
      user_id: "user-1",
      plant_id: "plant-1",
      log_type: "note",
      current_condition: null,
      notes: "Inspected the roots.",
      tags: null,
      logged_at: BACKDATED_LOGGED_AT,
      created_at: TRANSACTION_TIME,
      updated_at: TRANSACTION_TIME,
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

    const { createCareLog } = require("@/features/care-logs/api/careLogsClient");

    const result = await createCareLog({
      userId: "user-1",
      plantId: "plant-1",
      logType: "note",
      notes: "Inspected the roots.",
      loggedAt: BACKDATED_LOGGED_AT,
    });

    const careLogInsertCall = runAsync.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO care_logs"),
    );
    expect(careLogInsertCall).toBeDefined();

    // logged_at is the 8th positional param (index 7)
    const insertArgs = careLogInsertCall!.slice(1) as string[];
    expect(insertArgs[7]).toBe(BACKDATED_LOGGED_AT);

    // created_at (index 8) and updated_at (index 9) are the transaction time
    expect(insertArgs[8]).not.toBe(BACKDATED_LOGGED_AT);
    expect(insertArgs[9]).not.toBe(BACKDATED_LOGGED_AT);

    expect(result.careLog.loggedAt).toBe(BACKDATED_LOGGED_AT);
    expect(result.careLog.createdAt).not.toBe(BACKDATED_LOGGED_AT);
  });
});
