const mockGetDatabase = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/features/plants/services/photoStorageService", () => ({
  hydratePhotosForDisplay: jest.fn(async (photos: unknown[]) => photos),
}));

import { listPlants } from "@/features/plants/api/plantsClient";

describe("listPlants advanced library filters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sorts premium by-species results for grouped display", async () => {
    mockGetDatabase.mockResolvedValue({
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes("FROM plants")) {
          return [
            {
              id: "plant-b",
              user_id: "user-1",
              name: "Beta",
              species_name: "Monstera deliciosa",
              nickname: null,
              status: "active",
              location: "Kitchen",
              watering_interval_days: 7,
              last_watered_at: null,
              next_water_due_at: null,
              notes: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-02T00:00:00.000Z",
              updated_by: null,
              pending: 0,
              synced_at: null,
              sync_error: null,
            },
            {
              id: "plant-a",
              user_id: "user-1",
              name: "Alpha",
              species_name: "Ficus lyrata",
              nickname: null,
              status: "active",
              location: "Office",
              watering_interval_days: 7,
              last_watered_at: null,
              next_water_due_at: null,
              notes: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-03T00:00:00.000Z",
              updated_by: null,
              pending: 0,
              synced_at: null,
              sync_error: null,
            },
          ];
        }

        return [];
      }),
    });

    const plants = await listPlants({
      userId: "user-1",
      filter: "by-species",
      sort: "recent",
      query: "",
      isPremium: true,
    });

    expect(plants.map((plant) => plant.name)).toEqual(["Alpha", "Beta"]);
  });

  it("downgrades premium filters to all for free users at the service layer", async () => {
    mockGetDatabase.mockResolvedValue({
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes("FROM plants")) {
          return [
            {
              id: "plant-b",
              user_id: "user-1",
              name: "Beta",
              species_name: "Monstera deliciosa",
              nickname: null,
              status: "active",
              location: "Kitchen",
              watering_interval_days: 7,
              last_watered_at: null,
              next_water_due_at: null,
              notes: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-02T00:00:00.000Z",
              updated_by: null,
              pending: 0,
              synced_at: null,
              sync_error: null,
            },
            {
              id: "plant-a",
              user_id: "user-1",
              name: "Alpha",
              species_name: "Ficus lyrata",
              nickname: null,
              status: "active",
              location: "Office",
              watering_interval_days: 7,
              last_watered_at: null,
              next_water_due_at: null,
              notes: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-03T00:00:00.000Z",
              updated_by: null,
              pending: 0,
              synced_at: null,
              sync_error: null,
            },
          ];
        }

        return [];
      }),
    });

    const plants = await listPlants({
      userId: "user-1",
      filter: "by-species",
      sort: "recent",
      query: "",
      isPremium: false,
    });

    expect(plants.map((plant) => plant.name)).toEqual(["Alpha", "Beta"]);
  });
});
