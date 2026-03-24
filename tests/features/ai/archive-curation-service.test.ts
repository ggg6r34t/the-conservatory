jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import {
  curateArchiveLocally,
  type ArchiveCurationItem,
} from "@/features/ai/services/archiveCurationService";

describe("archiveCurationService", () => {
  it("builds before and after pairs from distinct archive photos", () => {
    const items: ArchiveCurationItem[] = [
      {
        plantId: "plant-1",
        plantName: "Juniper",
        photoUris: ["file://recent.jpg", "file://mid.jpg", "file://early.jpg"],
      },
    ];

    const result = curateArchiveLocally(items);

    expect(result[0]).toMatchObject({
      plantId: "plant-1",
      beforeUri: "file://early.jpg",
      afterUri: "file://recent.jpg",
    });
  });

  it("suppresses candidates with only one distinct photo", () => {
    const result = curateArchiveLocally([
      {
        plantId: "plant-1",
        plantName: "Juniper",
        photoUris: ["file://single.jpg"],
      },
    ]);

    expect(result).toHaveLength(0);
  });
});
