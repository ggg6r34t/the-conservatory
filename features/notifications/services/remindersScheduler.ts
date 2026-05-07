import {
  listReminders,
  updateReminderNotificationId,
} from "@/features/notifications/api/remindersClient";
import {
  cancelReminderNotification,
  scheduleReminderNotification,
} from "@/features/notifications/services/notificationService";
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
  getPlantNameById?: (plantId: string) => Promise<string | null>;
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
        const plantName =
          (await input.getPlantNameById?.(reminder.plantId)) ?? "plant";
        await reschedulePlantReminder(reminder, plantName);
      }),
  );
}
