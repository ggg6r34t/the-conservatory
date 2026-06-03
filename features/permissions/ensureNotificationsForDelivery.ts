import type { AlertDialogContextValue } from "@/components/feedback/AlertDialog/alert.types";
import { showSystemPermissionBlockedAlert } from "@/features/permissions/permissionBlockedAlert";
import { promptAndRequestSystemPermission } from "@/features/permissions/promptAndRequestSystemPermission";

export async function ensureNotificationsForDelivery({
  confirm,
  show,
  sourceScreen,
}: {
  confirm: AlertDialogContextValue["confirm"];
  show: AlertDialogContextValue["show"];
  sourceScreen: string;
}): Promise<boolean> {
  const outcome = await promptAndRequestSystemPermission(
    confirm,
    "notifications",
    sourceScreen,
  );

  if (outcome.status === "granted") {
    return true;
  }

  if (outcome.status === "denied" || outcome.status === "unavailable") {
    showSystemPermissionBlockedAlert(show, "notifications", sourceScreen);
  }

  return false;
}
