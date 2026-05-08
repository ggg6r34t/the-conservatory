const mockGetDatabase = jest.fn();

jest.mock('@/services/database/sqlite', () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));
jest.mock('@/services/database/syncOutbox', () => ({
  runAtomicMutationWithSyncOutbox: jest.fn(),
  insertSyncOutboxOperationInTransaction: jest.fn(),
}));
jest.mock('@/features/plants/services/photoStorageService', () => ({
  persistPhotoAsset: jest.fn().mockResolvedValue({ localUri: 'file://photo.jpg', storagePath: 'path/photo.jpg' }),
}));

describe('addPlantProgressPhoto service-layer quota', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws PHOTO_LIMIT_REACHED when free user has 3+ progress photos for plant', async () => {
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn()
        // First call: getPlantById check
        .mockResolvedValueOnce({
          id: 'plant-1', user_id: 'user-1', name: 'Monstera', species_name: 'M. deliciosa',
          nickname: null, status: 'active', location: null, watering_interval_days: 7,
          last_watered_at: null, next_water_due_at: null, notes: null,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
          updated_by: null, pending: 0, synced_at: null, sync_error: null,
        })
        // Second call: photo count query (plant_id + user_id params)
        .mockResolvedValueOnce({ count: 3 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
    });

    const { addPlantProgressPhoto } = require('@/features/plants/api/plantsClient');

    await expect(
      addPlantProgressPhoto({
        userId: 'user-1',
        plantId: 'plant-1',
        photoUri: 'file://new.jpg',
        isPremium: false,
      }),
    ).rejects.toMatchObject({ code: 'PHOTO_LIMIT_REACHED' });
  });

  it('allows upload when free user has fewer than 3 progress photos', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce({
          id: 'plant-1', user_id: 'user-1', name: 'Monstera', species_name: 'M. deliciosa',
          nickname: null, status: 'active', location: null, watering_interval_days: 7,
          last_watered_at: null, next_water_due_at: null, notes: null,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
          updated_by: null, pending: 0, synced_at: null, sync_error: null,
        })
        .mockResolvedValueOnce({ count: 2 })
        .mockResolvedValue(null),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync,
      withTransactionAsync,
    });

    const { runAtomicMutationWithSyncOutbox } = require('@/services/database/syncOutbox');
    (runAtomicMutationWithSyncOutbox as jest.Mock).mockImplementation(
      async (_db: unknown, opts: { perform: (iso: string) => Promise<unknown> }) => {
        return opts.perform('2026-05-08T00:00:00.000Z');
      },
    );

    const { addPlantProgressPhoto } = require('@/features/plants/api/plantsClient');
    await expect(
      addPlantProgressPhoto({
        userId: 'user-1',
        plantId: 'plant-1',
        photoUri: 'file://new.jpg',
        isPremium: false,
      }),
    ).resolves.not.toThrow();
  });

  it('never blocks a premium user regardless of photo count', async () => {
    const getFirstAsync = jest.fn()
      .mockResolvedValueOnce({
        id: 'plant-1', user_id: 'user-1', name: 'Monstera', species_name: 'M. deliciosa',
        nickname: null, status: 'active', location: null, watering_interval_days: 7,
        last_watered_at: null, next_water_due_at: null, notes: null,
        created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
        updated_by: null, pending: 0, synced_at: null, sync_error: null,
      });
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => cb());
    mockGetDatabase.mockResolvedValue({
      getFirstAsync,
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync,
      withTransactionAsync,
    });

    const { runAtomicMutationWithSyncOutbox } = require('@/services/database/syncOutbox');
    (runAtomicMutationWithSyncOutbox as jest.Mock).mockImplementation(
      async (_db: unknown, opts: { perform: (iso: string) => Promise<unknown> }) => {
        return opts.perform('2026-05-08T00:00:00.000Z');
      },
    );

    const { addPlantProgressPhoto } = require('@/features/plants/api/plantsClient');
    await expect(
      addPlantProgressPhoto({
        userId: 'user-1',
        plantId: 'plant-1',
        photoUri: 'file://new.jpg',
        isPremium: true,
      }),
    ).resolves.not.toThrow();

    // Premium users bypass the quota SQL: getFirstAsync is called twice (initial plant
    // lookup + final getPlantById return), never a third time for the photo count query.
    expect(getFirstAsync).toHaveBeenCalledTimes(2);
  });
});
