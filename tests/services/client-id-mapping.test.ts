import { getLocalEntityId, upsertByClientId } from "@/services/database/clientIdMapping";

jest.mock("@/config/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: jest.fn().mockResolvedValue({
    runAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn().mockResolvedValue({ remote_id: null }),
  }),
}));

describe("clientIdMapping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prefers client_id over remote uuid for local primary keys", () => {
    expect(
      getLocalEntityId({
        id: "550e8400-e29b-41d4-a716-446655440000",
        client_id: "plant-1780497725349-9263nov7",
      }),
    ).toBe("plant-1780497725349-9263nov7");
  });

  it("falls back to remote id when client_id is absent", () => {
    expect(
      getLocalEntityId({
        id: "550e8400-e29b-41d4-a716-446655440000",
        client_id: null,
      }),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("inserts when no remote row exists for user_id + client_id", async () => {
    const lookupMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqClientId = jest.fn().mockReturnValue({ maybeSingle: lookupMaybeSingle });
    const eqUserId = jest.fn().mockReturnValue({ eq: eqClientId });
    const single = jest.fn().mockResolvedValue({
      data: { id: "550e8400-e29b-41d4-a716-446655440000" },
      error: null,
    });
    const insert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) });
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eqUserId }), insert, update: jest.fn() });

    const remoteId = await upsertByClientId("plants", "plant-1", {
      user_id: "user-1",
      name: "Monstera",
    });

    expect(remoteId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "plant-1", name: "Monstera" }),
    );
  });

  it("updates by remote uuid when a row already exists for user_id + client_id", async () => {
    const lookupMaybeSingle = jest.fn().mockResolvedValue({
      data: { id: "550e8400-e29b-41d4-a716-446655440000" },
      error: null,
    });
    const eqClientId = jest.fn().mockReturnValue({ maybeSingle: lookupMaybeSingle });
    const eqUserId = jest.fn().mockReturnValue({ eq: eqClientId });
    const single = jest.fn().mockResolvedValue({
      data: { id: "550e8400-e29b-41d4-a716-446655440000" },
      error: null,
    });
    const update = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) }),
    });
    const from = require("@/config/supabase").supabase.from as jest.Mock;
    from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eqUserId }), insert: jest.fn(), update });

    await upsertByClientId("plants", "plant-1", {
      user_id: "user-1",
      name: "Monstera Updated",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "plant-1", name: "Monstera Updated" }),
    );
  });
});
