jest.mock("@/config/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: jest.fn(),
}));

describe("supabase sync adapter", () => {
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
});
