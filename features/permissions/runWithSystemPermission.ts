import type { AlertDialogContextValue } from "@/components/feedback/AlertDialog/alert.types";
import { showSystemPermissionBlockedAlert } from "@/features/permissions/permissionBlockedAlert";
import { promptAndRequestSystemPermission } from "@/features/permissions/promptAndRequestSystemPermission";
import type { SystemPermissionKind } from "@/features/permissions/systemPermissionKinds";

export async function runWithSystemPermission<T>({
  confirm,
  show,
  kind,
  sourceScreen,
  action,
}: {
  confirm: AlertDialogContextValue["confirm"];
  show: AlertDialogContextValue["show"];
  kind: SystemPermissionKind;
  sourceScreen: string;
  action: () => Promise<T>;
}): Promise<T | null> {
  const outcome = await promptAndRequestSystemPermission(
    confirm,
    kind,
    sourceScreen,
  );

  if (outcome.status === "cancelled") {
    return null;
  }

  if (outcome.status === "denied" || outcome.status === "unavailable") {
    showSystemPermissionBlockedAlert(show, kind, sourceScreen);
    return null;
  }

  return action();
}
