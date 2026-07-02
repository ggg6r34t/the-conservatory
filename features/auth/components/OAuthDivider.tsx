import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

export function OAuthDivider() {
  const { colors } = useTheme();

  return (
    <View style={styles.row} accessibilityRole="text">
      <View style={[styles.line, { backgroundColor: colors.borderSubtle }]} />
      <Text style={[styles.label, { color: colors.secondary }]}>OR</Text>
      <View style={[styles.line, { backgroundColor: colors.borderSubtle }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 4,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  label: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});
