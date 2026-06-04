import {
  buildPrimaryPhotoListFields,
  resolvePhotoDisplayUri,
  resolvePrimaryPlantPhoto,
  resolveRenderablePhotoUri,
  trackResolvedPlantListPhoto,
} from "@/features/plants/services/plantPhotoResolver";
import { trackEvent } from "@/services/analytics/analyticsService";
import type { Photo } from "@/types/models";

function createPhoto(overrides?: Partial<Photo>): Photo {
  return {
    id: "photo-1",
    userId: "user-1",
    plantId: "plant-1",
    localUri: null,
    remoteUrl: null,
    isPrimary: 1,
    photoRole: "primary",
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    pending: 0,
    ...overrides,
  };
}

jest.mock("@/services/analytics/analyticsService", () => ({
  trackEvent: jest.fn(),
}));

describe("plantPhotoResolver", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("prefers local URI over remote URL for card display", () => {
    const photo = createPhoto({
      localUri: "file:///managed/primary.jpg",
      remoteUrl: "https://cdn.example.com/stale.jpg",
    });

    expect(resolvePhotoDisplayUri(photo, { context: "card" })).toBe(
      "file:///managed/primary.jpg",
    );
    expect(resolveRenderablePhotoUri(photo)).toBe(
      "file:///managed/primary.jpg",
    );
  });

  it("uses remote URL when local URI is missing", () => {
    const photo = createPhoto({
      localUri: null,
      remoteUrl: "https://cdn.example.com/primary.jpg",
    });

    expect(resolvePhotoDisplayUri(photo, { context: "card" })).toBe(
      "https://cdn.example.com/primary.jpg",
    );
  });

  it("prefers local URI over remote URL for detail display", () => {
    const photo = createPhoto({
      localUri: "file:///managed/progress.jpg",
      remoteUrl: "https://cdn.example.com/progress.jpg",
      photoRole: "progress",
      isPrimary: 0,
    });

    expect(resolvePhotoDisplayUri(photo, { context: "detail" })).toBe(
      "file:///managed/progress.jpg",
    );
  });

  it("returns null when neither URI is renderable", () => {
    expect(resolvePhotoDisplayUri(createPhoto())).toBeNull();
  });

  it("selects the primary photo even when a newer progress photo exists", () => {
    const primary = createPhoto({
      id: "photo-primary",
      localUri: "file:///primary.jpg",
      isPrimary: 1,
      photoRole: "primary",
      updatedAt: "2026-03-01T10:00:00.000Z",
    });
    const progress = createPhoto({
      id: "photo-progress",
      localUri: "file:///progress.jpg",
      isPrimary: 0,
      photoRole: "progress",
      updatedAt: "2026-03-20T10:00:00.000Z",
    });

    expect(resolvePrimaryPlantPhoto([progress, primary])?.id).toBe(
      "photo-primary",
    );
  });

  it("builds list DTO fields with local and remote sources", () => {
    const fields = buildPrimaryPhotoListFields(
      createPhoto({
        localUri: "file:///primary.jpg",
        remoteUrl: "https://cdn.example.com/primary.jpg",
        storagePath: "user/plant/primary.jpg",
      }),
    );

    expect(fields.primaryPhotoUri).toBe("file:///primary.jpg");
    expect(fields.primaryPhotoLocalUri).toBe("file:///primary.jpg");
    expect(fields.primaryPhotoRemoteUrl).toBe(
      "https://cdn.example.com/primary.jpg",
    );
    expect(fields.primaryPhotoStoragePath).toBe("user/plant/primary.jpg");
    expect(fields.primaryPhotoRole).toBe("primary");
  });

  it("tracks list photo display without file paths or URLs in properties", () => {
    trackResolvedPlantListPhoto(
      "library_card",
      buildPrimaryPhotoListFields(
        createPhoto({
          localUri: "file:///local.jpg",
          remoteUrl: "https://cdn.example.com/remote.jpg",
        }),
      ),
      "file:///local.jpg",
    );

    expect(trackEvent).toHaveBeenCalledWith(
      "plant_photo_local_displayed",
      expect.objectContaining({
        screen: "library_card",
        source_type: "local",
      }),
    );
    expect(JSON.stringify((trackEvent as jest.Mock).mock.calls)).not.toContain(
      "file:///",
    );
  });
});
