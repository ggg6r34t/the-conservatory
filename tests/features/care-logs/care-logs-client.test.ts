const mockGetDatabase = jest.fn();
const mockEnqueueSyncOperation = jest.fn().mockResolvedValue(undefined);

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/services/database/sync", () => ({
  enqueueSyncOperation: (...args: unknown[]) =>
    mockEnqueueSyncOperation(...args),
}));

jest.mock("@/features/plants/api/plantsClient", () => ({
  getPlantById: jest.fn(),
}));

jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: jest.fn().mockResolvedValue({ defaultWateringHour: 9 }),
}));

jest.mock("@/features/notifications/api/remindersClient", () => ({
  upsertReminder: jest.fn().mockResolvedValue(undefined),
}));

describe("care logs client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("persists current condition when creating a care log", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
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
      expect.any(String),
      expect.any(String),
      expect.any(String),
      "user-1",
      1,
      null,
      null,
    );
    expect(mockEnqueueSyncOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "care_logs",
        payload: expect.objectContaining({ currentCondition: "Declining" }),
      }),
    );
    expect(result.currentCondition).toBe("Declining");
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
});
