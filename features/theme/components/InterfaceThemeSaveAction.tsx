import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { usePreferredThemeMutation } from "@/features/theme/hooks/usePreferredThemeMutation";

export function InterfaceThemeSaveAction() {
  const router = useRouter();
  const { colors } = useTheme();
  const preferredThemeMutation = usePreferredThemeMutation();
  const disabled = preferredThemeMutation.isPending;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Save theme and go back"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => router.back()}
      style={styles.button}
    >
      <Text
        style={[
          styles.label,
          {
            color: colors.primary,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        Save
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  label: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
});
