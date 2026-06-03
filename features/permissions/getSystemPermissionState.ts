import * as ImagePicker from "expo-image-picker";

import { getNotificationPermissionState } from "@/features/notifications/services/notificationService";
import {
  getMediaPermissionState,
} from "@/features/onboarding/services/permissionsService";
import type { SystemPermissionKind } from "@/features/permissions/systemPermissionKinds";
import type { PermissionState } from "@/features/onboarding/utils/permissionState";

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

export async function getCameraPermissionState(): Promise<PermissionState> {
  try {
    const permission = await ImagePicker.getCameraPermissionsAsync();
    return mapExpoPermissionStatus(permission.status, permission.canAskAgain);
  } catch {
    return "unavailable";
  }
}

export async function getMediaLibraryPermissionState(): Promise<PermissionState> {
  try {
    const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
    return mapExpoPermissionStatus(permission.status, permission.canAskAgain);
  } catch {
    return "unavailable";
  }
}

export async function getSystemPermissionState(
  kind: SystemPermissionKind,
): Promise<PermissionState> {
  switch (kind) {
    case "notifications":
      return getNotificationPermissionState();
    case "media":
      return getMediaPermissionState();
    case "camera":
      return getCameraPermissionState();
    case "mediaLibrary":
      return getMediaLibraryPermissionState();
  }
}
