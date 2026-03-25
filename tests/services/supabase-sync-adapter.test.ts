jest.mock("@/config/supabase", () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: jest.fn(),
}));

describe("supabase sync adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should upsert plant rows and mark local sync state", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    from.mockReturnValue({ upsert });

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
    expect(upsert).toHaveBeenCalled();
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("SET pending = 0"),
      expect.any(String),
      "plant-1",
    );
  });

  it("should delete remote records for delete operations", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn().mockReturnValue({ eq: eqId });
    const deleteFn = jest.fn().mockReturnValue({ eq: eqUser });
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
    expect(eqUser).toHaveBeenCalledWith("id", "plant-2");
    expect(eqId).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("should upload photo assets before syncing photo metadata", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const upload = jest.fn().mockResolvedValue({ error: null });
    const createSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: "https://cdn.example.com/photo-1.jpg" },
      error: null,
    });
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    const storageFrom = require("@/config/supabase").supabase.storage
      .from as jest.Mock;
    from.mockReturnValue({ upsert });
    storageFrom.mockReturnValue({ upload, createSignedUrl });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(["photo"])),
    }) as unknown as typeof fetch;

    const runAsync = jest.fn().mockResolvedValue(undefined);
    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({
        id: "photo-1",
        user_id: "user-1",
        plant_id: "plant-1",
        local_uri: "file:///specimen.jpg",
        remote_url: null,
        storage_path: "user-1/plant-1/photo-1.jpg",
        mime_type: "image/jpeg",
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
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "photo-1",
        storage_path: "user-1/plant-1/photo-1.jpg",
      }),
      { onConflict: "id" },
    );
  });

  it("should sync graveyard records", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    from.mockReturnValue({ upsert });

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({
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
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "graveyard-1",
        plant_id: "plant-1",
      }),
      { onConflict: "id" },
    );
  });

  it("should sync care log condition fields", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    from.mockReturnValue({ upsert });

    require("@/services/database/sqlite").getDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({
        id: "log-1",
        user_id: "user-1",
        plant_id: "plant-1",
        log_type: "inspect",
        current_condition: "Declining",
        notes: "Leaves are softening.",
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
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ current_condition: "Declining" }),
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
});
