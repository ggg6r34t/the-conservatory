import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { MonthlyHighlightCard } from "@/features/journal/components/MonthlyHighlightCard";
import type {
  MonthlyHighlightCardItem,
  MonthlyHighlightSection,
} from "@/features/journal/services/monthlyHighlightsService";

function splitIntoColumns(items: MonthlyHighlightCardItem[]) {
  const left: MonthlyHighlightCardItem[] = [];
  const right: MonthlyHighlightCardItem[] = [];

  items.forEach((item, index) => {
    if (index % 2 === 0) {
      left.push(item);
      return;
    }

    right.push(item);
  });

  return { left, right };
}

export function MonthlyHighlightMonthSection({
  section,
}: {
  section: MonthlyHighlightSection;
}) {
  const { colors } = useTheme();
  const columns = splitIntoColumns(section.items);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.onSurfaceVariant }]}>
          {section.seasonLabel}
        </Text>
        <Text style={[styles.title, { color: colors.primary }]}>
          {section.monthLabel}
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridColumn}>
          {columns.left.map((item) => (
            <MonthlyHighlightCard key={item.id} highlight={item} />
          ))}
        </View>

        <View style={[styles.gridColumn, styles.staggeredColumn]}>
          {columns.right.map((item) => (
            <MonthlyHighlightCard key={item.id} highlight={item} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.1,
  },
  title: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 32,
    lineHeight: 40,
  },
  grid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  gridColumn: {
    flex: 1,
    gap: 24,
  },
  staggeredColumn: {
    marginTop: 22,
  },
});
