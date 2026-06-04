import { StyleSheet, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

const PLACEHOLDER_ROWS = 6;
const PLACEHOLDER_COLS = 7;

export function CareCalendarMonthGridSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {Array.from({ length: PLACEHOLDER_ROWS }).map((_, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {Array.from({ length: PLACEHOLDER_COLS }).map((__, colIndex) => (
            <View
              key={`cell-${rowIndex}-${colIndex}`}
              style={[
                styles.cell,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  cell: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    opacity: 0.7,
  },
});
