import { useMemo } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { shadowScale } from "@/styles/shadows";

import type { QueuedSnackbar } from "./snackbar.types";

interface SnackbarCardProps {
  snackbar: QueuedSnackbar;
  bottomOffset: number;
  onDismiss: () => void;
  onAction: () => void;
}

function getActionColor(
  variant: QueuedSnackbar["variant"],
  colors: ReturnType<typeof useTheme>["colors"],
) {
  switch (variant) {
    case "error":
      return colors.secondaryFixed;
    case "warning":
      return colors.secondaryFixed;
    case "success":
      return colors.secondaryFixed;
    case "info":
    default:
      return colors.secondaryFixed;
  }
}

export function SnackbarCard({
  snackbar,
  bottomOffset,
  onDismiss,
  onAction,
}: SnackbarCardProps) {
  const { colors } = useTheme();
  const translateX = useMemo(() => new Animated.Value(0), []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 12,
        onPanResponderMove: (_, gestureState) => {
          translateX.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) > 96) {
            Animated.timing(translateX, {
              toValue: gestureState.dx > 0 ? 420 : -420,
              duration: 140,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) {
                onDismiss();
              }
            });
            return;
          }

          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [onDismiss, translateX],
  );

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { bottom: bottomOffset, transform: [{ translateX }] },
      ]}
      {...panResponder.panHandlers}
    >
      <View
        accessibilityRole="alert"
        accessibilityLabel={snackbar.accessibilityLabel ?? snackbar.message}
        style={[styles.card, { backgroundColor: colors.inverseSurface }]}
        testID={snackbar.testID}
      >
        <Text style={[styles.message, { color: colors.onPrimary }]}>
          {snackbar.message}
        </Text>

        {snackbar.action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              snackbar.action.accessibilityLabel ?? snackbar.action.label
            }
            onPress={onAction}
            style={styles.actionPressable}
            testID={snackbar.action.testID}
          >
            <Text
              style={[
                styles.actionLabel,
                { color: getActionColor(snackbar.variant, colors) },
              ]}
            >
              {snackbar.action.label}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            onPress={onDismiss}
            style={styles.dismissPressable}
          >
            <Icon name="close" size={18} color={colors.onPrimary} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  card: {
    minHeight: 62,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...shadowScale.modalCard,
  },
  message: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  actionPressable: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  actionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  dismissPressable: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
