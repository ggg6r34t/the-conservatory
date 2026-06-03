jest.mock('@/services/database/sqlite', () => ({
  getDatabase: jest.fn(),
}));
jest.mock('@/features/care-logs/services/careLogTagsService', () => ({
  replaceCareLogTagsInTransaction: jest.fn().mockResolvedValue(undefined),
  serializeCareLogTags: jest.fn().mockReturnValue('[]'),
}));
jest.mock('@/features/plants/services/photoStorageService', () => ({
  downloadRemotePhotoAsset: jest.fn().mockRejectedValue(new Error('no-op')),
}));
jest.mock('@/services/database/syncOutbox', () => ({
  insertSyncOutboxOperationInTransaction: jest.fn().mockResolvedValue(undefined),
}));

import {
  previewCollectionImport,
  restoreCollectionImport,
  validateCollectionImportPayload,
  type CollectionImportPayload,
} from '@/features/export/services/importService';
import { getDatabase } from '@/services/database/sqlite';
import { downloadRemotePhotoAsset } from '@/features/plants/services/photoStorageService';
import { setEntitlementState } from '@/services/entitlementState';

const mockGetDatabase = getDatabase as jest.Mock;
const mockDownloadRemotePhotoAsset = downloadRemotePhotoAsset as jest.Mock;

function makeMinimalPayload(overrides: Partial<CollectionImportPayload> = {}): CollectionImportPayload {
  return {
    exportVersion: 2,
    format: 'json',
    plants: [],
    careLogs: [],
    photos: [],
    reminders: [],
    memorialEntries: [],
    ...overrides,
  } as CollectionImportPayload;
}

function mockImportDatabase(
  overrides: Partial<{
    runAsync: jest.Mock;
    withTransactionAsync: jest.Mock;
    getFirstAsync: jest.Mock;
    getAllAsync: jest.Mock;
  }> = {},
) {
  mockGetDatabase.mockResolvedValue({
    runAsync: overrides.runAsync ?? jest.fn().mockResolvedValue(undefined),
    withTransactionAsync:
      overrides.withTransactionAsync ??
      jest.fn(async (callback: () => Promise<void>) => callback()),
    getFirstAsync: overrides.getFirstAsync ?? jest.fn(),
    getAllAsync:
      overrides.getAllAsync ??
      jest.fn(async () => []),
  });
}

