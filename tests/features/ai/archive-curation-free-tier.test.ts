jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@/features/ai/api/aiClient", () => ({
  requestArchiveCuration: jest.fn(),
}));

jest.mock("@/features/ai/services/aiCache", () => ({
  getCachedValue: jest.fn().mockResolvedValue(null),
  setCachedValue: jest.fn().mockResolvedValue(undefined),
}));

import {
  getArchiveCuration,
  type ArchiveCurationItem,
} from "@/features/ai/services/archiveCurationService";

describe("getArchiveCuration — free tier (cloudAllowed=false)", () => {
  it("returns non-empty local results with source 'local' when a plant has 2+ photos", async () => {
    const items: ArchiveCurationItem[] = [
      {
        plantId: "plant-1",
        plantName: "Monstera",
        photoUris: ["file://recent.jpg", "file://early.jpg"],
      },
    ];

    const result = await getArchiveCuration(items, false);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatchObject({
      plantId: "plant-1",
      plantName: "Monstera",
      beforeUri: "file://early.jpg",
      afterUri: "file://recent.jpg",
      source: "local",
    });
  });

  it("returns empty results when a plant has fewer than 2 photos", async () => {
    const items: ArchiveCurationItem[] = [
      {
        plantId: "plant-2",
        plantName: "Fern",
        photoUris: ["file://only.jpg"],
      },
    ];

    const result = await getArchiveCuration(items, false);

    expect(result).toHaveLength(0);
  });
});
