import { createContext, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import { AppSnackbarHost } from "@/components/feedback/Snackbar/AppSnackbarHost";
import type {
  QueuedSnackbar,
  SnackbarContextValue,
  SnackbarOptions,
} from "@/components/feedback/Snackbar/snackbar.types";
import { dismissSnackbar, enqueueSnackbar } from "@/services/feedback/snackbarQueue";
import { logger } from "@/utils/logger";

const DEFAULT_SNACKBAR_DURATION = 4000;

export const SnackbarContext = createContext<SnackbarContextValue | null>(null);

function createSnackbarId() {
  return `snackbar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SnackbarProvider({ children }: PropsWithChildren) {
  const [queue, setQueue] = useState<QueuedSnackbar[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<QueuedSnackbar[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const dismiss = useCallback((id?: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setQueue((current) => dismissSnackbar(current, id));
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setQueue([]);
  }, []);

  const show = useCallback((options: SnackbarOptions) => {
    const id = createSnackbarId();
    const nextSnackbar: QueuedSnackbar = {
      ...options,
      id,
    };

    setQueue((current) => enqueueSnackbar(current, nextSnackbar));
    return id;
  }, []);

  const createVariantHelper = useCallback(
    (variant: QueuedSnackbar["variant"]) =>
      (message: string, options: Omit<SnackbarOptions, "variant" | "message"> = {}) =>
        show({ ...options, variant, message }),
    [show],
  );

  const currentSnackbar = queue[0] ?? null;

  useEffect(() => {
    if (!currentSnackbar || currentSnackbar.persist) {
      return;
    }

    timerRef.current = setTimeout(() => {
      dismiss(currentSnackbar.id);
    }, currentSnackbar.duration ?? DEFAULT_SNACKBAR_DURATION);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentSnackbar, dismiss]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleAction = useCallback(async () => {
    const activeSnackbar = queueRef.current[0];
    if (!activeSnackbar?.action) {
      dismiss(activeSnackbar?.id);
      return;
    }

    try {
      await activeSnackbar.action.onPress();
    } catch (error) {
      logger.error("feedback.snackbar.action_failed", {
        snackbarId: activeSnackbar.id,
        variant: activeSnackbar.variant,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      dismiss(activeSnackbar.id);
    }
  }, [dismiss]);

  const value = useMemo<SnackbarContextValue>(
    () => ({
      show,
      success: createVariantHelper("success"),
      error: createVariantHelper("error"),
      warning: createVariantHelper("warning"),
      info: createVariantHelper("info"),
      dismiss,
      clear,
    }),
    [clear, createVariantHelper, dismiss, show],
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <AppSnackbarHost
        currentSnackbar={currentSnackbar}
        onDismiss={() => dismiss(currentSnackbar?.id)}
        onAction={() => void handleAction()}
      />
    </SnackbarContext.Provider>
  );
}
