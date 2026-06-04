import { resolvePhotoDisplayUri } from "@/features/plants/services/plantPhotoResolver";

const mockGetDatabase = jest.fn();
const mockGetStorageAssetUrl = jest.fn();
const mockManagedPhotoFileExists = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/services/supabase/storage", () => ({
  getStorageAssetUrl: (...args: unknown[]) => mockGetStorageAssetUrl(...args),
}));

jest.mock("@/features/plants/services/photoStorageService", () => ({
  managedPhotoFileExists: (...args: unknown[]) =>
    mockManagedPhotoFileExists(...args),
  persistPhotoAsset: jest.fn(),
}));

jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: jest.fn().mockResolvedValue({ remindersEnabled: true }),
}));

describe("listPlants photo hydration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManagedPhotoFileExists.mockResolvedValue(true);
    mockGetStorageAssetUrl.mockResolvedValue(
      "https://storage.example.com/fresh-signed.jpg",
    );
  });

  it("uses a fresh storage URL when the plant only has cloud metadata", async () => {
    mockManagedPhotoFileExists.mockResolvedValue(false);

    const getAllAsync = jest.fn(async (sql: string) => {
      if (sql.includes("FROM plants")) {
        return [
          {
            id: "plant-1",
            user_id: "user-1",
            name: "Monstera",
            species_name: "Monstera deliciosa",
            nickname: null,
            status: "active",
            location: null,
            watering_interval_days: 7,
            last_watered_at: "2026-03-20T08:00:00.000Z",
            next_water_due_at: "2026-03-27T08:00:00.000Z",
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

      if (sql.includes("FROM photos")) {
        return [
          {
            id: "photo-1",
            user_id: "user-1",
            plant_id: "plant-1",
            local_uri: "file:///missing-managed.jpg",
            remote_url: "https://storage.example.com/expired-signed.jpg",
            storage_path: "user-1/plant-1/photo-1.jpg",
            mime_type: "image/jpeg",
            width: null,
            height: null,
            photo_role: "primary",
            captured_at: "2026-03-01T10:00:00.000Z",
            taken_at: null,
            caption: null,
            is_primary: 1,
            created_at: "2026-03-01T10:00:00.000Z",
            updated_at: "2026-03-01T10:00:00.000Z",
            pending: 0,
            synced_at: null,
            sync_error: null,
          },
        ];
      }

      return [];
    });

    mockGetDatabase.mockResolvedValue({ getAllAsync });

    const { listPlants } = require("@/features/plants/api/plantsClient");
    const result = await listPlants({
      userId: "user-1",
      filter: "all",
      sort: "recent",
      query: "",
    });

    expect(mockGetStorageAssetUrl).toHaveBeenCalledWith("user-1/plant-1/photo-1.jpg");
    expect(result).toHaveLength(1);
    expect(result[0]?.primaryPhotoUri).toBe(
      "https://storage.example.com/fresh-signed.jpg",
    );
  });

  it("does not request a signed URL when a managed local file is present", async () => {
    mockManagedPhotoFileExists.mockResolvedValue(true);

    const getAllAsync = jest.fn(async (sql: string) => {
      if (sql.includes("FROM plants")) {
        return [
          {
            id: "plant-1",
            user_id: "user-1",
            name: "Monstera",
            species_name: "Monstera deliciosa",
            nickname: null,
            status: "active",
            location: null,
            watering_interval_days: 7,
            last_watered_at: "2026-03-20T08:00:00.000Z",
            next_water_due_at: "2026-03-27T08:00:00.000Z",
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

      if (sql.includes("FROM photos")) {
        return [
          {
            id: "photo-1",
            user_id: "user-1",
            plant_id: "plant-1",
            local_uri: "file://documents/photos/user-1/plant-1/primary/photo-1.jpg",
            remote_url: "https://storage.example.com/cached.jpg",
            storage_path: "user-1/plant-1/photo-1.jpg",
            mime_type: "image/jpeg",
            width: null,
            height: null,
            photo_role: "primary",
            captured_at: "2026-03-01T10:00:00.000Z",
            taken_at: null,
            caption: null,
            is_primary: 1,
            created_at: "2026-03-01T10:00:00.000Z",
            updated_at: "2026-03-01T10:00:00.000Z",
            pending: 0,
            synced_at: null,
            sync_error: null,
          },
        ];
      }

      return [];
    });

    mockGetDatabase.mockResolvedValue({ getAllAsync });

    const { listPlants } = require("@/features/plants/api/plantsClient");
    const result = await listPlants({
      userId: "user-1",
      filter: "all",
      sort: "recent",
      query: "",
    });

    expect(mockGetStorageAssetUrl).not.toHaveBeenCalled();
    expect(result[0]?.primaryPhotoUri).toBe(
      "file://documents/photos/user-1/plant-1/primary/photo-1.jpg",
    );
  });

  it("hydrates getPlantById photos the same way as listPlants", async () => {
    mockManagedPhotoFileExists.mockResolvedValue(false);
    mockGetStorageAssetUrl.mockResolvedValue(
      "https://storage.example.com/detail-signed.jpg",
    );

    const getFirstAsync = jest.fn().mockResolvedValue({
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
      created_at: "2026-03-01T10:00:00.000Z",
      updated_at: "2026-03-01T10:00:00.000Z",
      updated_by: "user-1",
      pending: 0,
      synced_at: null,
      sync_error: null,
    });

    const getAllAsync = jest.fn(async (sql: string) => {
      if (sql.includes("FROM photos")) {
        return [
          {
            id: "photo-1",
            user_id: "user-1",
            plant_id: "plant-1",
            local_uri: "file:///missing.jpg",
            remote_url: null,
            storage_path: "user-1/plant-1/photo-1.jpg",
            mime_type: "image/jpeg",
            width: null,
            height: null,
            photo_role: "primary",
            captured_at: "2026-03-01T10:00:00.000Z",
            taken_at: null,
            caption: null,
            is_primary: 1,
            created_at: "2026-03-01T10:00:00.000Z",
            updated_at: "2026-03-01T10:00:00.000Z",
            pending: 0,
            synced_at: null,
            sync_error: null,
          },
        ];
      }

      return [];
    });

    mockGetDatabase.mockResolvedValue({ getFirstAsync, getAllAsync });

    const { getPlantById } = require("@/features/plants/api/plantsClient");
    const result = await getPlantById("user-1", "plant-1");

    expect(result?.photos[0]?.remoteUrl).toBe(
      "https://storage.example.com/detail-signed.jpg",
    );
    expect(resolvePhotoDisplayUri(result?.photos[0], { context: "detail" })).toBe(
      "https://storage.example.com/detail-signed.jpg",
    );
  });

  it("hydrates graveyard memorial photos when only a stale remote URL exists", async () => {
    mockManagedPhotoFileExists.mockResolvedValue(false);
    mockGetStorageAssetUrl.mockResolvedValue(
      "https://storage.example.com/graveyard-signed.jpg",
    );

    const getAllAsync = jest.fn(async (sql: string) => {
      if (sql.includes("FROM graveyard_plants")) {
        return [
          {
            id: "graveyard-1",
            user_id: "user-1",
            plant_id: "plant-1",
            cause_of_passing: null,
            memorial_note: "Remembered.",
            archived_at: "2026-03-10T10:00:00.000Z",
            created_at: "2026-03-01T10:00:00.000Z",
            updated_at: "2026-03-10T10:00:00.000Z",
            updated_by: "user-1",
            pending: 0,
            synced_at: null,
            sync_error: null,
            name: "Aster",
            species_name: "Monstera deliciosa",
            nickname: null,
            notes: null,
          },
        ];
      }

      if (sql.includes("FROM photos")) {
        return [
          {
            id: "photo-1",
            user_id: "user-1",
            plant_id: "plant-1",
            local_uri: "file://cache/temporary.jpg",
            remote_url: "https://storage.example.com/expired-signed.jpg",
            storage_path: "user-1/plant-1/photo-1.jpg",
            mime_type: "image/jpeg",
            width: null,
            height: null,
            photo_role: "primary",
            captured_at: "2026-03-01T10:00:00.000Z",
            taken_at: null,
            caption: null,
            is_primary: 1,
            created_at: "2026-03-01T10:00:00.000Z",
            updated_at: "2026-03-01T10:00:00.000Z",
            pending: 0,
            synced_at: null,
            sync_error: null,
          },
        ];
      }

      return [];
    });

    mockGetDatabase.mockResolvedValue({ getAllAsync });

    const { listGraveyardPlants } = require("@/features/plants/api/plantsClient");
    const result = await listGraveyardPlants("user-1");

    expect(mockGetStorageAssetUrl).toHaveBeenCalledWith("user-1/plant-1/photo-1.jpg");
    expect(result[0]?.primaryPhotoUri).toBe(
      "https://storage.example.com/graveyard-signed.jpg",
    );
  });
});
