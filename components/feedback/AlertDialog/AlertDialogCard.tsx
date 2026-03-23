import { BlurView } from "expo-blur";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { shadowScale, shadowWithColor } from "@/styles/shadows";

import type { AlertDialogCardProps } from "./alert.types";

function getVariantColor(
  variant: AlertDialogCardProps["alert"]["variant"],
  colors: ReturnType<typeof useTheme>["colors"],
) {
  switch (variant) {
    case "success":
      return colors.primary;
    case "warning":
      return colors.secondary;
    case "error":
    case "destructive":
      return colors.error;
    case "confirm":
      return colors.primary;
    case "info":
    default:
      return colors.onSurfaceVariant;
  }
}

export function AlertDialogCard({
  alert,
  loadingAction,
  onBackdropPress,
  onPrimaryPress,
  onSecondaryPress,
  containerStyle,
}: AlertDialogCardProps) {
  const { colors } = useTheme();
  const iconColor = getVariantColor(alert.variant, colors);

  return (
    <View style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss dialog overlay"
        onPress={onBackdropPress}
        style={StyleSheet.absoluteFill}
      >
        <BlurView intensity={58} tint="light" style={StyleSheet.absoluteFill}>
          <View style={styles.backdropTint} />
          <View style={styles.backdropShade} />
        </BlurView>
      </Pressable>

      <Animated.View
        accessibilityRole="alert"
        accessibilityLabel={alert.accessibilityLabel ?? alert.title}
        accessibilityHint={alert.accessibilityHint}
        style={[
          styles.card,
          containerStyle,
          shadowWithColor(shadowScale.modalCard, colors.backdrop),
          {
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: "rgba(255, 255, 255, 0.74)",
          },
        ]}
        testID={alert.testID}
      >
        <View pointerEvents="none" style={styles.cardGlow} />

        {alert.icon ? (
          <View style={styles.iconWrap}>
            <Icon
              family={alert.iconFamily}
              name={alert.icon}
              size={28}
              color={iconColor}
            />
          </View>
        ) : null}

        <Text style={[styles.title, { color: colors.onSurface }]}>
          {alert.title}
        </Text>
        <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>
          {alert.message}
        </Text>

        <View style={styles.actions}>
          {alert.secondaryAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                alert.secondaryAction.accessibilityLabel ??
                alert.secondaryAction.label
              }
              disabled={loadingAction !== null}
              onPress={onSecondaryPress}
              style={styles.actionPressable}
              testID={alert.secondaryAction.testID}
            >
              <Text
                style={[
                  styles.secondaryActionLabel,
                  { color: colors.primary },
                  loadingAction === "secondary" && styles.actionDisabled,
                ]}
              >
                {alert.secondaryAction.label}
              </Text>
            </Pressable>
          ) : null}

          {alert.primaryAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                alert.primaryAction.accessibilityLabel ??
                alert.primaryAction.label
              }
              disabled={loadingAction !== null}
              onPress={onPrimaryPress}
              style={styles.actionPressable}
              testID={alert.primaryAction.testID}
            >
              <Text
                style={[
                  styles.primaryActionLabel,
                  {
                    color:
                      alert.primaryAction.tone === "danger"
                        ? colors.error
                        : alert.primaryAction.tone === "memorial"
                          ? colors.secondary
                          : colors.primary,
                  },
                  loadingAction === "primary" && styles.actionDisabled,
                ]}
              >
                {loadingAction === "primary"
                  ? `${alert.primaryAction.label}...`
                  : alert.primaryAction.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(251, 249, 244, 0.38)",
  },
  backdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(48, 49, 46, 0.06)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 18,
    gap: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  iconWrap: {
    marginBottom: -2,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 26,
    lineHeight: 32,
  },
  message: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 24,
    marginTop: 10,
  },
  actionPressable: {
    minHeight: 44,
    justifyContent: "center",
  },
  primaryActionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  secondaryActionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  actionDisabled: {
    opacity: 0.45,
  },
});
