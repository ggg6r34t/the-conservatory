import { applyReminderPreferenceSideEffects as applyReminderPreferenceSideEffectsWithResolver } from "@/features/notifications/services/remindersScheduler";
import { getPlantById } from "@/features/plants/api/plantsClient";

export async function applyReminderPreferenceSideEffects(input: {
  userId: string;
  remindersEnabled: boolean;
}) {
  return applyReminderPreferenceSideEffectsWithResolver({
    ...input,
    getPlantNameById: async (plantId) => {
      const plant = await getPlantById(input.userId, plantId);
      return plant?.plant.name ?? null;
    },
  });
}
