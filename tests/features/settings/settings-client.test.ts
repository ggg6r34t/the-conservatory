const mockGetDatabase = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

describe("settingsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates preferences locally and enqueues a synced replay instruction", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    const getFirstAsync = jest.fn().mockResolvedValue({
      user_id: "user-1",
      reminders_enabled: 1,
      preferred_theme: "linen-light",
      timezone: "UTC",
      default_watering_hour: 9,
      created_at: "2026-03-21T10:00:00.000Z",
      updated_at: "2026-03-21T10:00:00.000Z",
      updated_by: null,
      pending: 0,
      synced_at: "2026-03-21T10:05:00.000Z",
      sync_error: null,
    });

    mockGetDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync,
      withTransactionAsync,
    });

    const {
      updateUserPreferences,
    } = require("@/features/settings/api/settingsClient");

    const result = await updateUserPreferences("user-1", {
      remindersEnabled: false,
      timezone: "America/New_York",
      defaultWateringHour: 7,
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE user_preferences"),
      0,
      "America/New_York",
      7,
      expect.any(String),
      "user-1",
      "user-1",
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_queue"),
      expect.any(String),
      "user_preferences",
      "user-1",
      "update",
      expect.stringContaining('"userId":"user-1"'),
      "pending",
      0,
      null,
      null,
      expect.any(String),
      expect.any(String),
    );
    expect(result).toEqual(
      expect.objectContaining({
        userId: "user-1",
        remindersEnabled: false,
        timezone: "America/New_York",
        defaultWateringHour: 7,
        pending: 1,
        syncError: null,
      }),
    );
  });

  it("creates a local default preferences row without forcing remote sync", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        user_id: "user-1",
        reminders_enabled: 1,
        preferred_theme: "linen-light",
        timezone: "UTC",
        default_watering_hour: 9,
        created_at: "2026-03-21T10:00:00.000Z",
        updated_at: "2026-03-21T10:00:00.000Z",
        updated_by: "user-1",
        pending: 0,
        synced_at: null,
        sync_error: null,
      });

    mockGetDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync,
    });

    const {
      getUserPreferences,
    } = require("@/features/settings/api/settingsClient");

    const result = await getUserPreferences("user-1");

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR IGNORE INTO user_preferences"),
      "user-1",
      1,
      "linen-light",
      "UTC",
      9,
      expect.any(String),
      expect.any(String),
      "user-1",
      0,
      null,
      null,
    );
    expect(result.pending).toBe(0);
    expect(result.syncedAt).toBeNull();
  });
});
