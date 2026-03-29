import type { CareLog, CareReminder } from "@/types/models";

import type { PlantListItem } from "../api/plantsClient";
import { derivePlantStatus, type PlantStatus } from "./plantStatusService";

export function buildPlantStatusMap(input: {
  plants: PlantListItem[];
  reminders: CareReminder[];
  logs: CareLog[];
  now?: Date;
}) {
  const remindersByPlantId = new Map<string, CareReminder[]>();
  for (const reminder of input.reminders) {
    const existing = remindersByPlantId.get(reminder.plantId) ?? [];
    existing.push(reminder);
    remindersByPlantId.set(reminder.plantId, existing);
  }

  const logsByPlantId = new Map<string, CareLog[]>();
  for (const log of input.logs) {
    const existing = logsByPlantId.get(log.plantId) ?? [];
    existing.push(log);
    logsByPlantId.set(log.plantId, existing);
  }

  return new Map(
    input.plants.map((plant) => [
      plant.id,
      derivePlantStatus({
        plant,
        reminders: remindersByPlantId.get(plant.id) ?? [],
        logs: logsByPlantId.get(plant.id) ?? [],
        now: input.now,
      }),
    ]),
  ) as Map<string, PlantStatus>;
}
