import { parseStructuredCareLogNote } from "@/features/ai/services/observationTaggingService";
import type {
  CareLog,
  CareLogType,
  Photo,
  PlantWithRelations,
} from "@/types/models";

type SupportedIconFamily = "MaterialIcons";

export interface PlantActivityItem {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  condition: CareLog["currentCondition"] | null;
  logType: CareLogType;
  icon: string;
  iconFamily: SupportedIconFamily;
  loggedAt: string;
}

export interface PlantActivitySection {
  key: string;
  label: string;
  items: PlantActivityItem[];
}

function toDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isToday(value: string) {
  return toDateKey(value) === toDateKey(new Date().toISOString());
}

function formatSectionLabel(value: string) {
  if (isToday(value)) {
    return "TODAY";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  })
    .format(new Date(value))
    .toUpperCase();
}

function formatTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getPlantActivityTitle(logType: CareLogType) {
  switch (logType) {
    case "water":
      return "Full Soak & Fertilize";
    case "mist":
      return "Humidity Refresh";
    case "feed":
      return "Nutrient Feeding";
    case "repot":
      return "Repotted & Refreshed";
    case "prune":
      return "Pruned Yellowing Leaf";
    case "inspect":
      return "Weekly Health Check";
    case "pest":
      return "Pest Inspection";
    case "note":
    default:
      return "Growth Observation";
  }
}

export function getPlantActivityBody(logType: CareLogType, notes?: string | null) {
  const parsed = parseStructuredCareLogNote(notes);

  if (parsed.body) {
    return parsed.body;
  }

  switch (logType) {
    case "water":
      return "Watered thoroughly and let the container drain before returning it to place.";
    case "mist":
      return "Lifted ambient moisture with a light mist across the foliage.";
    case "feed":
      return "Fed gently to support steady growth and richer leaf tone.";
    case "repot":
      return "Refreshed the root zone with new soil and a roomier container.";
    case "prune":
      return "Trimmed away tired growth to keep the silhouette balanced.";
    case "inspect":
      return "Checked leaves, stems, and soil to note overall condition.";
    case "pest":
      return "Inspected for early pest signs and cleaned the foliage carefully.";
    case "note":
    default:
      return "Captured a fresh observation for this specimen.";
  }
}

export function getPlantActivityIcon(logType: CareLogType) {
  switch (logType) {
    case "water":
      return "water-drop";
    case "mist":
      return "opacity";
    case "feed":
      return "spa";
    case "repot":
      return "wb-sunny";
    case "prune":
      return "content-cut";
    case "inspect":
      return "search";
    case "pest":
      return "bug-report";
    case "note":
    default:
      return "notes";
  }
}

export function getPlantActivityIconFamily(
  _logType: CareLogType,
): SupportedIconFamily {
  return "MaterialIcons";
}

export function getPrimaryPlantPhoto(data: Pick<PlantWithRelations, "photos">) {
  return data.photos.find((photo) => photo.isPrimary === 1) ?? data.photos[0] ?? null;
}

export function getPlantActivityHeroPhoto(
  data: Pick<PlantWithRelations, "photos">,
): Photo | null {
  return getPrimaryPlantPhoto(data);
}

function toItem(log: CareLog): PlantActivityItem {
  return {
    id: log.id,
    title: getPlantActivityTitle(log.logType),
    body: getPlantActivityBody(log.logType, log.notes),
    timeLabel: formatTimeLabel(log.loggedAt),
    condition: log.currentCondition ?? null,
    logType: log.logType,
    icon: getPlantActivityIcon(log.logType),
    iconFamily: getPlantActivityIconFamily(log.logType),
    loggedAt: log.loggedAt,
  };
}

export function buildPlantActivitySections(
  data: Pick<PlantWithRelations, "logs">,
): PlantActivitySection[] {
  const sortedLogs = [...data.logs].sort((left, right) =>
    right.loggedAt.localeCompare(left.loggedAt),
  );

  const sections = new Map<string, PlantActivitySection>();

  sortedLogs.forEach((log) => {
    const key = toDateKey(log.loggedAt);
    const existing = sections.get(key);

    if (existing) {
      existing.items.push(toItem(log));
      return;
    }

    sections.set(key, {
      key,
      label: formatSectionLabel(log.loggedAt),
      items: [toItem(log)],
    });
  });

  return [...sections.values()];
}
