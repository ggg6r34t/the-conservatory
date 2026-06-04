const mockGetDatabase = jest.fn();
const mockFrom = jest.fn();
const mockDownloadRemotePhotoAsset = jest.fn();

jest.mock("@/config/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/services/supabase/storage", () => ({
  getStorageAssetUrl: jest.fn(async (path: string | null) =>
    path ? `https://storage.example/${path}` : null,
  ),
  normalizeStoragePath: jest.fn((path: string | null | undefined) => path ?? null),
}));

jest.mock("@/features/plants/services/photoStorageService", () => ({
  downloadRemotePhotoAsset: (...args: unknown[]) =>
    mockDownloadRemotePhotoAsset(...args),
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

    const {
      hydrateRemoteUserData,
    } = require("@/services/database/remoteHydration");
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

    const {
      hydrateRemoteUserData,
    } = require("@/services/database/remoteHydration");
    await hydrateRemoteUserData("user-1");

    const didWriteUsers = runAsync.mock.calls.some((call) =>
      String(call[0]).includes("INSERT OR REPLACE INTO users"),
    );
    expect(didWriteUsers).toBe(false);
  });
});

describe("remoteHydration care logs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("hydrates structured care log tags from remote rows", async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: async () => ({
          data:
            table === "care_logs"
              ? [
                  {
                    id: "log-1",
                    user_id: "user-1",
                    plant_id: "plant-1",
                    log_type: "inspect",
                    current_condition: "Healthy",
                    notes: "Leaf edges look stronger.",
                    tags: JSON.stringify(["stable condition", "new growth"]),
                    logged_at: "2026-03-24T10:00:00.000Z",
                    created_at: "2026-03-24T10:00:00.000Z",
                    updated_at: "2026-03-24T10:00:00.000Z",
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
      if (sql.includes("FROM care_logs")) {
        return null;
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

    const {
      hydrateRemoteUserData,
    } = require("@/services/database/remoteHydration");
    await hydrateRemoteUserData("user-1");

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO care_logs"),
      "log-1",
      "log-1",
      "user-1",
      "plant-1",
      "inspect",
      "Healthy",
      "Leaf edges look stronger.",
      JSON.stringify(["stable condition", "new growth"]),
      "2026-03-24T10:00:00.000Z",
      "2026-03-24T10:00:00.000Z",
      "2026-03-24T10:00:00.000Z",
      "user-1",
      0,
      expect.any(String),
      null,
    );
  });
});

describe("remoteHydration photos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDownloadRemotePhotoAsset.mockResolvedValue({
      localUri: "file://documents/photos/user-1/plant-1/progress/photo-1.jpg",
      storagePath: "user-1/plant-1/photo-1.jpg",
    });
  });

  it("restores hydrated remote photos into app-owned local storage", async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: async () => ({
          data:
            table === "photos"
              ? [
                  {
                    id: "photo-1",
                    user_id: "user-1",
                    plant_id: "plant-1",
                    remote_url: null,
                    storage_path: "user-1/plant-1/photo-1.jpg",
                    mime_type: "image/jpeg",
                    width: 1200,
                    height: 900,
                    photo_role: "progress",
                    captured_at: "2026-03-22T10:00:00.000Z",
                    taken_at: "2026-03-22T10:00:00.000Z",
                    caption: "New leaf",
                    is_primary: 0,
                    created_at: "2026-03-22T10:00:00.000Z",
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
    const getFirstAsync = jest.fn().mockResolvedValue(null);
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

    expect(mockDownloadRemotePhotoAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteUri: "https://storage.example/user-1/plant-1/photo-1.jpg",
        userId: "user-1",
        plantId: "plant-1",
        photoId: "photo-1",
        role: "progress",
      }),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO photos"),
      "photo-1",
      "photo-1",
      "user-1",
      "plant-1",
      "file://documents/photos/user-1/plant-1/progress/photo-1.jpg",
      "https://storage.example/user-1/plant-1/photo-1.jpg",
      "user-1/plant-1/photo-1.jpg",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "progress",
      expect.anything(),
      expect.anything(),
      "New leaf",
      0,
      expect.anything(),
      expect.anything(),
      0,
      expect.anything(),
      null,
    );
  });
});

describe("remoteHydration feature_usage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("merges remote feature_usage counts with local using max", async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: async () => ({
          data:
            table === "feature_usage"
              ? [
                  {
                    id: "remote-uuid-1",
                    client_id: "user-1:ai_health_insight:2026-05",
                    user_id: "user-1",
                    feature: "ai_health_insight",
                    period: "2026-05",
                    count: 5,
                    created_at: "2026-05-01T00:00:00.000Z",
                    updated_at: "2026-05-07T00:00:00.000Z",
                  },
                ]
              : [],
          error: null,
        }),
      }),
    }));

    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM feature_usage")) {
        return { count: 2 };
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

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO feature_usage"),
      "user-1:ai_health_insight:2026-05",
      "user-1",
      "ai_health_insight",
      "2026-05",
      5,
      "2026-05-01T00:00:00.000Z",
      "2026-05-07T00:00:00.000Z",
    );
  });
});
