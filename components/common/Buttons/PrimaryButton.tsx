import { LinearGradient } from "expo-linear-gradient";
import { Link, type Href } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

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
  tone?: "primary" | "memorial";
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
  const gradientColors =
    tone === "memorial"
      ? ([colors.secondary, colors.onSecondaryFixedVariant] as const)
      : ([colors.primary, colors.primaryContainer] as const);
  const foregroundColor =
    tone === "memorial" ? colors.onSecondary : colors.onPrimary;

  const content = (
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
      {loading ? (
        <ActivityIndicator color={foregroundColor} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === "leading" ? (
            <Icon
              family={iconFamily}
              color={foregroundColor}
              name={icon}
              size={18}
            />
          ) : null}
          <Text style={[styles.label, { color: foregroundColor }]}>{label}</Text>
          {icon && iconPosition === "trailing" ? (
            <Icon
              family={iconFamily}
              color={foregroundColor}
              name={icon}
              size={18}
            />
          ) : null}
        </View>
      )}
    </LinearGradient>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable disabled={disabled} style={compact && styles.inlinePressable}>
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
      style={compact && styles.inlinePressable}
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
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 20,
  },
});
