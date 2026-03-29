import type { GraveyardPlantListItem } from "@/features/plants/api/plantsClient";

export interface MemorialRoleSelection {
  featuredMemorial: GraveyardPlantListItem | null;
  reflectionMemorial: GraveyardPlantListItem | null;
  tributeMemorial: GraveyardPlantListItem | null;
  compactMemorials: GraveyardPlantListItem[];
}

interface MemorialProfile {
  memorial: GraveyardPlantListItem;
  hasMemorialNote: number;
  memorialNoteLength: number;
  plantNoteLength: number;
  hasCauseOfPassing: number;
  photoCount: number;
  careLogCount: number;
  hasPrimaryPhoto: number;
  archivedAtMs: number;
  createdAtMs: number;
}

function trimmedLength(value?: string | null) {
  return value?.trim().length ?? 0;
}

function toDateValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildProfile(memorial: GraveyardPlantListItem): MemorialProfile {
  return {
    memorial,
    hasMemorialNote: trimmedLength(memorial.memorialNote) > 0 ? 1 : 0,
    memorialNoteLength: trimmedLength(memorial.memorialNote),
    plantNoteLength: trimmedLength(memorial.plantNotes),
    hasCauseOfPassing: trimmedLength(memorial.causeOfPassing) > 0 ? 1 : 0,
    photoCount: memorial.photoCount ?? 0,
    careLogCount: memorial.careLogCount ?? 0,
    hasPrimaryPhoto: memorial.hasPrimaryPhoto ? 1 : 0,
    archivedAtMs: toDateValue(memorial.archivedAt),
    createdAtMs: toDateValue(memorial.createdAt),
  };
}

function compareMetrics(
  left: MemorialProfile,
  right: MemorialProfile,
  keys: (keyof Omit<MemorialProfile, "memorial">)[],
) {
  for (const key of keys) {
    const difference = right[key] - left[key];
    if (difference !== 0) {
      return difference;
    }
  }

  return left.memorial.id.localeCompare(right.memorial.id);
}

function sortProfiles(
  profiles: MemorialProfile[],
  keys: (keyof Omit<MemorialProfile, "memorial">)[],
) {
  return [...profiles].sort((left, right) => compareMetrics(left, right, keys));
}

function pickBest(
  profiles: MemorialProfile[],
  keys: (keyof Omit<MemorialProfile, "memorial">)[],
  excludedIds: Set<string>,
) {
  return (
    sortProfiles(
      profiles.filter((profile) => !excludedIds.has(profile.memorial.id)),
      keys,
    )[0]?.memorial ?? null
  );
}

export function selectMemorialRoles(
  memorials: GraveyardPlantListItem[],
): MemorialRoleSelection {
  if (!memorials.length) {
    return {
      featuredMemorial: null,
      reflectionMemorial: null,
      tributeMemorial: null,
      compactMemorials: [],
    };
  }

  const profiles = memorials.map(buildProfile);
  const usedIds = new Set<string>();

  const featuredMemorial = pickBest(
    profiles,
    [
      "hasMemorialNote",
      "memorialNoteLength",
      "hasCauseOfPassing",
      "photoCount",
      "careLogCount",
      "hasPrimaryPhoto",
      "archivedAtMs",
      "createdAtMs",
    ],
    usedIds,
  );

  if (featuredMemorial) {
    usedIds.add(featuredMemorial.id);
  }

  const reflectionMemorial = pickBest(
    profiles,
    [
      "hasMemorialNote",
      "memorialNoteLength",
      "plantNoteLength",
      "hasCauseOfPassing",
      "archivedAtMs",
      "createdAtMs",
    ],
    usedIds,
  );

  if (reflectionMemorial) {
    usedIds.add(reflectionMemorial.id);
  }

  const tributeMemorial = pickBest(
    profiles,
    [
      "photoCount",
      "careLogCount",
      "hasPrimaryPhoto",
      "hasMemorialNote",
      "memorialNoteLength",
      "hasCauseOfPassing",
      "archivedAtMs",
      "createdAtMs",
    ],
    usedIds,
  );

  if (tributeMemorial) {
    usedIds.add(tributeMemorial.id);
  }

  const compactMemorials = sortProfiles(
    profiles.filter((profile) => !usedIds.has(profile.memorial.id)),
    [
      "archivedAtMs",
      "hasMemorialNote",
      "memorialNoteLength",
      "photoCount",
      "careLogCount",
      "createdAtMs",
    ],
  ).map((profile) => profile.memorial);

  return {
    featuredMemorial,
    reflectionMemorial,
    tributeMemorial,
    compactMemorials,
  };
}
