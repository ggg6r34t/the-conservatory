import type { ComponentProps } from "react";

import type { Icon } from "@/components/common/Icon/Icon";
import type { CareCalendarCareType } from "@/features/care-calendar/types";

export type CareCalendarCareTypeIcon = {
  family: NonNullable<ComponentProps<typeof Icon>["family"]>;
  name: string;
};

const CARE_TYPE_ICONS: Record<CareCalendarCareType, CareCalendarCareTypeIcon> = {
  water: { family: "MaterialIcons", name: "water-drop" },
  mist: { family: "MaterialIcons", name: "opacity" },
  feed: { family: "MaterialCommunityIcons", name: "white-balance-sunny" },
  repot: { family: "MaterialCommunityIcons", name: "shovel" },
  prune: { family: "MaterialCommunityIcons", name: "content-cut" },
  inspect: { family: "MaterialCommunityIcons", name: "magnify" },
  soil_change: { family: "MaterialCommunityIcons", name: "shovel" },
  pest_check: { family: "MaterialCommunityIcons", name: "bug-outline" },
  note: { family: "MaterialCommunityIcons", name: "note-edit-outline" },
};

export function getCareCalendarCareTypeIcon(careType: CareCalendarCareType) {
  return CARE_TYPE_ICONS[careType];
}
