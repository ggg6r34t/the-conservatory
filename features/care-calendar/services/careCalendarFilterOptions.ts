import type {
  CareCalendarCareType,
  CareCalendarEvent,
  CareCalendarFilter,
} from "@/features/care-calendar/types";

type FilterOption = { id: CareCalendarFilter; label: string };

const CORE_FILTERS: FilterOption[] = [
  { id: "all", label: "All" },
  { id: "water", label: "Water" },
  { id: "feed", label: "Feed" },
  { id: "mist", label: "Mist" },
  { id: "overdue", label: "Overdue" },
];

const EXTENDED_FILTERS: FilterOption[] = [
  { id: "repot", label: "Repot" },
  { id: "prune", label: "Prune" },
  { id: "inspect", label: "Inspect" },
  { id: "soil_change", label: "Soil" },
  { id: "pest_check", label: "Pests" },
  { id: "note", label: "Notes" },
];

export function getVisibleCareCalendarFilters(input: {
  events: CareCalendarEvent[];
  showAiFilter: boolean;
}): FilterOption[] {
  const careTypes = new Set(input.events.map((event) => event.careType));
  const options = [...CORE_FILTERS];

  for (const filter of EXTENDED_FILTERS) {
    if (careTypes.has(filter.id as CareCalendarCareType)) {
      options.push(filter);
    }
  }

  if (input.showAiFilter) {
    options.push({ id: "ai_suggested", label: "AI suggested" });
  }

  return options;
}
