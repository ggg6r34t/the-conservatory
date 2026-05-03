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

describe("remoteHydration users table", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("hydrates users table from remote when remote is newer", async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: async () => ({
          data:
            table === "users"
              ? [
                  {
                    id: "user-1",
                    email: "test@example.com",
                    display_name: "Test User",
                    avatar_url: "https://example.com/avatar.jpg",
                    role: "user",
                    created_at: "2026-01-01T00:00:00.000Z",
                    updated_at: "2026-03-22T10:00:00.000Z",
                    updated_by: "user-1",
                  },
                ]
              : table === "user_preferences"
                ? [
                    {
                      user_id: "user-1",
                      reminders_enabled: true,
                      auto_sync_enabled: true,
                      preferred_theme: "linen-light",
                      timezone: "UTC",
                      default_watering_hour: 9,
                      created_at: "2026-01-01T00:00:00.000Z",
                      updated_at: "2026-03-22T10:00:00.000Z",
                      updated_by: "user-1",
                    },
                  ]
              : [],
          error: null,
        }),
      }),
    }));

    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM users")) {
        return {
          updated_at: "2026-01-01T00:00:00.000Z",
        };
      }
      return {
        pending: 0,
        updated_at: "2026-01-01T00:00:00.000Z",
      };
    });
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );

    mockGetDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync,
      withTransactionAsync,
    });

    const { hydrateRemoteUserData } = require("@/services/database/remoteHydration");
    await hydrateRemoteUserData("user-1");

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO users"),
      "user-1",
      "test@example.com",
      "Test User",
      "https://example.com/avatar.jpg",
      "user",
      "2026-01-01T00:00:00.000Z",
      "2026-03-22T10:00:00.000Z",
      "user-1",
    );
  });

  it("skips users hydration when local row is newer", async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: async () => ({
          data:
            table === "users"
              ? [
                  {
                    id: "user-1",
                    email: "test@example.com",
                    display_name: "Old Name",
                    avatar_url: null,
                    role: "user",
                    created_at: "2026-01-01T00:00:00.000Z",
                    updated_at: "2026-03-20T00:00:00.000Z",
                    updated_by: "user-1",
                  },
                ]
              : [],
          error: null,
        }),
      }),
    }));

    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM users")) {
        return { updated_at: "2026-03-25T00:00:00.000Z" };
      }
      return { pending: 0, updated_at: "2026-01-01T00:00:00.000Z" };
    });
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );

    mockGetDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync,
      withTransactionAsync,
    });

    const { hydrateRemoteUserData } = require("@/services/database/remoteHydration");
    await hydrateRemoteUserData("user-1");

    const didWriteUsers = runAsync.mock.calls.some((call) =>
      String(call[0]).includes("INSERT OR REPLACE INTO users"),
    );
    expect(didWriteUsers).toBe(false);
  });
});
