const mockGetDatabase = jest.fn();
const mockDirectoryCreate = jest.fn();
const mockFileCreate = jest.fn();
const mockFileWrite = jest.fn();

import { setEntitlementState } from "@/services/entitlementState";

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
    setEntitlementState(false);
  });

  it("includes structured care log tags in exported payload", async () => {
    setEntitlementState(true);
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

  it("writes a basic export without premium-only sections for free users", async () => {
    const getFirstAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("COUNT(*) AS total FROM plants")) return { total: 1 };
      if (sql.includes("COUNT(*) AS total FROM care_logs")) return { total: 1 };
      if (sql.includes("COUNT(*) AS total FROM photos")) return { total: 1 };
      if (sql.includes("COUNT(*) AS total FROM care_reminders")) return { total: 0 };
      if (sql.includes("COUNT(*) AS total FROM graveyard_plants")) {
        return { total: 0 };
      }
      if (sql.includes("FROM user_preferences")) return null;
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
            last_watered_at: null,
            next_water_due_at: null,
            notes: null,
            created_at: "2026-03-01T10:00:00.000Z",
            updated_at: "2026-03-20T10:00:00.000Z",
            updated_by: "user-1",
            pending: 0,
            synced_at: null,
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
            synced_at: null,
            sync_error: null,
          },
        ];
      }
      if (sql.includes("FROM photos")) {
        return [
          {
            id: "photo-1",
            user_id: "user-1",
            plant_id: "plant-1",
            local_uri: "file://local/photo.jpg",
            remote_url: "https://storage.example/photo.jpg",
            storage_path: "user-1/photo.jpg",
            mime_type: "image/jpeg",
            width: 1200,
            height: 800,
            photo_role: "progress",
            captured_at: null,
            taken_at: null,
            caption: null,
            is_primary: 0,
            created_at: "2026-03-24T10:00:00.000Z",
            updated_at: "2026-03-24T10:00:00.000Z",
            pending: 0,
            synced_at: null,
            sync_error: null,
          },
        ];
      }
      if (sql.includes("FROM specimen_tags")) return [{ id: "tag-1" }];
      if (sql.includes("FROM archive_curation_overrides")) {
        return [{ id: "archive-1" }];
      }
      if (sql.includes("FROM plant_status_snapshots")) {
        return [{ id: "snapshot-1" }];
      }
      return [];
    });
    mockGetDatabase.mockResolvedValue({ getFirstAsync, getAllAsync });

    const {
      exportCollectionData,
    } = require("@/features/export/services/exportService");

    await exportCollectionData(
      {
        id: "user-1",
        email: "test@example.com",
        displayName: "Test User",
        role: "user",
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-24T10:00:00.000Z",
      },
      { mode: "basic" },
    );

    const payload = JSON.parse(mockFileWrite.mock.calls[0]?.[0]);
    expect(payload.exportMode).toBe("basic");
    expect(payload.includes).toEqual(
      expect.objectContaining({
        photos: "count-only",
        premiumSections: false,
        careLogHistoryLimitDays: 60,
      }),
    );
    expect(payload.photos).toEqual([]);
    expect(payload.careLogs[0].tags).toBeNull();
    expect(payload.specimenTags).toEqual([]);
    expect(payload.statusSnapshots).toEqual([]);
    expect(payload.archiveCurationOverrides).toEqual([]);
  });

  it("rejects premium export mode for free users before touching storage", async () => {
    const {
      exportCollectionData,
    } = require("@/features/export/services/exportService");

    await expect(
      exportCollectionData(
        {
          id: "user-1",
          email: "test@example.com",
          displayName: "Test User",
          role: "user",
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-24T10:00:00.000Z",
        },
        { mode: "premium" },
      ),
    ).rejects.toThrow(/premium/i);
    expect(mockGetDatabase).not.toHaveBeenCalled();
  });

  it("limits basic export care logs to the free history window at query time", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-02T12:00:00.000Z"));

    const getFirstAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("COUNT(*) AS total FROM plants")) return { total: 1 };
      if (sql.includes("COUNT(*) AS total FROM care_logs")) return { total: 0 };
      if (sql.includes("COUNT(*) AS total FROM photos")) return { total: 0 };
      if (sql.includes("COUNT(*) AS total FROM care_reminders")) return { total: 0 };
      if (sql.includes("COUNT(*) AS total FROM graveyard_plants")) {
        return { total: 0 };
      }
      if (sql.includes("FROM user_preferences")) return null;
      return { total: 0 };
    });
    const getAllAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM care_logs") && sql.includes("logged_at >=")) {
        return [];
      }
      if (sql.includes("FROM plants")) {
        return [
          {
            id: "plant-1",
            user_id: "user-1",
            name: "Aster",
            species_name: null,
            nickname: null,
            status: "active",
            location: null,
            watering_interval_days: 7,
            last_watered_at: null,
            next_water_due_at: null,
            notes: null,
            created_at: "2026-03-01T10:00:00.000Z",
            updated_at: "2026-03-20T10:00:00.000Z",
            updated_by: "user-1",
            pending: 0,
            synced_at: null,
            sync_error: null,
          },
        ];
      }
      return [];
    });
    mockGetDatabase.mockResolvedValue({ getFirstAsync, getAllAsync });

    const {
      exportCollectionData,
    } = require("@/features/export/services/exportService");

    const result = await exportCollectionData(
      {
        id: "user-1",
        email: "test@example.com",
        displayName: "Test User",
        role: "user",
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-24T10:00:00.000Z",
      },
      { mode: "basic" },
    );

    expect(result.summary.careLogs).toBe(0);

    const careLogQueries = getAllAsync.mock.calls
      .map(([sql]) => sql as string)
      .filter((sql) => sql.includes("FROM care_logs"));
    expect(careLogQueries.some((sql) => sql.includes("logged_at >="))).toBe(
      true,
    );

    jest.useRealTimers();
  });
});
