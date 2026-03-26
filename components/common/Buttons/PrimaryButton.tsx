import { LinearGradient } from "expo-linear-gradient";
import { Link, type Href } from "expo-router";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { shadowScale } from "@/styles/shadows";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  href?: Href;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconFamily?: React.ComponentProps<typeof Icon>["family"];
  iconPosition?: "leading" | "trailing";
  compact?: boolean;
  tone?: "primary" | "memorial" | "danger";
}

export function PrimaryButton({
  label,
  onPress,
  href,
  loading = false,
  disabled = false,
  icon,
  iconFamily,
  iconPosition = "leading",
  compact = false,
  tone = "primary",
}: PrimaryButtonProps) {
  const { colors } = useTheme();
  const loadingOpacity = useRef(new Animated.Value(loading ? 1 : 0)).current;
  const gradientColors =
    tone === "memorial"
      ? ([colors.secondary, colors.onSecondaryFixedVariant] as const)
      : tone === "danger"
        ? ([colors.error, "#8c1414"] as const)
        : ([colors.primary, colors.primaryContainer] as const);
  const foregroundColor =
    tone === "memorial"
      ? colors.onSecondary
      : tone === "danger"
        ? colors.onError
        : colors.onPrimary;
  const iconSize = 20;

  useEffect(() => {
    Animated.timing(loadingOpacity, {
      toValue: loading ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [loading, loadingOpacity]);

  const content = (
    <View>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.12, y: 0.08 }}
        end={{ x: 0.88, y: 0.92 }}
        style={[
          styles.gradient,
          compact && styles.compact,
          disabled && styles.disabled,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.loadingOverlay, { opacity: loadingOpacity }]}
        >
          <ActivityIndicator color={foregroundColor} />
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: loading ? 0 : 1,
              transform: [{ scale: loading ? 0.985 : 1 }],
            },
          ]}
        >
          {icon && iconPosition === "leading" ? (
            <Icon
              family={iconFamily}
              color={foregroundColor}
              name={icon}
              size={iconSize}
            />
          ) : null}
          <Text style={[styles.label, { color: foregroundColor }]}>
            {label}
          </Text>
          {icon && iconPosition === "trailing" ? (
            <Icon
              family={iconFamily}
              color={foregroundColor}
              name={icon}
              size={iconSize}
            />
          ) : null}
        </Animated.View>
      </LinearGradient>
    </View>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable
          disabled={disabled}
          style={({ pressed }) => [
            compact && styles.inlinePressable,
            pressed && !disabled && styles.pressed,
          ]}
        >
          {content}
        </Pressable>
      </Link>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        compact && styles.inlinePressable,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inlinePressable: {
    alignSelf: "flex-start",
  },
  gradient: {
    minHeight: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    ...shadowScale.elevatedCard,
  },
  compact: {
    minHeight: 56,
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.988 }],
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 20,
  },
});
