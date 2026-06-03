import { createContext, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import { AlertDialogHost } from "@/components/feedback/AlertDialog/AlertDialogHost";
import type {
  AlertDialogContextValue,
  AlertDialogOptions,
  AlertDialogResult,
  QueuedAlertDialog,
} from "@/components/feedback/AlertDialog/alert.types";
import { dismissAlert, enqueueAlert, resolveAllAlerts } from "@/services/feedback/alertQueue";
import {
  trackAppAlertCancelled,
  trackAppAlertDismissed,
  trackAppAlertPrimaryAction,
  trackAppAlertSecondaryAction,
  trackAppAlertShown,
} from "@/services/feedback/alertAnalytics";
import { logger } from "@/utils/logger";

export const AlertContext = createContext<AlertDialogContextValue | null>(null);

function createDialogId() {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AlertProvider({ children }: PropsWithChildren) {
  const [queue, setQueue] = useState<QueuedAlertDialog[]>([]);
  const [loadingAction, setLoadingAction] = useState<"primary" | "secondary" | null>(null);
  const queueRef = useRef<QueuedAlertDialog[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    return () => {
      resolveAllAlerts(queueRef.current, { action: "dismiss" });
    };
  }, []);

  const dismiss = useCallback((id?: string) => {
    let dismissedAlert: QueuedAlertDialog | undefined;

    setQueue((current) => {
      dismissedAlert = id
        ? current.find((item) => item.id === id)
        : current[0];
      return dismissAlert(current, id);
    });

    if (dismissedAlert) {
      trackAppAlertDismissed({
        variant: dismissedAlert.variant,
        analyticsKey: dismissedAlert.analyticsKey,
        sourceScreen: dismissedAlert.sourceScreen,
      });
      dismissedAlert.resolve({ action: "dismiss" });
    }
    setLoadingAction(null);
  }, []);

  const show = useCallback((options: AlertDialogOptions) => {
    return new Promise<AlertDialogResult>((resolve) => {
      const nextAlert: QueuedAlertDialog = {
        message: "",
        dismissOnBackdropPress: true,
        dismissOnBackButton: true,
        ...options,
        id: createDialogId(),
        resolve,
      };

      trackAppAlertShown({
        variant: nextAlert.variant,
        analyticsKey: nextAlert.analyticsKey,
        sourceScreen: nextAlert.sourceScreen,
      });

      setQueue((current) => enqueueAlert(current, nextAlert));
    });
  }, []);

  const confirm = useCallback<AlertDialogContextValue["confirm"]>(
    async (options) => {
      const variant = options.variant ?? "confirm";
      const result = await show({
        ...options,
        variant,
        primaryAction: options.primaryAction ?? {
          label:
            options.confirmLabel ??
            (variant === "destructive" ? "Delete" : "Confirm"),
          tone: variant === "destructive" ? "danger" : "primary",
        },
        secondaryAction: options.secondaryAction ?? {
          label: options.cancelLabel ?? "Cancel",
        },
      });

      return result.action === "primary";
    },
    [show],
  );

  const currentAlert = queue[0] ?? null;

  const handleActionPress = useCallback(
    async (action: "primary" | "secondary") => {
      const activeAlert = queueRef.current[0];
      if (!activeAlert || loadingAction) {
        return;
      }

      const definition =
        action === "primary"
          ? activeAlert.primaryAction
          : activeAlert.secondaryAction;

      if (!definition) {
        if (action === "primary") {
          trackAppAlertPrimaryAction({
            variant: activeAlert.variant,
            analyticsKey: activeAlert.analyticsKey,
            sourceScreen: activeAlert.sourceScreen,
          });
        } else if (
          activeAlert.variant === "confirm" ||
          activeAlert.variant === "destructive" ||
          activeAlert.secondaryAction?.label?.toLowerCase() === "cancel"
        ) {
          trackAppAlertCancelled({
            variant: activeAlert.variant,
            analyticsKey: activeAlert.analyticsKey,
            sourceScreen: activeAlert.sourceScreen,
          });
        } else {
          trackAppAlertSecondaryAction({
            variant: activeAlert.variant,
            analyticsKey: activeAlert.analyticsKey,
            sourceScreen: activeAlert.sourceScreen,
          });
        }
        activeAlert.resolve({ action });
        setQueue((current) => dismissAlert(current, activeAlert.id));
        return;
      }

      try {
        const maybePromise = definition.onPress?.();
        if (maybePromise && typeof maybePromise === "object" && "then" in maybePromise) {
          setLoadingAction(action);
          await maybePromise;
        }

        if (action === "primary") {
          trackAppAlertPrimaryAction({
            variant: activeAlert.variant,
            analyticsKey: activeAlert.analyticsKey,
            sourceScreen: activeAlert.sourceScreen,
          });
        } else if (
          activeAlert.variant === "confirm" ||
          activeAlert.variant === "destructive" ||
          activeAlert.secondaryAction?.label?.toLowerCase() === "cancel"
        ) {
          trackAppAlertCancelled({
            variant: activeAlert.variant,
            analyticsKey: activeAlert.analyticsKey,
            sourceScreen: activeAlert.sourceScreen,
          });
        } else {
          trackAppAlertSecondaryAction({
            variant: activeAlert.variant,
            analyticsKey: activeAlert.analyticsKey,
            sourceScreen: activeAlert.sourceScreen,
          });
        }

        activeAlert.resolve({ action });
        setQueue((current) => dismissAlert(current, activeAlert.id));
      } catch (error) {
        logger.error("feedback.alert.action_failed", {
          alertId: activeAlert.id,
          variant: activeAlert.variant,
          action,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoadingAction(null);
      }
    },
    [loadingAction],
  );

  const value = useMemo<AlertDialogContextValue>(
    () => ({
      show,
      confirm,
      dismiss,
    }),
    [confirm, dismiss, show],
  );

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertDialogHost
        currentAlert={currentAlert}
        loadingAction={loadingAction}
        onBackdropPress={() => dismiss(currentAlert?.id)}
        onPrimaryPress={() => void handleActionPress("primary")}
        onSecondaryPress={() => void handleActionPress("secondary")}
      />
    </AlertContext.Provider>
  );
}
