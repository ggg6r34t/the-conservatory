const mockCopy = jest.fn();
const mockDelete = jest.fn();
const mockInfo = jest.fn();
const mockDirectoryCreate = jest.fn();
const mockDownloadFileAsync = jest.fn();

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
    static downloadFileAsync = mockDownloadFileAsync;

    constructor(directory: { uri: string } | string, name?: string) {
      this.uri =
        typeof directory === "string"
          ? directory
          : `${directory.uri}/${name ?? ""}`;
    }

    async copy(destination: { uri: string }) {
      await mockCopy(destination.uri);
    }

    async delete() {
      await mockDelete(this.uri);
    }

    async info() {
      return mockInfo(this.uri);
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

describe("photo storage service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInfo.mockResolvedValue({ exists: true });
  });

  it("copies picked photos into deterministic app-owned storage", async () => {
    const {
      persistPhotoAsset,
    } = require("@/features/plants/services/photoStorageService");

    const result = await persistPhotoAsset({
      sourceUri: "file://cache/Image 123.JPG?token=temporary",
      userId: "user-1",
      plantId: "plant-1",
      photoId: "photo-1",
      role: "progress",
      mimeType: "image/jpeg",
    });

    expect(mockDirectoryCreate).toHaveBeenCalledWith({
      idempotent: true,
      intermediates: true,
    });
    expect(result.localUri).toBe(
      "file://documents/photos/user-1/plant-1/progress/photo-1.jpg",
    );
    expect(result.storagePath).toBe("user-1/plant-1/photo-1.jpg");
    expect(mockCopy).toHaveBeenCalledWith(result.localUri);
  });

  it("does not recopy photos that are already managed by the app", async () => {
    const {
      isManagedPhotoUri,
      persistPhotoAsset,
    } = require("@/features/plants/services/photoStorageService");
    const managedUri =
      "file://documents/photos/user-1/plant-1/primary/photo-1.jpg";

    const result = await persistPhotoAsset({
      sourceUri: managedUri,
      userId: "user-1",
      plantId: "plant-1",
      photoId: "photo-1",
      role: "primary",
      mimeType: "image/jpeg",
    });

    expect(isManagedPhotoUri(managedUri)).toBe(true);
    expect(result.localUri).toBe(managedUri);
    expect(mockCopy).not.toHaveBeenCalled();
  });

  it("reports unmanaged legacy temp photo URIs for migration", async () => {
    const {
      isManagedPhotoUri,
    } = require("@/features/plants/services/photoStorageService");

    expect(isManagedPhotoUri("file://cache/temporary.jpg")).toBe(false);
  });

  it("downloads hydrated remote photos into app-owned storage", async () => {
    mockInfo.mockResolvedValueOnce({ exists: false });
    mockInfo.mockResolvedValueOnce({ exists: true });
    mockDownloadFileAsync.mockResolvedValue({
      uri: "file://documents/photos/user-1/plant-1/progress/photo-1.jpg",
    });
    const {
      downloadRemotePhotoAsset,
    } = require("@/features/plants/services/photoStorageService");

    const result = await downloadRemotePhotoAsset({
      remoteUri: "https://storage.example/photo-1.jpg",
      userId: "user-1",
      plantId: "plant-1",
      photoId: "photo-1",
      role: "progress",
      mimeType: "image/jpeg",
    });

    expect(mockDownloadFileAsync).toHaveBeenCalledWith(
      "https://storage.example/photo-1.jpg",
      expect.objectContaining({
        uri: "file://documents/photos/user-1/plant-1/progress/photo-1.jpg",
      }),
      expect.objectContaining({ idempotent: true }),
    );
    expect(result.localUri).toBe(
      "file://documents/photos/user-1/plant-1/progress/photo-1.jpg",
    );
    expect(result.storagePath).toBe("user-1/plant-1/photo-1.jpg");
  });
});
