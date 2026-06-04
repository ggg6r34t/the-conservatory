jest.mock("@/config/supabase", () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
    storage: {
      from: jest.fn(),
    },
  },
}));

jest.mock("@/services/database/syncAuthGuard", () => ({
  assertSyncItemMatchesAuthenticatedUser: jest.fn().mockResolvedValue("user-1"),
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: jest.fn(),
}));

jest.mock("@/services/entitlementState", () => ({
  getEntitlementState: jest.fn(() => true),
}));

const REMOTE_PLANT_UUID = "550e8400-e29b-41d4-a716-446655440000";

function createClientIdWriteMock(options?: {
  existingRemoteId?: string | null;
  returnedId?: string;
}) {
  const existingRemoteId = options?.existingRemoteId ?? null;
  const returnedId = options?.returnedId ?? REMOTE_PLANT_UUID;

  const lookupMaybeSingle = jest.fn().mockResolvedValue({
    data: existingRemoteId ? { id: existingRemoteId } : null,
    error: null,
  });
  const chainEnd = { maybeSingle: lookupMaybeSingle };
  const eqSecond = jest.fn().mockReturnValue(chainEnd);
  const eqFirst = jest.fn().mockReturnValue({ eq: eqSecond });

  const single = jest.fn().mockResolvedValue({
    data: { id: returnedId },
    error: null,
  });
  const selectAfterWrite = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select: selectAfterWrite });
  const update = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({ select: selectAfterWrite }),
  });
  const select = jest.fn().mockReturnValue({ eq: eqFirst });

  return { select, insert, update, eqFirst, eqSecond, lookupMaybeSingle };
}

function applyClientIdWriteMock(
  writeMock: ReturnType<typeof createClientIdWriteMock>,
  extra: Record<string, unknown> = {},
) {
  const from = require("@/config/supabase").supabase.from as jest.Mock;
  from.mockReturnValue({
    select: writeMock.select,
    insert: writeMock.insert,
    update: writeMock.update,
    ...extra,
  });
  return from;
}

function createGetFirstAsyncMock(row: Record<string, unknown>) {
  return jest.fn().mockImplementation((sql: string) => {
    if (sql.includes("remote_id") && sql.includes("plants")) {
      return Promise.resolve({ remote_id: REMOTE_PLANT_UUID });
    }
    return Promise.resolve(row);
  });
}

