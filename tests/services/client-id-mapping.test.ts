import { getLocalEntityId } from "@/services/database/clientIdMapping";

describe("clientIdMapping", () => {
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
});
