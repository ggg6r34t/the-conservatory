import * as Notifications from "expo-notifications";

import {
  listFeatureRequestNotifications,
  markFeatureRequestNotificationClicked,
  markFeatureRequestNotificationDelivered,
  markFeatureRequestNotificationOpened,
} from "@/features/product-feedback/api/featureRequestsClient";
import { trackProductFeedbackEvent } from "@/features/product-feedback/services/featureRequestAnalyticsService";
import { ensureNotificationPermissions } from "@/features/notifications/services/notificationService";

export async function deliverPendingFeatureReleaseNotifications(userId: string) {
  const notifications = await listFeatureRequestNotifications(userId);
  const pending = notifications.filter(
    (notification) => !notification.deliveredAt,
  );

  if (!pending.length) {
    return [];
  }

  const permissionGranted = await ensureNotificationPermissions({
    requestIfNeeded: false,
  });
  const delivered: string[] = [];

  for (const notification of pending) {
    await markFeatureRequestNotificationDelivered(notification.id);

    if (permissionGranted) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            type: "feature_released",
            requestId: notification.requestId,
            notificationId: notification.id,
          },
        },
        trigger: null,
      });
    }

    trackProductFeedbackEvent("feature_request_notification_delivered", {
      notificationId: notification.id,
      requestId: notification.requestId,
      deliveredViaPush: permissionGranted,
    });

    delivered.push(notification.id);
  }

  return delivered;
}

export async function recordFeatureRequestNotificationOpened(
  notificationId: string,
) {
  await markFeatureRequestNotificationOpened(notificationId);
  trackProductFeedbackEvent("feature_request_notification_opened", {
    notificationId,
  });
}

export async function recordFeatureRequestNotificationClicked(
  notificationId: string,
  requestId?: string | null,
) {
  await markFeatureRequestNotificationClicked(notificationId);
  trackProductFeedbackEvent("feature_request_notification_clicked", {
    notificationId,
    requestId: requestId ?? null,
  });
}
