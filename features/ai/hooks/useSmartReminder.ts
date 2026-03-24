import { useMemo } from "react";

import { optimizeReminderTiming } from "@/features/ai/services/reminderOptimizationService";
import type { CareReminder, Plant, UserPreferences } from "@/types/models";

export function useSmartReminder(input: {
  plant: Plant;
  reminder?: CareReminder;
  preferences?: UserPreferences | null;
}) {
  return useMemo(
    () =>
      optimizeReminderTiming({
        plantName: input.plant.name,
        speciesName: input.plant.speciesName,
        wateringIntervalDays:
          input.reminder?.frequencyDays ?? input.plant.wateringIntervalDays,
        nextDueAt: input.reminder?.nextDueAt ?? input.plant.nextWaterDueAt ?? null,
        lastWateredAt: input.plant.lastWateredAt ?? null,
        lastTriggeredAt: input.reminder?.lastTriggeredAt ?? null,
        reminderEnabled: Boolean(input.reminder?.enabled ?? true),
        defaultWateringHour: input.preferences?.defaultWateringHour ?? 9,
      }),
    [input.plant, input.preferences?.defaultWateringHour, input.reminder],
  );
}
