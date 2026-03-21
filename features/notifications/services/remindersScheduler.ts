import {
  cancelReminderNotification,
  scheduleReminderNotification,
} from "@/features/notifications/services/notificationService";
import { updateReminderNotificationId } from "@/features/notifications/api/remindersClient";
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