describe('importService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEntitlementState(true);
    mockDownloadRemotePhotoAsset.mockResolvedValue({
      localUri: 'file://documents/photos/user-1/plant-1/progress/photo-1.jpg',
      storagePath: 'user-1/plant-1/photo-1.jpg',
    });
  });

  it('validates exported collection payloads before restore', () => {
    expect(() =>
      validateCollectionImportPayload({
        exportVersion: 1,
        format: 'json',
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

  it('previews record counts for an import', () => {
    expect(
      previewCollectionImport({
        exportVersion: 1,
        format: 'json',
        plants: [{ id: 'plant-1' }],
        careLogs: [{ id: 'log-1' }, { id: 'log-2' }],
        photos: [],
        reminders: [],
        memorialEntries: [{ id: 'memorial-1' }],
      }),
    ).toEqual({
      plants: 1,
      careLogs: 2,
      photos: 0,
      reminders: 0,
      memorialEntries: 1,
    });
  });

  it('restores imported remote photo metadata into durable local storage', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    mockImportDatabase({ runAsync });

    await restoreCollectionImport({
      userId: 'user-1',
      payload: {
        exportVersion: 1,
        format: 'json',
        preferences: null,
        plants: [],
        careLogs: [],
        photos: [
          {
            id: 'photo-1',
            plantId: 'plant-1',
            remoteUrl: 'https://storage.example/user-1/plant-1/photo-1.jpg',
            storagePath: 'user-1/plant-1/photo-1.jpg',
            mimeType: 'image/jpeg',
            photoRole: 'progress',
            caption: 'New leaf',
          },
        ],
        reminders: [],
        memorialEntries: [],
      },
    });

    expect(mockDownloadRemotePhotoAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteUri: 'https://storage.example/user-1/plant-1/photo-1.jpg',
        userId: 'user-1',
        plantId: 'plant-1',
        photoId: 'photo-1',
        role: 'progress',
      }),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO photos'),
      'photo-1',
      'user-1',
      'plant-1',
      'file://documents/photos/user-1/plant-1/progress/photo-1.jpg',
      'https://storage.example/user-1/plant-1/photo-1.jpg',
      'user-1/plant-1/photo-1.jpg',
      'image/jpeg',
      null,
      null,
      'progress',
      expect.any(String),
      null,
      'New leaf',
      0,
      expect.any(String),
      expect.any(String),
      1,
      null,
      null,
    );
  });

  it('does not attempt a remote download for storage paths without a remote URL', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    mockImportDatabase({ runAsync });

    await restoreCollectionImport({
      userId: 'user-1',
      payload: {
        exportVersion: 1,
        format: 'json',
        plants: [],
        careLogs: [],
        photos: [
          {
            id: 'photo-local-metadata',
            plantId: 'plant-1',
            localUri: 'file://legacy/photo.jpg',
            storagePath: 'user-1/plant-1/photo-local-metadata.jpg',
            mimeType: 'image/jpeg',
            photoRole: 'progress',
          },
        ],
        reminders: [],
        memorialEntries: [],
      },
    });

    expect(mockDownloadRemotePhotoAsset).not.toHaveBeenCalled();
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO photos'),
      'photo-local-metadata',
      'user-1',
      'plant-1',
      'file://legacy/photo.jpg',
      null,
      'user-1/plant-1/photo-local-metadata.jpg',
      'image/jpeg',
      null,
      null,
      'progress',
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

describe('validateCollectionImportPayload', () => {
  it('accepts exportVersion 1', () => {
    expect(() =>
      validateCollectionImportPayload(makeMinimalPayload({ exportVersion: 1 })),
    ).not.toThrow();
  });

  it('accepts exportVersion 2', () => {
    expect(() =>
      validateCollectionImportPayload(makeMinimalPayload({ exportVersion: 2 })),
    ).not.toThrow();
  });

  it('rejects unknown exportVersion', () => {
    expect(() =>
      validateCollectionImportPayload(makeMinimalPayload({ exportVersion: 99 as never })),
    ).toThrow();
  });
});

describe('restoreCollectionImport plant quota', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEntitlementState(false);
  });

  it('throws when free user already has 10 plants and import contains active plants', async () => {
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes("FROM plants")) {
          return Array.from({ length: 10 }, (_, index) => ({
            id: `existing-${index}`,
          }));
        }
        return [];
      }),
      withTransactionAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue(undefined),
    });

    const payload = makeMinimalPayload({
      plants: [
        { id: 'p-1', name: 'Plant 1', speciesName: 'S1', status: 'active' },
      ],
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload }),
    ).rejects.toMatchObject({ code: 'PLANT_LIMIT_REACHED' });
  });

  it('allows import when free user is under the limit', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes("FROM plants")) {
          return [{ id: 'existing-1' }, { id: 'existing-2' }];
        }
        if (sql.includes("FROM photos")) {
          return [];
        }
        return [];
      }),
      withTransactionAsync,
      runAsync,
    });

    const payload = makeMinimalPayload({
      plants: [
        { id: 'p-1', name: 'Plant 1', speciesName: 'S1', status: 'active' },
      ],
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload }),
    ).resolves.not.toThrow();
  });

  it('throws when import would exceed the free plant limit', async () => {
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes("FROM plants")) {
          return Array.from({ length: 5 }, (_, index) => ({
            id: `existing-${index}`,
          }));
        }
        return [];
      }),
      withTransactionAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue(undefined),
    });

    const payload = makeMinimalPayload({
      plants: Array.from({ length: 6 }, (_, index) => ({
        id: `import-${index}`,
        name: `Plant ${index}`,
        speciesName: 'S',
        status: 'active' as const,
      })),
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload }),
    ).rejects.toMatchObject({ code: 'PLANT_LIMIT_REACHED' });
  });

  it('throws when import would exceed the free progress photo limit', async () => {
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes("FROM plants")) {
          return [];
        }
        if (sql.includes("FROM photos")) {
          return [];
        }
        return [];
      }),
      withTransactionAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue(undefined),
    });

    const payload = makeMinimalPayload({
      photos: Array.from({ length: 4 }, (_, index) => ({
        id: `photo-${index}`,
        plantId: 'plant-1',
        photoRole: 'progress' as const,
      })),
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload }),
    ).rejects.toMatchObject({ code: 'PHOTO_LIMIT_REACHED' });
  });

  it('throws when existing and imported progress photos exceed the free limit', async () => {
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes("FROM plants")) {
          return [];
        }
        if (sql.includes("FROM photos")) {
          return [
            { id: 'existing-1', plant_id: 'plant-1' },
            { id: 'existing-2', plant_id: 'plant-1' },
          ];
        }
        return [];
      }),
      withTransactionAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue(undefined),
    });

    const payload = makeMinimalPayload({
      photos: [
        { id: 'import-1', plantId: 'plant-1', photoRole: 'progress' as const },
        { id: 'import-2', plantId: 'plant-1', photoRole: 'progress' as const },
      ],
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload }),
    ).rejects.toMatchObject({ code: 'PHOTO_LIMIT_REACHED' });
  });

  it('enforces quotas from entitlement state even when caller context is premium', async () => {
    setEntitlementState(false);
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes("FROM plants")) {
          return [];
        }
        return [];
      }),
      withTransactionAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue(undefined),
    });

    const payload = makeMinimalPayload({
      plants: Array.from({ length: 11 }, (_, index) => ({
        id: `import-${index}`,
        name: `Plant ${index}`,
        speciesName: 'S',
        status: 'active' as const,
      })),
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload }),
    ).rejects.toMatchObject({ code: 'PLANT_LIMIT_REACHED' });
  });

  it('never blocks a premium user regardless of plant count', async () => {
    setEntitlementState(true);
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn().mockResolvedValue([]),
      withTransactionAsync,
      runAsync,
    });

    const payload = makeMinimalPayload({
      plants: Array.from({ length: 20 }, (_, i) => ({
        id: `p-${i}`, name: `Plant ${i}`, speciesName: 'S', status: 'active' as const,
      })),
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload }),
    ).resolves.not.toThrow();
  });

  it('skips quota check when all imported plants are graveyard status', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes("FROM plants")) {
          return Array.from({ length: 10 }, (_, index) => ({
            id: `existing-${index}`,
          }));
        }
        return [];
      }),
      withTransactionAsync,
      runAsync,
    });

    const payload = makeMinimalPayload({
      plants: [
        { id: 'p-1', name: 'Dead Plant', speciesName: 'S1', status: 'graveyard' },
      ],
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload }),
    ).resolves.not.toThrow();
  });
});
