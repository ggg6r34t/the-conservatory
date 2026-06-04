import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { trackCareCalendarFilterUsed } from "@/features/care-calendar/analytics";
import type { CareCalendarFilter } from "@/features/care-calendar/types";

type FilterOption = { id: CareCalendarFilter; label: string };

interface CareCalendarFiltersProps {
  value: CareCalendarFilter;
  options: FilterOption[];
  onChange: (value: CareCalendarFilter) => void;
}

export function CareCalendarFilters({
  value,
  options,
  onChange,
}: CareCalendarFiltersProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((filter) => {
        const selected = value === filter.id;
        return (
          <Pressable
            key={filter.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(filter.id);
              trackCareCalendarFilterUsed(filter.id);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: selected
                  ? colors.tertiaryContainer
                  : colors.surfaceContainerHigh,
              },
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                { color: selected ? colors.onTertiary : colors.onSurface },
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
});
