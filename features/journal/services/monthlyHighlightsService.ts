import type { CareLog, Photo } from "@/types/models";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import {
  resolveGrowthTimelinePhotoRole,
  resolveGrowthTimelinePhotoTimestamp,
  resolveGrowthTimelinePhotoUri,
} from "@/features/plants/services/growthTimelineService";

export const MONTHLY_HIGHLIGHTS_PER_MONTH = 3;

export interface MonthlyHighlightCardItem {
  id: string;
  name: string;
  imageUri: string;
  date: string;
  dateLabel: string;
  metadata: string;
}

export interface MonthlyHighlightSection {
  key: string;
  seasonLabel: string;
  monthLabel: string;
  items: MonthlyHighlightCardItem[];
}

export interface MonthlyHighlightsResult {
  sections: MonthlyHighlightSection[];
  previewItems: MonthlyHighlightCardItem[];
}

type MonthlyHighlightCandidate = {
  id: string;
  name: string;
  speciesName: string;
  location?: string | null;
  monthKey: string;
  latestPhotoTimestamp: string;
  representativeImageUri: string;
  representativePhotoId: string;
  progressPhotoCount: number;
  careLogCount: number;
};

function formatMonthLabel(dateValue: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(dateValue);
}

function formatDateChip(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  })
    .format(new Date(value))
    .toUpperCase();
}

function normalizeMetaPart(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ").toUpperCase() ?? "";
}

function buildMetadata(candidate: Pick<MonthlyHighlightCandidate, "location" | "speciesName">) {
  return (
    normalizeMetaPart(candidate.location) ||
    normalizeMetaPart(candidate.speciesName) ||
    "SPECIMEN"
  );
}

function getSeasonLabel(monthIndex: number) {
  switch (monthIndex) {
    case 2:
    case 3:
    case 4:
      return "EARLY SPRING AWAKENING";
    case 5:
    case 6:
    case 7:
      return "HIGH SUMMER ABUNDANCE";
    case 8:
    case 9:
    case 10:
      return "AUTUMN TURNING";
    case 11:
    case 0:
    case 1:
    default:
      return "WINTER QUIETUDE";
  }
}

function normalizeIsoTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function resolveMonthKey(value: string) {
  return value.slice(0, 7);
}

function compareTimestampDesc(left: string, right: string) {
  return right.localeCompare(left);
}

function compareRepresentativePhotos(
  left: { timestamp: string; photoId: string },
  right: { timestamp: string; photoId: string },
) {
  const timestampComparison = compareTimestampDesc(left.timestamp, right.timestamp);
  if (timestampComparison !== 0) {
    return timestampComparison;
  }

  return left.photoId.localeCompare(right.photoId);
}

function compareCandidates(
  left: MonthlyHighlightCandidate,
  right: MonthlyHighlightCandidate,
) {
  if (left.progressPhotoCount !== right.progressPhotoCount) {
    return right.progressPhotoCount - left.progressPhotoCount;
  }

  const timestampComparison = compareTimestampDesc(
    left.latestPhotoTimestamp,
    right.latestPhotoTimestamp,
  );
  if (timestampComparison !== 0) {
    return timestampComparison;
  }

  if (left.careLogCount !== right.careLogCount) {
    return right.careLogCount - left.careLogCount;
  }

  return left.id.localeCompare(right.id);
}

export function buildMonthlyHighlights(input: {
  plants: PlantListItem[];
  photos: Photo[];
  logs: CareLog[];
  previewLimit?: number;
  maxHighlightsPerMonth?: number;
}): MonthlyHighlightsResult {
  const maxHighlightsPerMonth =
    input.maxHighlightsPerMonth ?? MONTHLY_HIGHLIGHTS_PER_MONTH;
  const previewLimit = input.previewLimit ?? 6;

  if (!input.plants.length || !input.photos.length) {
    return {
      sections: [],
      previewItems: [],
    };
  }

  const plantsById = new Map(input.plants.map((plant) => [plant.id, plant]));
  const candidatesByMonthPlant = new Map<string, MonthlyHighlightCandidate>();

  for (const photo of input.photos) {
    if (resolveGrowthTimelinePhotoRole(photo) !== "progress") {
      continue;
    }

    const plant = plantsById.get(photo.plantId);
    if (!plant) {
      continue;
    }

    const imageUri = resolveGrowthTimelinePhotoUri(photo);
    const timestamp = resolveGrowthTimelinePhotoTimestamp(photo);
    if (!imageUri || !timestamp) {
      continue;
    }

    const monthKey = resolveMonthKey(timestamp);
    const candidateKey = `${monthKey}:${plant.id}`;
    const existing = candidatesByMonthPlant.get(candidateKey);

    if (!existing) {
      candidatesByMonthPlant.set(candidateKey, {
        id: plant.id,
        name: plant.name,
        speciesName: plant.speciesName,
        location: plant.location,
        monthKey,
        latestPhotoTimestamp: timestamp,
        representativeImageUri: imageUri,
        representativePhotoId: photo.id,
        progressPhotoCount: 1,
        careLogCount: 0,
      });
      continue;
    }

    existing.progressPhotoCount += 1;

    if (
      compareRepresentativePhotos(
        {
          timestamp,
          photoId: photo.id,
        },
        {
          timestamp: existing.latestPhotoTimestamp,
          photoId: existing.representativePhotoId,
        },
      ) < 0
    ) {
      existing.latestPhotoTimestamp = timestamp;
      existing.representativeImageUri = imageUri;
      existing.representativePhotoId = photo.id;
    }
  }

  const careLogsByMonthPlant = new Map<string, number>();
  for (const log of input.logs) {
    if (!plantsById.has(log.plantId)) {
      continue;
    }

    const timestamp = normalizeIsoTimestamp(log.loggedAt);
    if (!timestamp) {
      continue;
    }

    const key = `${resolveMonthKey(timestamp)}:${log.plantId}`;
    careLogsByMonthPlant.set(key, (careLogsByMonthPlant.get(key) ?? 0) + 1);
  }

  for (const candidate of candidatesByMonthPlant.values()) {
    candidate.careLogCount =
      careLogsByMonthPlant.get(`${candidate.monthKey}:${candidate.id}`) ?? 0;
  }

  const grouped = new Map<string, MonthlyHighlightCandidate[]>();
  for (const candidate of candidatesByMonthPlant.values()) {
    const existing = grouped.get(candidate.monthKey) ?? [];
    existing.push(candidate);
    grouped.set(candidate.monthKey, existing);
  }

  const sections = Array.from(grouped.entries())
    .sort(([leftKey], [rightKey]) => rightKey.localeCompare(leftKey))
    .map(([monthKey, candidates]) => {
      const monthDate = new Date(`${monthKey}-01T00:00:00.000Z`);
      const items = [...candidates]
        .sort(compareCandidates)
        .slice(0, maxHighlightsPerMonth)
        .map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          imageUri: candidate.representativeImageUri,
          date: candidate.latestPhotoTimestamp,
          dateLabel: formatDateChip(candidate.latestPhotoTimestamp),
          metadata: buildMetadata(candidate),
        }));

      return {
        key: monthKey,
        seasonLabel: getSeasonLabel(monthDate.getUTCMonth()),
        monthLabel: formatMonthLabel(monthDate),
        items,
      } satisfies MonthlyHighlightSection;
    })
    .filter((section) => section.items.length > 0);

  return {
    sections,
    previewItems: sections.flatMap((section) => section.items).slice(0, previewLimit),
  };
}
