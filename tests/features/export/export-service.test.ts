const mockGetDatabase = jest.fn();
const mockDirectoryCreate = jest.fn();
const mockFileCreate = jest.fn();
const mockFileWrite = jest.fn();

jest.mock("expo-file-system", () => {
  class MockDirectory {
    uri: string;

    constructor(basePath: string, name: string) {
      this.uri = `${basePath}/${name}`;
    }

    create(options?: unknown) {
      mockDirectoryCreate(options);
    }
  }

  class MockFile {
    uri: string;

    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}/${name}`;
    }

    create(options?: unknown) {
      mockFileCreate(options);
    }

    write(content: string) {
      mockFileWrite(content);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: {
      document: "file://documents",
    },
  };
});

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

describe("export service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("includes structured care log tags in exported payload", async () => {
    const getFirstAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("COUNT(*) AS total FROM plants")) {
        return { total: 1 };
      }
      if (sql.includes("COUNT(*) AS total FROM care_logs")) {
        return { total: 1 };
      }
      if (sql.includes("COUNT(*) AS total FROM photos")) {
        return { total: 0 };
      }
      if (sql.includes("COUNT(*) AS total FROM care_reminders")) {
        return { total: 0 };
      }
      if (sql.includes("COUNT(*) AS total FROM graveyard_plants")) {
        return { total: 0 };
      }
      if (sql.includes("FROM user_preferences")) {
        return null;
      }

      return { total: 0 };
    });
    const getAllAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM plants")) {
        return [
          {
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
            updated_at: "2026-03-20T10:00:00.000Z",
            updated_by: "user-1",
            pending: 0,
            synced_at: "2026-03-20T10:05:00.000Z",
            sync_error: null,
          },
        ];
      }
      if (sql.includes("FROM care_logs")) {
        return [
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
            pending: 0,
            synced_at: "2026-03-24T10:05:00.000Z",
            sync_error: null,
          },
        ];
      }

      return [];
    });

    mockGetDatabase.mockResolvedValue({
      getFirstAsync,
      getAllAsync,
    });

    const {
      exportCollectionData,
    } = require("@/features/export/services/exportService");

    const result = await exportCollectionData({
      id: "user-1",
      email: "test@example.com",
      displayName: "Test User",
      role: "user",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-24T10:00:00.000Z",
    });

    expect(result.summary.careLogs).toBe(1);
    expect(mockFileWrite).toHaveBeenCalledTimes(1);
    expect(mockFileWrite.mock.calls[0]?.[0]).toContain('"tags": [');
    expect(mockFileWrite.mock.calls[0]?.[0]).toContain('"stable condition"');
    expect(mockFileWrite.mock.calls[0]?.[0]).toContain('"new growth"');
  });
});