describe("supabase sync adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (require("@/services/entitlementState").getEntitlementState as jest.Mock).mockReturnValue(true);
  });

  it("should upsert plant rows and mark local sync state", async () => {
    const writeMock = createClientIdWriteMock();
    const from = applyClientIdWriteMock(writeMock);

    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "plant-1",
      user_id: "user-1",
      name: "Monstera",
      species_name: "Monstera Deliciosa",
      nickname: null,
      status: "active",
      location: null,
      watering_interval_days: 7,
      last_watered_at: null,
      next_water_due_at: null,
      notes: null,
      created_at: "2026-03-21T10:00:00.000Z",
      updated_at: "2026-03-21T10:00:00.000Z",
      updated_by: null,
    });

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync,
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    await processSyncQueueItemWithSupabase({
      id: "sync-1",
      entity: "plants",
      entityId: "plant-1",
      operation: "insert",
      payload: JSON.stringify({ userId: "user-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("plants");
    expect(writeMock.eqFirst).toHaveBeenCalledWith("user_id", "user-1");
    expect(writeMock.eqSecond).toHaveBeenCalledWith("client_id", "plant-1");
    expect(writeMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "plant-1",
        name: "Monstera",
      }),
    );
    expect(writeMock.insert.mock.calls[0][0]).not.toHaveProperty("id", "plant-1");
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("remote_id"),
      "550e8400-e29b-41d4-a716-446655440000",
      expect.any(String),
      "plant-1",
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("SET pending = 0"),
      expect.any(String),
      "plant-1",
    );
  });

  it("should delete remote records for delete operations", async () => {
    const eqClientId = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    const deleteFn = jest.fn().mockReturnValue({ eq: eqClientId });
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    from.mockReturnValue({ delete: deleteFn });

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    await processSyncQueueItemWithSupabase({
      id: "sync-2",
      entity: "plants",
      entityId: "plant-2",
      operation: "delete",
      payload: JSON.stringify({ userId: "user-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("plants");
    expect(deleteFn).toHaveBeenCalled();
    expect(eqClientId).toHaveBeenCalledWith("client_id", "plant-2");
  });

  it("should upload photo assets before syncing photo metadata", async () => {
    const writeMock = createClientIdWriteMock({
      returnedId: "660e8400-e29b-41d4-a716-446655440001",
    });
    const upload = jest.fn().mockResolvedValue({ error: null });
    const createSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: "https://cdn.example.com/photo-1.jpg" },
      error: null,
    });
    const from = applyClientIdWriteMock(writeMock);
    const storageFrom = require("@/config/supabase").supabase.storage
      .from as jest.Mock;
    storageFrom.mockReturnValue({ upload, createSignedUrl });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(["photo"])),
    }) as unknown as typeof fetch;

    const runAsync = jest.fn().mockResolvedValue(undefined);
    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: createGetFirstAsyncMock({
        id: "photo-1",
        user_id: "user-1",
        plant_id: "plant-1",
        local_uri: "file:///specimen.jpg",
        remote_url: null,
        storage_path: "user-1/plant-1/photo-1.jpg",
        mime_type: "image/jpeg",
        width: null,
        height: null,
        photo_role: "progress",
        captured_at: "2026-03-20T09:00:00.000Z",
        taken_at: null,
        caption: "Early growth",
        is_primary: 1,
        created_at: "2026-03-21T10:00:00.000Z",
        updated_at: "2026-03-21T10:00:00.000Z",
        updated_by: null,
      }),
      runAsync,
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    await processSyncQueueItemWithSupabase({
      id: "sync-photo-1",
      entity: "photos",
      entityId: "photo-1",
      operation: "insert",
      payload: JSON.stringify({ userId: "user-1", plantId: "plant-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(storageFrom).toHaveBeenCalledWith("photos");
    expect(createSignedUrl).toHaveBeenCalledWith(
      "user-1/plant-1/photo-1.jpg",
      2592000,
    );
    expect(upload).toHaveBeenCalledWith(
      "user-1/plant-1/photo-1.jpg",
      expect.any(Blob),
      expect.objectContaining({ contentType: "image/jpeg", upsert: true }),
    );
    expect(from).toHaveBeenCalledWith("photos");
    expect(writeMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "photo-1",
        plant_id: REMOTE_PLANT_UUID,
        storage_path: "user-1/plant-1/photo-1.jpg",
        photo_role: "progress",
        captured_at: "2026-03-20T09:00:00.000Z",
        caption: "Early growth",
      }),
    );
  });

  it("should sync graveyard records", async () => {
    const writeMock = createClientIdWriteMock();
    const from = applyClientIdWriteMock(writeMock);

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: createGetFirstAsyncMock({
        id: "graveyard-1",
        user_id: "user-1",
        plant_id: "plant-1",
        cause_of_passing: "Root rot",
        memorial_note: "A generous grower.",
        archived_at: "2026-03-21T10:00:00.000Z",
        created_at: "2026-03-21T10:00:00.000Z",
        updated_at: "2026-03-21T10:00:00.000Z",
        updated_by: null,
      }),
      runAsync: jest.fn().mockResolvedValue(undefined),
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    await processSyncQueueItemWithSupabase({
      id: "sync-graveyard-1",
      entity: "graveyard_plants",
      entityId: "graveyard-1",
      operation: "insert",
      payload: JSON.stringify({ userId: "user-1", plantId: "plant-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("graveyard_plants");
    expect(writeMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "graveyard-1",
        plant_id: REMOTE_PLANT_UUID,
      }),
    );
  });

  it("syncs plant status snapshots without sqlite-only pending columns", async () => {
    const writeMock = createClientIdWriteMock();
    const from = applyClientIdWriteMock(writeMock);

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: createGetFirstAsyncMock({
        id: "snapshot-1",
        user_id: "user-1",
        plant_id: "plant-1",
        status: "thriving",
        reason: "Healthy leaves",
        captured_at: "2026-03-21T10:00:00.000Z",
        created_at: "2026-03-21T10:00:00.000Z",
        updated_at: "2026-03-21T10:00:00.000Z",
        updated_by: null,
        pending: 1,
        synced_at: null,
        sync_error: null,
        remote_id: null,
      }),
      runAsync: jest.fn().mockResolvedValue(undefined),
    });

    const { processSyncQueueItemWithSupabase } = require("@/services/database/supabaseSyncAdapter");

    await processSyncQueueItemWithSupabase({
      id: "sync-snapshot-1",
      entity: "plant_status_snapshots",
      entityId: "snapshot-1",
      operation: "insert",
      payload: JSON.stringify({ userId: "user-1", plantId: "plant-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("plant_status_snapshots");
    expect(writeMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "snapshot-1",
        plant_id: REMOTE_PLANT_UUID,
        status: "thriving",
      }),
    );
    expect(writeMock.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ pending: expect.anything() }),
    );
  });

  it("upserts care reminders by client_id with resolved plant uuid", async () => {
    const writeMock = createClientIdWriteMock();
    const from = applyClientIdWriteMock(writeMock);

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: createGetFirstAsyncMock({
        id: "reminder-1780497725390-hkali992",
        user_id: "user-1",
        plant_id: "plant-1780497725349-9263nov7",
        reminder_type: "water",
        frequency_days: 7,
        enabled: 1,
        next_due_at: "2026-06-04T09:00:00.000Z",
        last_triggered_at: null,
        created_at: "2026-03-21T10:00:00.000Z",
        updated_at: "2026-03-21T10:00:00.000Z",
        updated_by: null,
      }),
      runAsync: jest.fn().mockResolvedValue(undefined),
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    await processSyncQueueItemWithSupabase({
      id: "sync-reminder-1",
      entity: "care_reminders",
      entityId: "reminder-1780497725390-hkali992",
      operation: "update",
      payload: JSON.stringify({ userId: "user-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(writeMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "reminder-1780497725390-hkali992",
        plant_id: REMOTE_PLANT_UUID,
      }),
    );
    expect(writeMock.insert.mock.calls[0][0]).not.toHaveProperty(
      "id",
      "reminder-1780497725390-hkali992",
    );
  });

  it("defers care reminders when the parent plant has no remote uuid yet", async () => {
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    from.mockReturnValue({ insert: jest.fn(), update: jest.fn() });

    const getFirstAsync = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes("remote_id") && sql.includes("plants")) {
        return Promise.resolve({ remote_id: null });
      }
      if (sql.includes("care_reminders")) {
        return Promise.resolve({
          id: "reminder-1780497725390-hkali992",
          user_id: "user-1",
          plant_id: "plant-1780497725349-9263nov7",
          reminder_type: "water",
          frequency_days: 7,
          enabled: 1,
          next_due_at: null,
          last_triggered_at: null,
          created_at: "2026-03-21T10:00:00.000Z",
          updated_at: "2026-03-21T10:00:00.000Z",
          updated_by: null,
        });
      }
      return Promise.resolve(null);
    });

    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqUserId = jest.fn().mockReturnValue({ maybeSingle });
    const eqClientId = jest.fn().mockReturnValue({ eq: eqUserId });
    const select = jest.fn().mockReturnValue({ eq: eqClientId });
    from.mockReturnValue({ select, insert: jest.fn(), update: jest.fn() });

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync: jest.fn(),
    });

    const { processSyncQueueItemWithSupabase } = require("@/services/database/supabaseSyncAdapter");

    const result = await processSyncQueueItemWithSupabase({
      id: "sync-reminder-deferred",
      entity: "care_reminders",
      entityId: "reminder-1780497725390-hkali992",
      operation: "update",
      payload: JSON.stringify({ userId: "user-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "deferred",
        reasonCode: "PARENT_NOT_SYNCED",
      }),
    );
  });

  it("surfaces readable errors when local photo fetch fails", async () => {
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    from.mockReturnValue({ upsert: jest.fn() });

    global.fetch = jest.fn().mockRejectedValue(new Error("Network request failed"));

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: createGetFirstAsyncMock({
        id: "photo-1",
        user_id: "user-1",
        plant_id: "plant-1",
        local_uri: "file:///missing.jpg",
        remote_url: null,
        storage_path: "user-1/plant-1/photo-1.jpg",
        mime_type: "image/jpeg",
        width: null,
        height: null,
        photo_role: "progress",
        captured_at: null,
        taken_at: null,
        caption: null,
        is_primary: 0,
        created_at: "2026-03-21T10:00:00.000Z",
        updated_at: "2026-03-21T10:00:00.000Z",
        updated_by: null,
      }),
      runAsync: jest.fn(),
    });

    const { processSyncQueueItemWithSupabase } = require("@/services/database/supabaseSyncAdapter");

    await expect(
      processSyncQueueItemWithSupabase({
        id: "sync-photo-network",
        entity: "photos",
        entityId: "photo-1",
        operation: "insert",
        payload: JSON.stringify({ userId: "user-1" }),
        status: "pending",
        attemptCount: 0,
        lastError: null,
        nextRetryAt: null,
        queuedAt: "2026-03-21T10:00:00.000Z",
        updatedAt: "2026-03-21T10:00:00.000Z",
      }),
    ).rejects.toThrow(/Photo upload failed while reading local file/i);
  });

  it("should sync care log condition fields", async () => {
    const writeMock = createClientIdWriteMock();
    const from = applyClientIdWriteMock(writeMock);

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: createGetFirstAsyncMock({
        id: "log-1",
        user_id: "user-1",
        plant_id: "plant-1",
        log_type: "inspect",
        current_condition: "Declining",
        notes: "Leaves are softening.",
        tags: JSON.stringify(["stable condition", "new growth"]),
        logged_at: "2026-03-21T10:00:00.000Z",
        created_at: "2026-03-21T10:00:00.000Z",
        updated_at: "2026-03-21T10:00:00.000Z",
        updated_by: null,
      }),
      runAsync: jest.fn().mockResolvedValue(undefined),
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    await processSyncQueueItemWithSupabase({
      id: "sync-log-1",
      entity: "care_logs",
      entityId: "log-1",
      operation: "insert",
      payload: JSON.stringify({ userId: "user-1", plantId: "plant-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("care_logs");
    expect(writeMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        current_condition: "Declining",
        tags: JSON.stringify(["stable condition", "new growth"]),
      }),
    );
  });

  it("upserts users profile rows by primary key", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    from.mockReturnValue({ upsert });

    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      display_name: "Test User",
      avatar_url: null,
      role: "user",
      created_at: "2026-03-21T10:00:00.000Z",
      updated_at: "2026-03-22T10:00:00.000Z",
      updated_by: "user-1",
    });

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync: jest.fn(),
    });

    const { processSyncQueueItemWithSupabase } = require("@/services/database/supabaseSyncAdapter");

    await processSyncQueueItemWithSupabase({
      id: "sync-user-1",
      entity: "users",
      entityId: "user-1",
      operation: "update",
      payload: JSON.stringify({ userId: "user-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-1",
        display_name: "Test User",
      }),
      { onConflict: "id" },
    );
  });

  it("should sync user preferences with user-scoped upsert", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    from.mockReturnValue({ upsert });

    const runAsync = jest.fn().mockResolvedValue(undefined);
    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({
        user_id: "user-1",
        reminders_enabled: 0,
        auto_sync_enabled: 0,
        preferred_theme: "linen-light",
        timezone: "America/New_York",
        default_watering_hour: 7,
        created_at: "2026-03-21T10:00:00.000Z",
        updated_at: "2026-03-22T10:00:00.000Z",
        updated_by: null,
      }),
      runAsync,
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    await processSyncQueueItemWithSupabase({
      id: "sync-pref-1",
      entity: "user_preferences",
      entityId: "user-1",
      operation: "update",
      payload: JSON.stringify({ userId: "user-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-22T10:00:00.000Z",
      updatedAt: "2026-03-22T10:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("user_preferences");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        reminders_enabled: false,
        auto_sync_enabled: false,
        timezone: "America/New_York",
      }),
      { onConflict: "user_id" },
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("SET pending = 0"),
      expect.any(String),
      "user-1",
    );
  });

  it("removes photo storage assets before deleting remote photo metadata", async () => {
    const remove = jest.fn().mockResolvedValue({ error: null });
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn().mockReturnValue({ eq: eqId });
    const deleteFn = jest.fn().mockReturnValue({ eq: eqUser });
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    const storageFrom = require("@/config/supabase").supabase.storage
      .from as jest.Mock;
    from.mockReturnValue({ delete: deleteFn });
    storageFrom.mockReturnValue({ remove });

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    await processSyncQueueItemWithSupabase({
      id: "sync-photo-delete-1",
      entity: "photos",
      entityId: "photo-1",
      operation: "delete",
      payload: JSON.stringify({
        userId: "user-1",
        storagePath: "user-1/plant-1/photo-1.jpg",
      }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(storageFrom).toHaveBeenCalledWith("photos");
    expect(remove).toHaveBeenCalledWith(["user-1/plant-1/photo-1.jpg"]);
    expect(from).toHaveBeenCalledWith("photos");
    expect(deleteFn).toHaveBeenCalled();
  });

  it("defers photo blob upload and metadata sync for free users without marking the row synced", async () => {
    (require("@/services/entitlementState").getEntitlementState as jest.Mock).mockReturnValue(false);

    const storageFrom = require("@/config/supabase").supabase.storage.from as jest.Mock;
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    const runAsync = jest.fn().mockResolvedValue(undefined);

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: jest.fn(),
      runAsync,
    });

    const { processSyncQueueItemWithSupabase } = require("@/services/database/supabaseSyncAdapter");

    const result = await processSyncQueueItemWithSupabase({
      id: "sync-photo-free",
      entity: "photos",
      entityId: "photo-1",
      operation: "insert",
      payload: JSON.stringify({ userId: "user-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(storageFrom).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalledWith("photos");
    expect(result).toEqual(
      expect.objectContaining({
        status: "deferred",
        reason: expect.stringMatching(/premium photo backup/i),
      }),
    );
    expect(runAsync).not.toHaveBeenCalledWith(
      expect.stringContaining("SET pending = 0"),
      expect.any(String),
      "photo-1",
    );
  });

  it("merges feature usage sync conflicts with max count", async () => {
    const writeMock = createClientIdWriteMock({
      returnedId: "770e8400-e29b-41d4-a716-446655440002",
    });
    const countMaybeSingle = jest.fn().mockResolvedValue({
      data: { count: 5 },
      error: null,
    });
    const countEq = jest.fn().mockReturnValue({ maybeSingle: countMaybeSingle });
    writeMock.select.mockImplementation((columns: string) => {
      if (columns === "count") {
        return { eq: countEq };
      }
      return { eq: writeMock.eqFirst };
    });
    const from = applyClientIdWriteMock(writeMock);

    const runAsync = jest.fn().mockResolvedValue(undefined);
    const getFirstAsync = jest.fn().mockResolvedValue({
      id: "user-1:ai_health_insight:plant-1:2026-05",
      user_id: "user-1",
      feature: "ai_health_insight",
      period: "2026-05",
      count: 2,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-07T00:00:00.000Z",
    });
    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync,
      runAsync,
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    await processSyncQueueItemWithSupabase({
      id: "sync-usage",
      entity: "feature_usage",
      entityId: "user-1:ai_health_insight:plant-1:2026-05",
      operation: "insert",
      payload: null,
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-05-07T00:00:00.000Z",
      updatedAt: "2026-05-07T00:00:00.000Z",
    });

    expect(writeMock.select).toHaveBeenCalledWith("count");
    expect(countEq).toHaveBeenCalledWith(
      "client_id",
      "user-1:ai_health_insight:plant-1:2026-05",
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE feature_usage SET count = ?"),
      5,
      expect.any(String),
      "user-1:ai_health_insight:plant-1:2026-05",
    );
    expect(writeMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "user-1:ai_health_insight:plant-1:2026-05",
        count: 5,
      }),
    );
  });

  it("does not mark photo sync successful when required metadata is missing", async () => {
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    const runAsync = jest.fn().mockResolvedValue(undefined);

    from.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    });

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({
        id: "photo-invalid-1",
        user_id: "user-1",
        plant_id: "plant-1",
        local_uri: "file:///specimen.jpg",
        remote_url: null,
        storage_path: null,
        mime_type: null,
        width: null,
        height: null,
        taken_at: null,
        is_primary: 1,
        created_at: "2026-03-21T10:00:00.000Z",
        updated_at: "2026-03-21T10:00:00.000Z",
        updated_by: null,
      }),
      runAsync,
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    await expect(
      processSyncQueueItemWithSupabase({
        id: "sync-photo-invalid-1",
        entity: "photos",
        entityId: "photo-invalid-1",
        operation: "insert",
        payload: JSON.stringify({ userId: "user-1", plantId: "plant-1" }),
        status: "pending",
        attemptCount: 0,
        lastError: null,
        nextRetryAt: null,
        queuedAt: "2026-03-21T10:00:00.000Z",
        updatedAt: "2026-03-21T10:00:00.000Z",
      }),
    ).rejects.toThrow(/missing required storage metadata/i);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("SET sync_error = ?"),
      expect.any(String),
      expect.any(String),
      "photo-invalid-1",
    );
    expect(runAsync).not.toHaveBeenCalledWith(
      expect.stringContaining("SET pending = 0"),
      expect.any(String),
      "photo-invalid-1",
    );
  });

  it("returns deleted_before_sync when local plant row is missing instead of completing silently", async () => {
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    const upsert = jest.fn().mockResolvedValue({ error: null });
    from.mockReturnValue({ upsert });

    const runAsync = jest.fn().mockResolvedValue(undefined);
    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync,
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    const result = await processSyncQueueItemWithSupabase({
      id: "sync-missing-plant",
      entity: "plants",
      entityId: "plant-missing",
      operation: "update",
      payload: JSON.stringify({ userId: "user-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "deleted_before_sync",
        reasonCode: "LOCAL_ROW_MISSING",
      }),
    );
    expect(upsert).not.toHaveBeenCalled();
    expect(runAsync).not.toHaveBeenCalledWith(
      expect.stringContaining("SET pending = 0"),
      expect.any(String),
      "plant-missing",
    );
  });

  it("still completes delete operations when the local row is already gone", async () => {
    const eqClientId = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    const deleteFn = jest.fn().mockReturnValue({ eq: eqClientId });
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    from.mockReturnValue({ delete: deleteFn });

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn(),
    });

    const {
      processSyncQueueItemWithSupabase,
    } = require("@/services/database/supabaseSyncAdapter");

    const result = await processSyncQueueItemWithSupabase({
      id: "sync-delete-missing",
      entity: "plants",
      entityId: "plant-gone",
      operation: "delete",
      payload: JSON.stringify({ userId: "user-1" }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      nextRetryAt: null,
      queuedAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    expect(result).toBeUndefined();
    expect(deleteFn).toHaveBeenCalled();
    expect(eqClientId).toHaveBeenCalledWith("client_id", "plant-gone");
  });
});
