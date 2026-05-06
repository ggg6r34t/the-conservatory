import {
  listReminders,
  updateReminderNotificationId,
} from "@/features/notifications/api/remindersClient";
import {
  cancelReminderNotification,
  scheduleReminderNotification,
} from "@/features/notifications/services/notificationService";
import { getPlantById } from "@/features/plants/api/plantsClient";
import type { CareReminder } from "@/types/models";

export async function reschedulePlantReminder(
  reminder: CareReminder,
  plantName: string,
) {
  await cancelReminderNotification(reminder.notificationId);

  if (!reminder.enabled || !reminder.nextDueAt) {
    await updateReminderNotificationId(reminder.id, null);
    return null;
  }

  const notificationId = await scheduleReminderNotification(
    plantName,
    reminder.nextDueAt,
  );
  await updateReminderNotificationId(reminder.id, notificationId);
  return notificationId;
}

export async function applyReminderPreferenceSideEffects(input: {
  userId: string;
  remindersEnabled: boolean;
}) {
  const reminders = await listReminders(input.userId);

  if (!input.remindersEnabled) {
    await Promise.all(
      reminders.map(async (reminder) => {
        await cancelReminderNotification(reminder.notificationId);
        if (reminder.notificationId) {
          await updateReminderNotificationId(reminder.id, null);
        }
      }),
    );
    return;
  }

  await Promise.all(
    reminders
      .filter((reminder) => Boolean(reminder.enabled && reminder.nextDueAt))
      .map(async (reminder) => {
        const plant = await getPlantById(input.userId, reminder.plantId);
        await reschedulePlantReminder(reminder, plant?.plant.name ?? "plant");
      }),
  );
}
