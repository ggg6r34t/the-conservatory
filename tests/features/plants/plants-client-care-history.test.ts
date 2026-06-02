const mockGetDatabase = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/features/plants/services/photoStorageService", () => ({
  hydratePhotosForDisplay: jest.fn(async (photos: unknown[]) => photos),
}));

import { getPlantById } from "@/features/plants/api/plantsClient";

describe("getPlantById care log history window", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("limits care logs to the requested history window", async () => {
    const getAllAsync = jest.fn(async (sql: string) => {
      if (sql.includes("FROM care_logs")) {
        return [
          {
            id: "log-recent",
            user_id: "user-1",
            plant_id: "plant-1",
            log_type: "water",
            current_condition: null,
            notes: "Recent",
            logged_at: "2026-05-01T10:00:00.000Z",
            created_at: "2026-05-01T10:00:00.000Z",
            updated_at: "2026-05-01T10:00:00.000Z",
            updated_by: null,
            pending: 0,
            synced_at: null,
            sync_error: null,
          },
        ];
      }

      if (sql.includes("FROM photos")) {
        return [];
      }

      if (sql.includes("FROM care_reminders")) {
        return [];
      }

      return [];
    });

    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({
        id: "plant-1",
        user_id: "user-1",
        name: "Monstera",
        species_name: "Monstera deliciosa",
        nickname: null,
        status: "active",
        location: null,
        watering_interval_days: 7,
        last_watered_at: null,
        next_water_due_at: null,
        notes: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        updated_by: null,
        pending: 0,
        synced_at: null,
        sync_error: null,
      }),
      getAllAsync,
    });

    await getPlantById("user-1", "plant-1", {
      careLogSinceLoggedAt: "2026-03-01T00:00:00.000Z",
    });

    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("logged_at >= ?"),
      "plant-1",
      "2026-03-01T00:00:00.000Z",
    );
  });
});
