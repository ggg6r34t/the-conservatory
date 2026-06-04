import { getCareTypeLabel } from "@/features/care-calendar/services/careCalendarLabels";
import type {
  CareCalendarCareType,
  CareCalendarEvent,
  CareCalendarEventStatus,
} from "@/features/care-calendar/types";
import type { PlantListItem } from "@/features/plants/api/plantsClient";

export const CARE_CALENDAR_MAX_DAY_CARE_ICONS = 2;
export const CARE_CALENDAR_MAX_DAY_PLANT_AVATARS = 3;

const ACTIVE_EVENT_STATUSES = new Set<CareCalendarEventStatus>([
  "overdue",
  "due_today",
  "upcoming",
]);

export type CareCalendarDayPlantMarker = {
  plantId: string;
  plantName: string;
  photoUri: string | null;
};

export type CareCalendarDayMarkers = {
  careTypes: CareCalendarCareType[];
  plants: CareCalendarDayPlantMarker[];
  hasOverdue: boolean;
  activeTaskCount: number;
};

function statusPriority(status: CareCalendarEventStatus) {
  switch (status) {
    case "overdue":
      return 0;
    case "due_today":
      return 1;
    case "upcoming":
      return 2;
    default:
      return 3;
  }
}

function compareEvents(left: CareCalendarEvent, right: CareCalendarEvent) {
  const statusDelta =
    statusPriority(left.status) - statusPriority(right.status);
  if (statusDelta !== 0) {
    return statusDelta;
  }

  return left.plantName.localeCompare(right.plantName);
}

export function deriveCareCalendarDayMarkers(input: {
  events: CareCalendarEvent[];
  plantById: Map<string, PlantListItem>;
}): CareCalendarDayMarkers {
  const activeEvents = input.events
    .filter((event) => ACTIVE_EVENT_STATUSES.has(event.status))
    .sort(compareEvents);

  const careTypeByPriority = new Map<CareCalendarCareType, number>();
  for (const event of activeEvents) {
    const existing = careTypeByPriority.get(event.careType);
    const next = statusPriority(event.status);
    if (existing == null || next < existing) {
      careTypeByPriority.set(event.careType, next);
    }
  }

  const careTypes = [...careTypeByPriority.entries()]
    .sort((left, right) => left[1] - right[1])
    .map(([careType]) => careType)
    .slice(0, CARE_CALENDAR_MAX_DAY_CARE_ICONS);

  const plants: CareCalendarDayPlantMarker[] = [];
  const seenPlantIds = new Set<string>();

  for (const event of activeEvents) {
    if (seenPlantIds.has(event.plantId)) {
      continue;
    }

    seenPlantIds.add(event.plantId);
    const plant = input.plantById.get(event.plantId);
    plants.push({
      plantId: event.plantId,
      plantName: plant?.name ?? event.plantName,
      photoUri: plant?.primaryPhotoUri ?? null,
    });

    if (plants.length >= CARE_CALENDAR_MAX_DAY_PLANT_AVATARS) {
      break;
    }
  }

  return {
    careTypes,
    plants,
    hasOverdue: activeEvents.some((event) => event.status === "overdue"),
    activeTaskCount: activeEvents.length,
  };
}

export function buildDayMarkerAccessibilityDetail(markers: CareCalendarDayMarkers) {
  if (markers.activeTaskCount === 0) {
    return "No active care tasks scheduled.";
  }

  const careSummary =
    markers.careTypes.length > 0
      ? markers.careTypes.map((careType) => getCareTypeLabel(careType)).join(", ")
      : "care";
  const plantSummary = markers.plants.map((plant) => plant.plantName).join(", ");
  const overflowPlants =
    markers.activeTaskCount > markers.plants.length
      ? `, plus ${markers.activeTaskCount - markers.plants.length} more`
      : "";

  return `${markers.activeTaskCount} active tasks: ${careSummary}. Plants: ${plantSummary}${overflowPlants}.`;
}
