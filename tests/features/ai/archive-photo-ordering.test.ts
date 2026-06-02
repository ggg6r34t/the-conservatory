import {
  pickArchiveBeforeAfterPhotos,
  sortPhotosChronologically,
} from "@/features/ai/services/archivePhotoOrdering";

describe("archivePhotoOrdering", () => {
  it("sorts photos chronologically using captured_at with taken_at fallback", () => {
    const sorted = sortPhotosChronologically([
      {
        id: "b",
        uri: "file://b",
        capturedAt: null,
        takenAt: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "a",
        uri: "file://a",
        capturedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "c",
        uri: "file://c",
        capturedAt: "2026-09-01T00:00:00.000Z",
      },
    ]);

    expect(sorted.map((photo) => photo.id)).toEqual(["a", "b", "c"]);
  });

  it("pairs earliest and latest photos for archive curation", () => {
    const pairing = pickArchiveBeforeAfterPhotos([
      {
        id: "recent",
        uri: "file://recent.jpg",
        capturedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "early",
        uri: "file://early.jpg",
        capturedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    expect(pairing).toEqual({
      beforePhoto: expect.objectContaining({ id: "early" }),
      afterPhoto: expect.objectContaining({ id: "recent" }),
    });
  });
});
