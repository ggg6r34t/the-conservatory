import * as ImagePicker from "expo-image-picker";

import { requestNotificationPermissionsSystem } from "@/features/notifications/services/notificationService";
import {
  requestMediaPermissions,
} from "@/features/onboarding/services/permissionsService";
import type { SystemPermissionKind } from "@/features/permissions/systemPermissionKinds";
import {
  getCameraPermissionState,
  getMediaLibraryPermissionState,
} from "@/features/permissions/getSystemPermissionState";
import type { PermissionState } from "@/features/onboarding/utils/permissionState";
import { getNotificationPermissionState } from "@/features/notifications/services/notificationService";

async function requestCameraPermissionSystem(): Promise<PermissionState> {
  try {
    await ImagePicker.requestCameraPermissionsAsync();
    return getCameraPermissionState();
  } catch {
    return "unavailable";
  }
}

async function requestMediaLibraryPermissionSystem(): Promise<PermissionState> {
  try {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    return getMediaLibraryPermissionState();
  } catch {
    return "unavailable";
  }
}

export async function requestSystemPermission(
  kind: SystemPermissionKind,
): Promise<PermissionState> {
  switch (kind) {
    case "notifications": {
      const granted = await requestNotificationPermissionsSystem();
      return granted ? "granted" : await getNotificationPermissionState();
    }
    case "media":
      return requestMediaPermissions();
    case "camera":
      return requestCameraPermissionSystem();
    case "mediaLibrary":
      return requestMediaLibraryPermissionSystem();
  }
}
