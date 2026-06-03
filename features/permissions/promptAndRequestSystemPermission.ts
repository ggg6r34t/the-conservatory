import type { AlertDialogContextValue } from "@/components/feedback/AlertDialog/alert.types";
import { getSystemPermissionState } from "@/features/permissions/getSystemPermissionState";
import { getSystemPermissionConfirmOptions } from "@/features/permissions/permissionPromptCopy";
import { requestSystemPermission } from "@/features/permissions/requestSystemPermission";
import type { SystemPermissionKind } from "@/features/permissions/systemPermissionKinds";
import type { PermissionState } from "@/features/onboarding/utils/permissionState";

export type SystemPermissionPromptOutcome =
  | { status: "granted" }
  | { status: "cancelled" }
  | { status: "denied" }
  | { status: "unavailable" };

export async function promptAndRequestSystemPermission(
  confirm: AlertDialogContextValue["confirm"],
  kind: SystemPermissionKind,
  sourceScreen: string,
): Promise<SystemPermissionPromptOutcome> {
  const current = await getSystemPermissionState(kind);

  if (current === "granted") {
    return { status: "granted" };
  }

  if (current === "denied") {
    return { status: "denied" };
  }

  if (current === "unavailable") {
    return { status: "unavailable" };
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

  if (!confirmed) {
    return { status: "cancelled" };
  }

  const next = await requestSystemPermission(kind);

  if (next === "granted") {
    return { status: "granted" };
  }

  if (next === "unavailable") {
    return { status: "unavailable" };
  }

  return { status: "denied" };
}
