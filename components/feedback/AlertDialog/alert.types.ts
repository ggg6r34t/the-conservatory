import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { Icon } from "@/components/common/Icon/Icon";

export type AlertDialogVariant =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "confirm"
  | "destructive";

export type AlertDialogTone = "primary" | "memorial" | "danger";

export type AlertDialogResult = {
  action: "primary" | "secondary" | "dismiss";
};

export interface AlertDialogAction {
  label: string;
  onPress?: () => void | Promise<void>;
  tone?: AlertDialogTone;
  testID?: string;
  accessibilityLabel?: string;
}

export interface AlertDialogOptions {
  variant: AlertDialogVariant;
  title: string;
  message: string;
  icon?: React.ComponentProps<typeof Icon>["name"];
  iconFamily?: React.ComponentProps<typeof Icon>["family"];
  primaryAction?: AlertDialogAction;
  secondaryAction?: AlertDialogAction;
  dismissOnBackdropPress?: boolean;
  dismissOnBackButton?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export interface QueuedAlertDialog extends AlertDialogOptions {
  id: string;
  resolve: (result: AlertDialogResult) => void;
}

export interface AlertDialogContextValue {
  show: (options: AlertDialogOptions) => Promise<AlertDialogResult>;
  confirm: (
    options: Omit<
      AlertDialogOptions,
      "variant" | "primaryAction" | "secondaryAction"
    > & {
      variant?: Extract<AlertDialogVariant, "confirm" | "destructive">;
      primaryAction?: AlertDialogAction;
      secondaryAction?: AlertDialogAction;
    },
  ) => Promise<boolean>;
  dismiss: (id?: string) => void;
}

export interface AlertDialogCardProps {
  alert: QueuedAlertDialog;
  loadingAction: "primary" | "secondary" | null;
  onBackdropPress: () => void;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}
