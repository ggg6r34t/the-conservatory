import type { PlantListItem } from "@/features/plants/api/plantsClient";
import type { CareLog, CareReminder } from "@/types/models";

import { PlantHighlights } from "./PlantHighlights";

interface UpcomingCareProps {
  plants: PlantListItem[];
  reminders: CareReminder[];
  logs: CareLog[];
}

export function UpcomingCare({ plants, reminders, logs }: UpcomingCareProps) {
  return <PlantHighlights plants={plants} reminders={reminders} logs={logs} />;
}
