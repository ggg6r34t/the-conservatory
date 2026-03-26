import type { CareLog } from "@/types/models";

export interface MonthlyHighlightSourceItem {
  id: string;
  name: string;
  speciesName: string;
  imageUri: string;
  updatedAt: string;
  location?: string | null;
}

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

function buildMetadata(item: MonthlyHighlightSourceItem) {
  return (
    normalizeMetaPart(item.location) ||
    normalizeMetaPart(item.speciesName) ||
    "SPECIMEN"
  );
}

export function buildMonthlyHighlightSections(input: {
  items: MonthlyHighlightSourceItem[];
  logs: CareLog[];
}) {
  const latestLogByPlantId = new Map<string, CareLog>();

  for (const log of input.logs) {
    const existing = latestLogByPlantId.get(log.plantId);
    if (!existing || log.loggedAt > existing.loggedAt) {
      latestLogByPlantId.set(log.plantId, log);
    }
  }

  const grouped = new Map<string, MonthlyHighlightSection>();

  for (const item of input.items) {
    const date = latestLogByPlantId.get(item.id)?.loggedAt ?? item.updatedAt;
    const dateValue = new Date(date);
    const monthKey = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}`;
    const existing =
      grouped.get(monthKey) ??
      ({
        key: monthKey,
        seasonLabel: getSeasonLabel(dateValue.getMonth()),
        monthLabel: formatMonthLabel(dateValue),
        items: [],
      } satisfies MonthlyHighlightSection);

    existing.items.push({
      id: item.id,
      name: item.name,
      imageUri: item.imageUri,
      date,
      dateLabel: formatDateChip(date),
      metadata: buildMetadata(item),
    });
    grouped.set(monthKey, existing);
  }

  return Array.from(grouped.values())
    .map((section) => ({
      ...section,
      items: [...section.items].sort((left, right) =>
        right.date.localeCompare(left.date),
      ),
    }))
    .sort((left, right) => right.key.localeCompare(left.key));
}
