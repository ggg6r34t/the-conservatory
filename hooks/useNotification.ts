import { useAlert } from "@/hooks/useAlert";

/**
 * @deprecated Use `useAlert` / `useAppAlert` for user-facing dialogs.
 */
export function useNotification() {
  const alert = useAlert();

  return {
    showSuccess: (title: string, message: string) =>
      void alert.show({
        variant: "success",
        title,
        message,
        primaryAction: { label: "Close" },
      }),
    showError: (title: string, message: string) =>
      void alert.show({
        variant: "error",
        title,
        message,
        primaryAction: { label: "Close", tone: "danger" },
      }),
  };
}
