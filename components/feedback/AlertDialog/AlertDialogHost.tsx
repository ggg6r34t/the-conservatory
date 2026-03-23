import { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
} from "react-native";
import { Portal } from "react-native-paper";

import { AlertDialogCard } from "./AlertDialogCard";
import type { QueuedAlertDialog } from "./alert.types";

interface AlertDialogHostProps {
  currentAlert: QueuedAlertDialog | null;
  loadingAction: "primary" | "secondary" | null;
  onBackdropPress: () => void;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
}

export function AlertDialogHost({
  currentAlert,
  loadingAction,
  onBackdropPress,
  onPrimaryPress,
  onSecondaryPress,
}: AlertDialogHostProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.965)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!currentAlert) {
      return;
    }

    const announcement = `${currentAlert.title}. ${currentAlert.message}`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [currentAlert]);

  useEffect(() => {
    if (!currentAlert) {
      return;
    }

    opacity.setValue(0);
    scale.setValue(0.965);
    translateY.setValue(12);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 16,
        mass: 0.9,
        stiffness: 190,
        useNativeDriver: false,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (currentAlert.dismissOnBackButton === false) {
          return true;
        }

        onBackdropPress();
        return true;
      },
    );

    return () => subscription.remove();
  }, [currentAlert, onBackdropPress, opacity, scale, translateY]);

  if (!currentAlert) {
    return null;
  }

  return (
    <Portal>
      <AlertDialogCard
        alert={currentAlert}
        containerStyle={{
          opacity,
          transform: [{ translateY }, { scale }],
        }}
        loadingAction={loadingAction}
        onBackdropPress={
          currentAlert.dismissOnBackdropPress === false
            ? () => undefined
            : onBackdropPress
        }
        onPrimaryPress={onPrimaryPress}
        onSecondaryPress={onSecondaryPress}
      />
    </Portal>
  );
}
