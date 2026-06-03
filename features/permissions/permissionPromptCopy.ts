import type { SystemPermissionKind } from "@/features/permissions/systemPermissionKinds";

export function getSystemPermissionConfirmOptions(kind: SystemPermissionKind) {
  switch (kind) {
    case "notifications":
      return {
        title: "Enable care reminders?",
        message:
          "The Conservatory can send watering and care alerts. Next, your device will ask you to allow notifications.",
        confirmLabel: "Continue",
        cancelLabel: "Not now",
        analyticsKey: "system_permission_notifications_pre_prompt",
      };
    case "media":
      return {
        title: "Allow photos and camera?",
        message:
          "Add plant photos from your library or camera. Next, your device will ask for photo and camera access.",
        confirmLabel: "Continue",
        cancelLabel: "Not now",
        analyticsKey: "system_permission_media_pre_prompt",
      };
    case "camera":
      return {
        title: "Allow camera access?",
        message:
          "The camera is used only while you take or scan a photo. Next, your device will show its permission prompt.",
        confirmLabel: "Continue",
        cancelLabel: "Not now",
        analyticsKey: "system_permission_camera_pre_prompt",
      };
    case "mediaLibrary":
      return {
        title: "Allow photo library access?",
        message:
          "Choose an existing photo from your library. Next, your device will show its permission prompt.",
        confirmLabel: "Continue",
        cancelLabel: "Not now",
        analyticsKey: "system_permission_media_library_pre_prompt",
      };
  }
}
