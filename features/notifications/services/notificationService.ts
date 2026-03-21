import Constants from "expo-constants";
import { Platform } from "react-native";

const isExpoGo = Constants.appOwnership === "expo";
const shouldDisableNotificationsInCurrentRuntime =
  isExpoGo && Platform.OS !== "web";

let hasRegisteredHandler = false;

async function getNotificationsModule() {
  if (shouldDisableNotificationsInCurrentRuntime) {
    return null;
  }

  const notifications = await import("expo-notifications");

  if (!hasRegisteredHandler) {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    hasRegisteredHandler = true;
  }

  return notifications;
}

export async function ensureNotificationPermissions() {
  const notifications = await getNotificationsModule();
  if (!notifications) {
    return false;
  }

  const current = await notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const next = await notifications.requestPermissionsAsync();
  return next.granted;
}

export async function cancelReminderNotification(
  notificationId: string | null | undefined,
) {
  const notifications = await getNotificationsModule();
  if (!notifications || !notificationId) {
    return;
  }

  await notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function scheduleReminderNotification(
  plantName: string,
  nextDueAt: string,
) {
  const notifications = await getNotificationsModule();
  if (!notifications) {
    return null;
  }

  const granted = await ensureNotificationPermissions();
  if (!granted) {
    return null;
  }

  const triggerDate = new Date(nextDueAt);
  if (triggerDate.getTime() <= Date.now()) {
    return null;
  }

  const identifier = await notifications.scheduleNotificationAsync({
    content: {
      title: `${plantName} needs care`,
      body: "Open The Conservatory to log today's ritual.",
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return identifier;
}
