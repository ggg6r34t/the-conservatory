import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import type { OAuthProvider } from "@/features/auth/services/oauthErrors";

interface OAuthProviderButtonProps {
  provider: OAuthProvider;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
}

export function OAuthProviderButton({
  label,
  icon,
  onPress,
  loading = false,
  disabled = false,
  accessibilityLabel,
}: OAuthProviderButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderColor: colors.borderSubtle,
          shadowColor: colors.shadow,
        },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconSlot}>{loading ? <ActivityIndicator /> : icon}</View>
        <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text>
        <View style={styles.iconSlot} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  iconSlot: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Manrope_600SemiBold",
    fontSize: 16,
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }],
  },
});
