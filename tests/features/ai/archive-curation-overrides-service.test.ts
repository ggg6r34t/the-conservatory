import {
  buildArchiveOverrideKey,
  normalizeArchiveOverride,
} from "@/features/ai/services/archiveCurationOverridesService";

describe("archiveCurationOverridesService", () => {
  it("builds a stable override key from plant and photo selections", () => {
    expect(
      buildArchiveOverrideKey({
        plantId: "plant-1",
        beforePhotoId: "photo-b",
        afterPhotoId: "photo-a",
      }),
    ).toBe("plant-1:photo-b:photo-a");
  });

  it("normalizes editorial override captions", () => {
    expect(
      normalizeArchiveOverride({
        plantId: "plant-1",
        beforePhotoId: "photo-b",
        afterPhotoId: "photo-a",
        caption: "  Before and after.  ",
      }),
    ).toMatchObject({
      plantId: "plant-1",
      beforePhotoId: "photo-b",
      afterPhotoId: "photo-a",
      caption: "Before and after.",
    });
  });
});
