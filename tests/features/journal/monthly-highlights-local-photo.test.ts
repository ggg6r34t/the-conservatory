import { buildMonthlyHighlights } from "@/features/journal/services/monthlyHighlightsService";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import type { Photo } from "@/types/models";

function createPlant(id: string): PlantListItem {
  return {
    id,
    userId: "user-1",
    name: `Plant ${id}`,
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    pending: 0,
    primaryPhotoUri: null,
    primaryPhotoLocalUri: null,
    primaryPhotoRemoteUrl: null,
    primaryPhotoStoragePath: null,
    primaryPhotoRole: null,
    primaryPhotoUpdatedAt: null,
  };
}

describe("buildMonthlyHighlights local photo URIs", () => {
  it("renders local progress photo URIs when remote URL is absent", () => {
    const result = buildMonthlyHighlights({
      plants: [createPlant("plant-1")],
      photos: [
        {
          id: "photo-1",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///progress.jpg",
          remoteUrl: null,
          photoRole: "progress",
          isPrimary: 0,
          capturedAt: "2026-03-12T10:00:00.000Z",
          createdAt: "2026-03-12T10:00:00.000Z",
          updatedAt: "2026-03-12T10:00:00.000Z",
          pending: 0,
        } satisfies Photo,
      ],
      logs: [],
    });

    expect(result.sections[0]?.items[0]?.imageUri).toBe("file:///progress.jpg");
  });

  it("prefers local URI over stale remote URL for qualifying progress photos", () => {
    const result = buildMonthlyHighlights({
      plants: [createPlant("plant-1")],
      photos: [
        {
          id: "photo-1",
          userId: "user-1",
          plantId: "plant-1",
          localUri: "file:///progress-local.jpg",
          remoteUrl: "https://cdn.example.com/expired.jpg",
          photoRole: "progress",
          isPrimary: 0,
          capturedAt: "2026-03-12T10:00:00.000Z",
          createdAt: "2026-03-12T10:00:00.000Z",
          updatedAt: "2026-03-12T10:00:00.000Z",
          pending: 0,
        } satisfies Photo,
      ],
      logs: [],
    });

    expect(result.sections[0]?.items[0]?.imageUri).toBe(
      "file:///progress-local.jpg",
    );
  });
});
