import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

export function MonthlyHighlightsHero() {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { gap: spacing.lg }]}>
      <Text style={[styles.eyebrow, { color: colors.secondary }]}>
        COLLECTION ARCHIVE
      </Text>
      <Text style={[styles.title, { color: colors.primary }]}>
        Monthly{"\n"}Highlights
      </Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        A curated visual record of your collection&apos;s growth and seasonal
        shifts.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 3,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
    lineHeight: 40,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
});
