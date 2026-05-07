import {
  buildSpecimenTagCode,
  buildSpecimenTagPayload,
  parseSpecimenTagPayload,
  resolveSpecimenTagScan,
} from "@/features/plants/services/specimenTagsService";

const mockGetDatabase = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

describe("specimenTagsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds deterministic specimen tag codes", () => {
    expect(buildSpecimenTagCode("Monstera Albo", "plant_abcdef123456")).toBe(
      "MON-3456",
    );
  });

  it("builds stable scan payloads without private account data", () => {
    const payload = buildSpecimenTagPayload({
      tagId: "tag-1",
      plantId: "plant-1",
      code: "MON-3456",
      plantName: "Monstera",
      speciesName: "Monstera deliciosa",
    });

    expect(JSON.parse(payload)).toEqual({
      app: "the-conservatory",
      version: 1,
      tagId: "tag-1",
      plantId: "plant-1",
      code: "MON-3456",
      plantName: "Monstera",
      speciesName: "Monstera deliciosa",
    });
  });

  it("parses only valid Conservatory scan payloads", () => {
    const payload = buildSpecimenTagPayload({
      tagId: "tag-1",
      plantId: "plant-1",
      code: "MON-3456",
      plantName: "Monstera",
      speciesName: "Monstera deliciosa",
    });

    expect(parseSpecimenTagPayload(payload)).toEqual({
      tagId: "tag-1",
      plantId: "plant-1",
      code: "MON-3456",
      plantName: "Monstera",
      speciesName: "Monstera deliciosa",
    });
    expect(parseSpecimenTagPayload('{"app":"other"}')).toBeNull();
  });

  it("resolves valid native scan payloads to a local specimen tag", async () => {
    const payload = buildSpecimenTagPayload({
      tagId: "tag-1",
      plantId: "plant-1",
      code: "MON-3456",
      plantName: "Monstera",
      speciesName: "Monstera deliciosa",
    });
    const getFirstAsync = jest.fn().mockResolvedValue({
      tag_id: "tag-1",
      plant_id: "plant-1",
      code: "MON-3456",
      plant_name: "Monstera",
      species_name: "Monstera deliciosa",
    });
    mockGetDatabase.mockResolvedValue({ getFirstAsync });

    await expect(
      resolveSpecimenTagScan({ userId: "user-1", value: payload }),
    ).resolves.toEqual({
      status: "matched",
      match: {
        tagId: "tag-1",
        plantId: "plant-1",
        code: "MON-3456",
        plantName: "Monstera",
        speciesName: "Monstera deliciosa",
      },
    });
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("FROM specimen_tags"),
      "user-1",
      "tag-1",
      "plant-1",
      "MON-3456",
    );
  });

  it("rejects scan payloads that are not Conservatory specimen tags", async () => {
    await expect(
      resolveSpecimenTagScan({
        userId: "user-1",
        value: "https://example.com",
      }),
    ).resolves.toEqual({ status: "invalid" });
    expect(mockGetDatabase).not.toHaveBeenCalled();
  });

  it("reports valid specimen payloads that are not in the local collection", async () => {
    const payload = buildSpecimenTagPayload({
      tagId: "tag-1",
      plantId: "plant-1",
      code: "MON-3456",
      plantName: "Monstera",
      speciesName: "Monstera deliciosa",
    });
    mockGetDatabase.mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue(null),
    });

    await expect(
      resolveSpecimenTagScan({ userId: "user-1", value: payload }),
    ).resolves.toEqual({
      status: "not_found",
      payload: {
        tagId: "tag-1",
        plantId: "plant-1",
        code: "MON-3456",
        plantName: "Monstera",
        speciesName: "Monstera deliciosa",
      },
    });
  });
});
