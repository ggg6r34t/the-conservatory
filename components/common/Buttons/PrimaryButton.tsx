import { LinearGradient } from "expo-linear-gradient";
import { Link, type Href } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  href?: Href;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  compact?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  href,
  loading = false,
  disabled = false,
  icon,
  compact = false,
}: PrimaryButtonProps) {
  const { colors } = useTheme();

  const content = (
    <LinearGradient
      colors={[colors.primary, colors.primaryContainer]}
      start={{ x: 0.12, y: 0.08 }}
      end={{ x: 0.88, y: 0.92 }}
      style={[
        styles.gradient,
        compact && styles.compact,
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.surfaceBright} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Icon
              color={colors.surfaceBright}
              name={icon}
              size={16}
            />
          ) : null}
          <Text style={styles.label}>{label}</Text>
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
    shadowColor: "rgba(27, 28, 25, 0.04)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 32,
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
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
  },
});
