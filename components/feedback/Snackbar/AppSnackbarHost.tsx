import { useEffect, useState } from "react";
import { AccessibilityInfo, Keyboard } from "react-native";
import { Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { QueuedSnackbar } from "./snackbar.types";
import { SnackbarCard } from "./SnackbarCard";

interface AppSnackbarHostProps {
  currentSnackbar: QueuedSnackbar | null;
  onDismiss: () => void;
  onAction: () => void;
}

export function AppSnackbarHost({
  currentSnackbar,
  onDismiss,
  onAction,
}: AppSnackbarHostProps) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!currentSnackbar) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(currentSnackbar.message);
  }, [currentSnackbar]);

  if (!currentSnackbar) {
    return null;
  }

  return (
    <Portal>
      <SnackbarCard
        snackbar={currentSnackbar}
        bottomOffset={Math.max(18, insets.bottom + 18) + keyboardHeight}
        onDismiss={onDismiss}
        onAction={onAction}
      />
    </Portal>
  );
}
