export function sortPhotosChronologically<
  T extends {
    capturedAt?: string | null;
    takenAt?: string | null;
    createdAt?: string | null;
  },
>(photos: T[]) {
  return [...photos].sort((left, right) => {
    const leftTimestamp =
      left.capturedAt ?? left.takenAt ?? left.createdAt ?? "";
    const rightTimestamp =
      right.capturedAt ?? right.takenAt ?? right.createdAt ?? "";
    return leftTimestamp.localeCompare(rightTimestamp);
  });
}

export function pickArchiveBeforeAfterPhotos<
  T extends {
    id: string;
    uri: string;
    capturedAt?: string | null;
    takenAt?: string | null;
    createdAt?: string | null;
  },
>(photos: T[]) {
  const sorted = sortPhotosChronologically(photos).filter((photo) => photo.uri);
  if (sorted.length < 2) {
    return null;
  }

  const beforePhoto = sorted[0];
  const afterPhoto = sorted[sorted.length - 1];
  if (beforePhoto.uri === afterPhoto.uri) {
    return null;
  }

  return { beforePhoto, afterPhoto };
}
