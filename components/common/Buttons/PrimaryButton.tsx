import { LinearGradient } from "expo-linear-gradient";
import { Link, type Href } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  href?: Href;
  loading?: boolean;
  disabled?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  href,
  loading = false,
  disabled = false,
}: PrimaryButtonProps) {
  const { colors } = useTheme();

  const content = (
    <LinearGradient
      colors={[colors.primary, colors.primaryContainer]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, disabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.surfaceBright} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </LinearGradient>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable disabled={disabled}>{content}</Pressable>
      </Link>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  disabled: {
    opacity: 0.4,
  },
  label: {
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
  },
});
