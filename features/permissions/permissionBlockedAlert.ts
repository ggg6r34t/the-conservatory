import type { AlertDialogContextValue } from "@/components/feedback/AlertDialog/alert.types";
import type { SystemPermissionKind } from "@/features/permissions/systemPermissionKinds";

function getBlockedCopy(kind: SystemPermissionKind) {
  switch (kind) {
    case "notifications":
      return {
        title: "Notifications blocked",
        message:
          "Open device settings to allow notifications for care reminders.",
        analyticsKey: "system_permission_notifications_blocked",
      };
    case "media":
      return {
        title: "Photos & camera blocked",
        message:
          "Open device settings to allow photo library and camera access.",
        analyticsKey: "system_permission_media_blocked",
      };
    case "camera":
      return {
        title: "Camera blocked",
        message: "Open device settings to allow camera access.",
        analyticsKey: "system_permission_camera_blocked",
      };
    case "mediaLibrary":
      return {
        title: "Photo library blocked",
        message: "Open device settings to allow photo library access.",
        analyticsKey: "system_permission_media_library_blocked",
      };
  }
}

export function showSystemPermissionBlockedAlert(
  show: AlertDialogContextValue["show"],
  kind: SystemPermissionKind,
  sourceScreen: string,
) {
  const copy = getBlockedCopy(kind);
  void show({
    variant: "warning",
    title: copy.title,
    message: copy.message,
    primaryAction: { label: "Close" },
    analyticsKey: copy.analyticsKey,
    sourceScreen,
  });
}
