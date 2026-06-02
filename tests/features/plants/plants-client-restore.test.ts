const mockGetDatabase = jest.fn();
const mockRunAtomicMutationWithSyncOutbox = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/services/database/syncOutbox", () => ({
  runAtomicMutationWithSyncOutbox: (...args: unknown[]) =>
    mockRunAtomicMutationWithSyncOutbox(...args),
}));

jest.mock("@/features/plants/services/photoStorageService", () => ({
  hydratePhotosForDisplay: jest.fn(async (photos: unknown[]) => photos),
}));

import { restorePlantFromGraveyard } from "@/features/plants/api/plantsClient";

const graveyardPlantRow = {
  id: "plant-1",
  user_id: "user-1",
  name: "Monstera",
  species_name: "Monstera deliciosa",
  nickname: null,
  status: "graveyard",
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
};

describe("restorePlantFromGraveyard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunAtomicMutationWithSyncOutbox.mockImplementation(
      async (
        _db: unknown,
        input: { perform: (nowIso: string) => Promise<unknown> },
      ) => {
        await input.perform("2026-06-02T12:00:00.000Z");
        return "plant-1";
      },
    );
  });

  it("restores an archived plant and removes the memorial row", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce(graveyardPlantRow)
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ id: "graveyard-1" });

    mockGetDatabase.mockResolvedValue({
      runAsync,
      getFirstAsync,
      getAllAsync: jest.fn().mockResolvedValue([]),
    });

    const plantId = await restorePlantFromGraveyard({
      userId: "user-1",
      plantId: "plant-1",
      isPremium: false,
    });

    expect(plantId).toBe("plant-1");
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'active'"),
      expect.any(String),
      "user-1",
      "plant-1",
      "user-1",
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM graveyard_plants"),
      "graveyard-1",
      "user-1",
    );
  });

  it("rejects restore when the free active plant limit is reached", async () => {
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest
        .fn()
        .mockResolvedValueOnce(graveyardPlantRow)
        .mockResolvedValueOnce({ count: 10 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn(),
    });

    await expect(
      restorePlantFromGraveyard({
        userId: "user-1",
        plantId: "plant-1",
        isPremium: false,
      }),
    ).rejects.toMatchObject({ code: "PLANT_LIMIT_REACHED" });
    expect(mockRunAtomicMutationWithSyncOutbox).not.toHaveBeenCalled();
  });
});
