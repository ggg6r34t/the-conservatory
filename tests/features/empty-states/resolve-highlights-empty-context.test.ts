import { resolveHighlightsEmptyContext } from "@/features/empty-states/resolveHighlightsEmptyContext";

describe("resolveHighlightsEmptyContext", () => {
  it("returns noPlants when the collection is empty", () => {
    expect(
      resolveHighlightsEmptyContext({ plantCount: 0, progressPhotoCount: 0 }),
    ).toBe("highlights.noPlants");
  });

  it("returns noPhotos when plants exist but there are no progress photos", () => {
    expect(
      resolveHighlightsEmptyContext({ plantCount: 2, progressPhotoCount: 0 }),
    ).toBe("highlights.noPhotos");
  });

  it("returns none when photos exist but no month qualifies", () => {
    expect(
      resolveHighlightsEmptyContext({ plantCount: 2, progressPhotoCount: 4 }),
    ).toBe("highlights.none");
  });
});
