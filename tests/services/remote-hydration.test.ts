const mockGetDatabase = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/config/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

describe("remoteHydration user preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockRemoteTables(
    userPreferencesRow: Record<string, unknown> | null,
  ) {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: async () => ({
          data:
            table === "user_preferences"
              ? userPreferencesRow
                ? [userPreferencesRow]
                : []
              : [],
          error: null,
        }),
      }),
    }));
  }

  it("hydrates remote preferences into local storage when remote is newer", async () => {
    mockRemoteTables({
      user_id: "user-1",
      reminders_enabled: false,
      auto_sync_enabled: true,
      preferred_theme: "linen-light",
      timezone: "America/New_York",
      default_watering_hour: 7,
      created_at: "2026-03-20T10:00:00.000Z",
      updated_at: "2026-03-22T10:00:00.000Z",
      updated_by: "user-1",
    });

    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest.fn().mockResolvedValue({
      pending: 0,
      updated_at: "2026-03-21T10:00:00.000Z",
    });
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );

    mockGetDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync,
      withTransactionAsync,
    });

    const {
      hydrateRemoteUserData,
    } = require("@/services/database/remoteHydration");

    await hydrateRemoteUserData("user-1");

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO user_preferences"),
      "user-1",
      0,
      1,
      "linen-light",
      "America/New_York",
      7,
      "2026-03-20T10:00:00.000Z",
      "2026-03-22T10:00:00.000Z",
      "user-1",
      0,
      expect.any(String),
      null,
    );
  });

  it("keeps pending local preferences when remote data conflicts", async () => {
    mockRemoteTables({
      user_id: "user-1",
      reminders_enabled: false,
      auto_sync_enabled: false,
      preferred_theme: "linen-light",
      timezone: "America/New_York",
      default_watering_hour: 7,
      created_at: "2026-03-20T10:00:00.000Z",
      updated_at: "2026-03-22T10:00:00.000Z",
      updated_by: "user-1",
    });

    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest.fn().mockResolvedValue({
      pending: 1,
      updated_at: "2026-03-23T10:00:00.000Z",
    });
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );

    mockGetDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync,
      withTransactionAsync,
    });

    const {
      hydrateRemoteUserData,
    } = require("@/services/database/remoteHydration");

    await hydrateRemoteUserData("user-1");

    expect(
      runAsync.mock.calls.some((call) =>
        String(call[0]).includes("INSERT OR REPLACE INTO user_preferences"),
      ),
    ).toBe(false);
  });
});
