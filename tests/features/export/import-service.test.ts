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

describe('importService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    mockGetDatabase.mockResolvedValue({
      runAsync,
      withTransactionAsync,
      getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
    });

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
    const withTransactionAsync = jest.fn(
      async (callback: () => Promise<void>) => callback(),
    );
    mockGetDatabase.mockResolvedValue({
      runAsync,
      withTransactionAsync,
      getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
    });

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
  });

  it('throws when free user already has 10 plants and import contains active plants', async () => {
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ count: 10 }),
      withTransactionAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue(undefined),
    });

    const payload = makeMinimalPayload({
      plants: [
        { id: 'p-1', name: 'Plant 1', speciesName: 'S1', status: 'active' },
      ],
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload, isPremium: false }),
    ).rejects.toMatchObject({ code: 'PLANT_LIMIT_REACHED' });
  });

  it('allows import when free user is under the limit', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ count: 5 }),
      withTransactionAsync,
      runAsync,
    });

    const payload = makeMinimalPayload({
      plants: [
        { id: 'p-1', name: 'Plant 1', speciesName: 'S1', status: 'active' },
      ],
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload, isPremium: false }),
    ).resolves.not.toThrow();
  });

  it('never blocks a premium user regardless of plant count', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ count: 99 }),
      withTransactionAsync,
      runAsync,
    });

    const payload = makeMinimalPayload({
      plants: Array.from({ length: 20 }, (_, i) => ({
        id: `p-${i}`, name: `Plant ${i}`, speciesName: 'S', status: 'active' as const,
      })),
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload, isPremium: true }),
    ).resolves.not.toThrow();
  });

  it('skips quota check when all imported plants are graveyard status', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ count: 10 }),
      withTransactionAsync,
      runAsync,
    });

    const payload = makeMinimalPayload({
      plants: [
        { id: 'p-1', name: 'Dead Plant', speciesName: 'S1', status: 'graveyard' },
      ],
    });

    await expect(
      restoreCollectionImport({ userId: 'user-1', payload, isPremium: false }),
    ).resolves.not.toThrow();
  });
});
