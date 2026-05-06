import * as ImagePicker from "expo-image-picker";

import {
  ensureNotificationPermissions,
  getNotificationPermissionState,
} from "@/features/notifications/services/notificationService";
import {
  combinePermissionStates,
  type PermissionState,
} from "@/features/onboarding/utils/permissionState";
import { logger } from "@/utils/logger";

export interface OnboardingPermissionSnapshot {
  notifications: PermissionState;
  media: PermissionState;
}

function mapExpoPermissionStatus(
  status: ImagePicker.PermissionStatus,
  canAskAgain: boolean | null | undefined,
): PermissionState {
  if (status === "granted") {
    return "granted";
  }

  if (canAskAgain === false) {
    return "denied";
  }

  return "undetermined";
}

export async function getMediaPermissionState(): Promise<PermissionState> {
  try {
    const [libraryPermission, cameraPermission] = await Promise.all([
      ImagePicker.getMediaLibraryPermissionsAsync(),
      ImagePicker.getCameraPermissionsAsync(),
    ]);

    return combinePermissionStates([
      mapExpoPermissionStatus(
        libraryPermission.status,
        libraryPermission.canAskAgain,
      ),
      mapExpoPermissionStatus(
        cameraPermission.status,
        cameraPermission.canAskAgain,
      ),
    ]);
  } catch (error) {
    logger.warn("onboarding.permissions.media_status_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return "unavailable";
  }
}

export async function requestMediaPermissions(): Promise<PermissionState> {
  try {
    const [libraryPermission, cameraPermission] = await Promise.all([
      ImagePicker.requestMediaLibraryPermissionsAsync(),
      ImagePicker.requestCameraPermissionsAsync(),
    ]);

    return combinePermissionStates([
      mapExpoPermissionStatus(
        libraryPermission.status,
        libraryPermission.canAskAgain,
      ),
      mapExpoPermissionStatus(
        cameraPermission.status,
        cameraPermission.canAskAgain,
      ),
    ]);
  } catch (error) {
    logger.warn("onboarding.permissions.media_request_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return "unavailable";
  }
}

export async function getPermissionSnapshot(): Promise<OnboardingPermissionSnapshot> {
  const [notifications, media] = await Promise.all([
    getNotificationPermissionState(),
    getMediaPermissionState(),
  ]);

  return {
    notifications,
    media,
  };
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  try {
    const granted = await ensureNotificationPermissions();

    if (granted) {
      return "granted";
    }

    return await getNotificationPermissionState();
  } catch (error) {
    logger.warn("onboarding.permissions.notification_request_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return "unavailable";
  }
}
