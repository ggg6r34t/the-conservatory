import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { trackCareCalendarFilterUsed } from "@/features/care-calendar/analytics";
import type { CareCalendarFilter } from "@/features/care-calendar/types";

const FILTERS: { id: CareCalendarFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "water", label: "Water" },
  { id: "feed", label: "Feed" },
  { id: "mist", label: "Mist" },
  { id: "repot", label: "Repot" },
  { id: "prune", label: "Prune" },
  { id: "inspect", label: "Inspect" },
  { id: "overdue", label: "Overdue" },
  { id: "ai_suggested", label: "AI suggested" },
];

interface CareCalendarFiltersProps {
  value: CareCalendarFilter;
  onChange: (value: CareCalendarFilter) => void;
  showAiFilter: boolean;
}

export function CareCalendarFilters({
  value,
  onChange,
  showAiFilter,
}: CareCalendarFiltersProps) {
  const { colors } = useTheme();
  const options = showAiFilter
    ? FILTERS
    : FILTERS.filter((filter) => filter.id !== "ai_suggested");

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
