export type AppSnackbarVariant = "success" | "error" | "warning" | "info";

export interface SnackbarAction {
  label: string;
  onPress: () => void | Promise<void>;
  testID?: string;
  accessibilityLabel?: string;
}

export interface SnackbarOptions {
  variant: AppSnackbarVariant;
  message: string;
  action?: SnackbarAction;
  duration?: number;
  persist?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

export interface QueuedSnackbar extends SnackbarOptions {
  id: string;
}

export interface SnackbarContextValue {
  show: (options: SnackbarOptions) => string;
  success: (
    message: string,
    options?: Omit<SnackbarOptions, "variant" | "message">,
  ) => string;
  error: (
    message: string,
    options?: Omit<SnackbarOptions, "variant" | "message">,
  ) => string;
  warning: (
    message: string,
    options?: Omit<SnackbarOptions, "variant" | "message">,
  ) => string;
  info: (
    message: string,
    options?: Omit<SnackbarOptions, "variant" | "message">,
  ) => string;
  dismiss: (id?: string) => void;
  clear: () => void;
}
