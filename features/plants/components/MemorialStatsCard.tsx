import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { shadowScale } from "@/styles/shadows";

interface MemorialStatsCardProps {
  yearRange: string;
  causeLabel: string | null;
}

export function MemorialStatsCard({
  yearRange,
  causeLabel,
}: MemorialStatsCardProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.statsCard,
        {
          backgroundColor: colors.surfaceContainerLowest,
          marginHorizontal: spacing.lg,
        },
      ]}
    >
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
            DURATION OF LIFE
          </Text>
          <Text style={[styles.statValue, { color: colors.onSurface }]}>
            {yearRange}
          </Text>
        </View>

        <View style={styles.statBlockEnd}>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
            FINAL CHAPTER
          </Text>
          {causeLabel ? (
            <View
              style={[
                styles.causeChip,
                { backgroundColor: colors.secondaryContainer },
              ]}
            >
              <Text
                style={[
                  styles.causeChipLabel,
                  { color: colors.onSecondaryContainer },
                ]}
              >
                {causeLabel}
              </Text>
            </View>
          ) : (
            <Text style={[styles.statValue, { color: colors.onSurface }]}>
              -
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginTop: -20,
    zIndex: 10,
    ...shadowScale.subtleSurface,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  statBlock: {
    gap: 6,
  },
  statBlockEnd: {
    gap: 6,
    alignItems: "flex-end",
  },
  statLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
  },
  statValue: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  causeChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  causeChipLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
  },
});
