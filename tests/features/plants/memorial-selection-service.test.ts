import type { GraveyardPlantListItem } from "@/features/plants/api/plantsClient";
import { selectMemorialRoles } from "@/features/plants/services/memorialSelectionService";

function createMemorial(
  id: string,
  patch: Partial<GraveyardPlantListItem> = {},
): GraveyardPlantListItem {
  return {
    id,
    userId: "user-1",
    plantId: `plant-${id}`,
    name: `Plant ${id}`,
    speciesName: "Monstera deliciosa",
    nickname: null,
    causeOfPassing: null,
    memorialNote: null,
    archivedAt: "2026-03-10T10:00:00.000Z",
    createdAt: "2025-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
    updatedBy: "user-1",
    pending: 0,
    syncedAt: null,
    syncError: null,
    plantNotes: null,
    primaryPhotoUri: null,
    photoCount: 0,
    careLogCount: 0,
    hasPrimaryPhoto: false,
    ...patch,
  };
}

describe("selectMemorialRoles", () => {
  it("selects the featured memorial using memorial richness instead of recency alone", () => {
    const result = selectMemorialRoles([
      createMemorial("recent", {
        archivedAt: "2026-03-20T10:00:00.000Z",
      }),
      createMemorial("rich-note", {
        memorialNote:
          "You taught me patience, restraint, and the difference between care and overcare.",
        causeOfPassing: "Root rot",
        photoCount: 3,
        careLogCount: 7,
        hasPrimaryPhoto: true,
        archivedAt: "2026-03-12T10:00:00.000Z",
      }),
    ]);

    expect(result.featuredMemorial?.id).toBe("rich-note");
  });

  it("selects a distinct reflection memorial using authored remembrance depth", () => {
    const result = selectMemorialRoles([
      createMemorial("featured", {
        memorialNote:
          "An expansive remembrance with cause, photos, and enough history to win featured. It holds a fuller record of this plant's passing and the lessons it left behind.",
        causeOfPassing: "Root rot",
        photoCount: 4,
        careLogCount: 8,
        hasPrimaryPhoto: true,
      }),
      createMemorial("reflection", {
        memorialNote:
          "A thoughtful remembrance about pacing, light, and learning when to leave things alone.",
      }),
      createMemorial("plain", {
        archivedAt: "2026-03-21T10:00:00.000Z",
      }),
    ]);

    expect(result.reflectionMemorial?.id).toBe("reflection");
    expect(result.reflectionMemorial?.id).not.toBe(result.featuredMemorial?.id);
  });

  it("selects tribute memorial from history richness instead of duplicating featured", () => {
    const result = selectMemorialRoles([
      createMemorial("featured", {
        memorialNote:
          "An authored memorial with cause and recency that should win featured.",
        causeOfPassing: "Underwatering",
        photoCount: 2,
        careLogCount: 3,
        hasPrimaryPhoto: true,
      }),
      createMemorial("reflection", {
        memorialNote:
          "A reflective note that is strong enough to claim the reflection role.",
      }),
      createMemorial("tribute", {
        photoCount: 6,
        careLogCount: 12,
        hasPrimaryPhoto: true,
        plantNotes: "A long shared history.",
      }),
    ]);

    expect(result.tributeMemorial?.id).toBe("tribute");
    expect(result.tributeMemorial?.id).not.toBe(result.featuredMemorial?.id);
  });

  it("excludes primary roles from compact memorial selection", () => {
    const result = selectMemorialRoles([
      createMemorial("featured", {
        memorialNote: "Featured memorial note with rich authored detail.",
        causeOfPassing: "Root rot",
        photoCount: 3,
        careLogCount: 7,
        hasPrimaryPhoto: true,
      }),
      createMemorial("reflection", {
        memorialNote: "A deeply reflective note for the reflection role.",
      }),
      createMemorial("tribute", {
        photoCount: 5,
        careLogCount: 10,
        hasPrimaryPhoto: true,
      }),
      createMemorial("compact-1", {
        archivedAt: "2026-03-18T10:00:00.000Z",
      }),
      createMemorial("compact-2", {
        archivedAt: "2026-03-16T10:00:00.000Z",
      }),
    ]);

    expect(result.compactMemorials.map((memorial) => memorial.id)).toEqual([
      "compact-1",
      "compact-2",
    ]);
  });

  it("breaks ties deterministically by id", () => {
    const result = selectMemorialRoles([createMemorial("b"), createMemorial("a")]);

    expect(result.featuredMemorial?.id).toBe("a");
    expect(result.reflectionMemorial?.id).toBe("b");
  });

  it("handles small datasets truthfully", () => {
    const one = selectMemorialRoles([createMemorial("solo")]);
    expect(one.featuredMemorial?.id).toBe("solo");
    expect(one.reflectionMemorial).toBeNull();
    expect(one.tributeMemorial).toBeNull();
    expect(one.compactMemorials).toEqual([]);

    const two = selectMemorialRoles([
      createMemorial("featured", {
        memorialNote: "A fuller remembrance.",
      }),
      createMemorial("reflection", {
        memorialNote: "A quieter reflection.",
      }),
    ]);
    expect(two.featuredMemorial?.id).toBe("featured");
    expect(two.reflectionMemorial?.id).toBe("reflection");
    expect(two.tributeMemorial).toBeNull();
    expect(two.compactMemorials).toEqual([]);
  });
});
