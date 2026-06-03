import type { AlertDialogContextValue } from "@/components/feedback/AlertDialog/alert.types";
import { getSystemPermissionState } from "@/features/permissions/getSystemPermissionState";
import { getSystemPermissionConfirmOptions } from "@/features/permissions/permissionPromptCopy";
import type { SystemPermissionKind } from "@/features/permissions/systemPermissionKinds";

/**
 * In-app pre-prompt only. Does not call OS permission APIs.
 * Use when the caller owns the native request (e.g. expo-camera hook).
 */
export async function confirmBeforeSystemPermission(
  confirm: AlertDialogContextValue["confirm"],
  kind: SystemPermissionKind,
  sourceScreen: string,
): Promise<"proceed" | "cancelled" | "already_granted" | "blocked"> {
  const current = await getSystemPermissionState(kind);

  if (current === "granted") {
    return "already_granted";
  }

  if (current === "denied" || current === "unavailable") {
    return "blocked";
  }

  const copy = getSystemPermissionConfirmOptions(kind);
  const confirmed = await confirm({
    variant: "confirm",
    title: copy.title,
    message: copy.message,
    confirmLabel: copy.confirmLabel,
    cancelLabel: copy.cancelLabel,
    analyticsKey: copy.analyticsKey,
    sourceScreen,
  });

  return confirmed ? "proceed" : "cancelled";
}
