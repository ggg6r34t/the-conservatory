const mockGetDatabase = jest.fn();
const mockManagedPhotoFileExists = jest.fn();
const mockPersistPhotoAsset = jest.fn();
const mockDownloadRemotePhotoAsset = jest.fn();
const mockGetStorageAssetUrl = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/features/plants/services/photoStorageService", () => ({
  isManagedPhotoUri: (uri: string) => uri.includes("/photos/"),
  managedPhotoFileExists: (...args: unknown[]) =>
    mockManagedPhotoFileExists(...args),
  persistPhotoAsset: (...args: unknown[]) => mockPersistPhotoAsset(...args),
  downloadRemotePhotoAsset: (...args: unknown[]) =>
    mockDownloadRemotePhotoAsset(...args),
}));

jest.mock("@/services/supabase/storage", () => ({
  getStorageAssetUrl: (...args: unknown[]) => mockGetStorageAssetUrl(...args),
  normalizeStoragePath: (value: string | null) => value,
}));

describe("repairLocalPhotoRecords", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManagedPhotoFileExists.mockResolvedValue(false);
    mockGetStorageAssetUrl.mockResolvedValue(
      "https://storage.example.com/signed.jpg",
    );
    mockDownloadRemotePhotoAsset.mockResolvedValue({
      localUri: "file://documents/photos/user-1/plant-1/primary/photo-1.jpg",
      storagePath: "user-1/plant-1/photo-1.jpg",
    });
  });

  it("clears missing managed locals and restores from cloud storage", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    mockGetDatabase.mockResolvedValue({
      getAllAsync: jest.fn().mockResolvedValue([
        {
          id: "photo-1",
          user_id: "user-1",
          plant_id: "plant-1",
          local_uri: "file://documents/photos/user-1/plant-1/primary/photo-1.jpg",
          remote_url: null,
          storage_path: "user-1/plant-1/photo-1.jpg",
          mime_type: "image/jpeg",
          photo_role: "primary",
          is_primary: 1,
        },
      ]),
      runAsync,
    });

    const { repairLocalPhotoRecords } = require("@/services/database/photoRepair");
    await repairLocalPhotoRecords("user-1");

    expect(mockDownloadRemotePhotoAsset).toHaveBeenCalled();
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE photos"),
      "file://documents/photos/user-1/plant-1/primary/photo-1.jpg",
      "user-1/plant-1/photo-1.jpg",
      "https://storage.example.com/signed.jpg",
      "image/jpeg",
      null,
      expect.any(String),
      "photo-1",
    );
  });
});
