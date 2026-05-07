import {
  previewCollectionImport,
  restoreCollectionImport,
  validateCollectionImportPayload,
} from "@/features/export/services/importService";

const mockGetDatabase = jest.fn();
const mockDownloadRemotePhotoAsset = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/features/plants/services/photoStorageService", () => ({
  downloadRemotePhotoAsset: (...args: unknown[]) =>
    mockDownloadRemotePhotoAsset(...args),
}));

describe("importService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDownloadRemotePhotoAsset.mockResolvedValue({
      localUri: "file://documents/photos/user-1/plant-1/progress/photo-1.jpg",
      storagePath: "user-1/plant-1/photo-1.jpg",
    });
  });

  it("validates exported collection payloads before restore", () => {
    expect(() =>
      validateCollectionImportPayload({
        exportVersion: 1,
        format: "json",
        plants: [],
        careLogs: [],
        photos: [],
        reminders: [],
        memorialEntries: [],
      }),
    ).not.toThrow();

    expect(() => validateCollectionImportPayload({ plants: [] })).toThrow(
      /not a Conservatory export/i,
    );
  });

  it("previews record counts for an import", () => {
    expect(
      previewCollectionImport({
        exportVersion: 1,
        format: "json",
        plants: [{ id: "plant-1" }],
        careLogs: [{ id: "log-1" }, { id: "log-2" }],
        photos: [],
        reminders: [],
        memorialEntries: [{ id: "memorial-1" }],
      }),
    ).toEqual({
      plants: 1,
      careLogs: 2,
      photos: 0,
      reminders: 0,
      memorialEntries: 1,
    });
  });

  it("restores imported remote photo metadata into durable local storage", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    mockGetDatabase.mockResolvedValue({
      runAsync,
      withTransactionAsync,
    });

    await restoreCollectionImport({
      userId: "user-1",
      payload: {
        exportVersion: 1,
        format: "json",
        preferences: null,
        plants: [],
        careLogs: [],
        photos: [
          {
            id: "photo-1",
            plantId: "plant-1",
            remoteUrl: "https://storage.example/user-1/plant-1/photo-1.jpg",
            storagePath: "user-1/plant-1/photo-1.jpg",
            mimeType: "image/jpeg",
            photoRole: "progress",
            caption: "New leaf",
          },
        ],
        reminders: [],
        memorialEntries: [],
      },
    });

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
      "user-1",
      "plant-1",
      "file://documents/photos/user-1/plant-1/progress/photo-1.jpg",
      "https://storage.example/user-1/plant-1/photo-1.jpg",
      "user-1/plant-1/photo-1.jpg",
      "image/jpeg",
      null,
      null,
      "progress",
      expect.any(String),
      null,
      "New leaf",
      0,
      expect.any(String),
      expect.any(String),
      1,
      null,
      null,
    );
  });

  it("does not attempt a remote download for storage paths without a remote URL", async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    mockGetDatabase.mockResolvedValue({
      runAsync,
      withTransactionAsync,
    });

    await restoreCollectionImport({
      userId: "user-1",
      payload: {
        exportVersion: 1,
        format: "json",
        plants: [],
        careLogs: [],
        photos: [
          {
            id: "photo-local-metadata",
            plantId: "plant-1",
            localUri: "file://legacy/photo.jpg",
            storagePath: "user-1/plant-1/photo-local-metadata.jpg",
            mimeType: "image/jpeg",
            photoRole: "progress",
          },
        ],
        reminders: [],
        memorialEntries: [],
      },
    });

    expect(mockDownloadRemotePhotoAsset).not.toHaveBeenCalled();
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO photos"),
      "photo-local-metadata",
      "user-1",
      "plant-1",
      "file://legacy/photo.jpg",
      null,
      "user-1/plant-1/photo-local-metadata.jpg",
      "image/jpeg",
      null,
      null,
      "progress",
      expect.any(String),
      null,
      null,
      0,
      expect.any(String),
      expect.any(String),
      1,
      null,
      null,
    );
  });
});
