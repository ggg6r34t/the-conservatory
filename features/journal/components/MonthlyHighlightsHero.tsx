import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

export function MonthlyHighlightsHero() {
  const { colors } = useTheme();

  return (
    <View style={styles.hero}>
      <Text style={[styles.eyebrow, { color: colors.secondary }]}>
        COLLECTION ARCHIVE
      </Text>
      <Text style={[styles.heroTitle, { color: colors.primary }]}>
        Monthly{"\n"}Highlights
      </Text>
      <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
        A curated visual record of your collection&apos;s growth and seasonal
        shifts.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 10,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
  },
  heroTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 40,
    lineHeight: 50,
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 28,
    maxWidth: 340,
  },
});
