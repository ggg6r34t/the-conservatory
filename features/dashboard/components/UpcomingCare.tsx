import type { PlantListItem } from "@/features/plants/api/plantsClient";

import { PlantHighlights } from "./PlantHighlights";

interface UpcomingCareProps {
  plants: PlantListItem[];
}

export function UpcomingCare({ plants }: UpcomingCareProps) {
  return <PlantHighlights plants={plants} />;
}
