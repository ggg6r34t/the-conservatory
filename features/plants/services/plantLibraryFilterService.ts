import { isFeatureAllowed } from "@/features/billing/services/featureAccess";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import type { PlantLibraryFilter } from "@/types/ui";

export const PREMIUM_LIBRARY_FILTERS = [
  "by-location",
  "by-species",
] as const satisfies readonly PlantLibraryFilter[];

export type PremiumLibraryFilter = (typeof PREMIUM_LIBRARY_FILTERS)[number];

export function isPremiumLibraryFilter(
  filter: PlantLibraryFilter,
): filter is PremiumLibraryFilter {
  return PREMIUM_LIBRARY_FILTERS.includes(filter as PremiumLibraryFilter);
}

export function resolvePlantLibraryFilter(
  filter: PlantLibraryFilter,
  isPremium: boolean,
): PlantLibraryFilter {
  if (
    isPremiumLibraryFilter(filter) &&
    !isFeatureAllowed("advanced_library_filters", isPremium)
  ) {
    return "all";
  }

  return filter;
}

export function normalizeLocationGroupLabel(location?: string | null) {
  const trimmed = location?.trim();
  return trimmed ? trimmed : "Unplaced";
}

export function normalizeSpeciesGroupLabel(speciesName?: string | null) {
  const trimmed = speciesName?.trim();
  return trimmed ? trimmed : "Unknown species";
}

function locationSortKey(location?: string | null) {
  const trimmed = location?.trim();
  return trimmed ? trimmed.toLowerCase() : `\uffff${trimmed ?? ""}`;
}

export function groupPlantsForAdvancedFilter(
  plants: PlantListItem[],
  filter: PremiumLibraryFilter,
) {
  const groups = new Map<string, { title: string; plants: PlantListItem[] }>();

  for (const plant of plants) {
    const title =
      filter === "by-location"
        ? normalizeLocationGroupLabel(plant.location)
        : normalizeSpeciesGroupLabel(plant.speciesName);
    const key = title.toLowerCase();
    const existing = groups.get(key);

    if (existing) {
      existing.plants.push(plant);
      continue;
    }

    groups.set(key, { title, plants: [plant] });
  }

  const sections = Array.from(groups.values());

  sections.sort((left, right) => {
    if (filter === "by-location") {
      const leftUnplaced = left.title === "Unplaced";
      const rightUnplaced = right.title === "Unplaced";
      if (leftUnplaced !== rightUnplaced) {
        return leftUnplaced ? 1 : -1;
      }
    }

    return left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
    });
  });

  for (const section of sections) {
    section.plants.sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
    );
  }

  return sections;
}

export function comparePlantsForAdvancedFilter(
  left: PlantListItem,
  right: PlantListItem,
  filter: PremiumLibraryFilter,
) {
  if (filter === "by-species") {
    const speciesCompare = left.speciesName.localeCompare(right.speciesName, undefined, {
      sensitivity: "base",
    });
    if (speciesCompare !== 0) {
      return speciesCompare;
    }
  }

  if (filter === "by-location") {
    const locationCompare = locationSortKey(left.location).localeCompare(
      locationSortKey(right.location),
    );
    if (locationCompare !== 0) {
      return locationCompare;
    }
  }

  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}
