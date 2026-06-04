import { getCareCalendarCareTypeIcon } from "@/features/care-calendar/services/careCalendarCareTypeIcons";
import type { CareCalendarCareType } from "@/features/care-calendar/types";

type CareLogFormAlignedCareType = Extract<
  CareCalendarCareType,
  "water" | "mist" | "feed" | "repot" | "prune" | "inspect" | "note"
>;

const CARE_LOG_FORM_ICONS: Record<
  CareLogFormAlignedCareType,
  { family: "MaterialIcons" | "MaterialCommunityIcons"; name: string }
> = {
  water: { family: "MaterialIcons", name: "water-drop" },
  mist: { family: "MaterialIcons", name: "opacity" },
  feed: { family: "MaterialCommunityIcons", name: "white-balance-sunny" },
  repot: { family: "MaterialCommunityIcons", name: "shovel" },
  prune: { family: "MaterialCommunityIcons", name: "content-cut" },
  inspect: { family: "MaterialCommunityIcons", name: "magnify" },
  note: { family: "MaterialCommunityIcons", name: "note-edit-outline" },
};

describe("care calendar care type icons", () => {
  it.each(
    Object.entries(CARE_LOG_FORM_ICONS) as [
      CareLogFormAlignedCareType,
      (typeof CARE_LOG_FORM_ICONS)[CareLogFormAlignedCareType],
    ][],
  )("matches CareLogForm icon for %s", (careType, expected) => {
    expect(getCareCalendarCareTypeIcon(careType)).toEqual(expected);
  });

  it("maps calendar-only care types to distinct icons", () => {
    expect(getCareCalendarCareTypeIcon("soil_change").name).toBe("shovel");
    expect(getCareCalendarCareTypeIcon("pest_check").name).toBe("bug-outline");
  });
});
