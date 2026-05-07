import {
  buildSpecimenTagCode,
  buildSpecimenTagPayload,
  ensureSpecimenTag,
  parseSpecimenTagPayload,
  resolveSpecimenTagScan,
} from "@/features/plants/services/specimenTagsService";
import { setEntitlementState } from "@/services/entitlementState";

const mockGetDatabase = jest.fn();

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

describe("specimenTagsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEntitlementState(false);
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

  it("rejects persisted tag creation for free users before touching storage", async () => {
    await expect(
      ensureSpecimenTag({
        userId: "user-1",
        plant: {
          id: "plant-1",
          userId: "user-1",
          name: "Monstera",
          speciesName: "Monstera deliciosa",
          status: "active",
          location: null,
          wateringIntervalDays: 7,
          notes: null,
          createdAt: "2026-05-07T00:00:00.000Z",
          updatedAt: "2026-05-07T00:00:00.000Z",
          pending: 0,
        },
      }),
    ).rejects.toThrow(/premium/i);

    expect(mockGetDatabase).not.toHaveBeenCalled();
  });

  it("creates and queues a specimen tag for premium users", async () => {
    setEntitlementState(true);
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const database = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync,
      withTransactionAsync: async (callback: () => Promise<void>) =>
        callback(),
    };
    mockGetDatabase.mockResolvedValue(database);

    const tag = await ensureSpecimenTag({
      userId: "user-1",
        plant: {
          id: "plant-1",
          userId: "user-1",
          name: "Monstera",
          speciesName: "Monstera deliciosa",
          status: "active",
          location: "East window",
          wateringIntervalDays: 7,
          notes: null,
          createdAt: "2026-05-07T00:00:00.000Z",
          updatedAt: "2026-05-07T00:00:00.000Z",
          pending: 0,
        },
      });

    expect(tag).toEqual(
      expect.objectContaining({
        userId: "user-1",
        plantId: "plant-1",
        code: "MON-NT-1",
        pending: 1,
      }),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO specimen_tags"),
      expect.any(String),
      "user-1",
      "plant-1",
      "MON-NT-1",
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      "user-1",
      1,
      null,
      null,
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_queue"),
      expect.any(String),
      "specimen_tags",
      expect.any(String),
      "insert",
      expect.stringContaining('"plantId":"plant-1"'),
      "pending",
      0,
      null,
      null,
      expect.any(String),
      expect.any(String),
    );
  });
});
