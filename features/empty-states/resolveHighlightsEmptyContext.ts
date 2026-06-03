import type { EmptyStateContextKey } from "./types";

export function resolveHighlightsEmptyContext(input: {
  plantCount: number;
  progressPhotoCount: number;
}): EmptyStateContextKey {
  if (input.plantCount === 0) {
    return "highlights.noPlants";
  }

  if (input.progressPhotoCount === 0) {
    return "highlights.noPhotos";
  }

  return "highlights.none";
}
