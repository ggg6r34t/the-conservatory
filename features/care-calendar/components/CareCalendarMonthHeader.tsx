import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { formatMonthTitle } from "@/features/care-calendar/services/careCalendarDerivationService";

interface CareCalendarMonthHeaderProps {
  visibleMonth: Date;
  showTodayButton: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export function CareCalendarMonthHeader({
  visibleMonth,
  showTodayButton,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: CareCalendarMonthHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        onPress={onPreviousMonth}
      >
        <Icon
          family="MaterialCommunityIcons"
          name="chevron-left"
          color={colors.primary}
          size={24}
        />
      </Pressable>

      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.primary }]}>
          {formatMonthTitle(visibleMonth)}
        </Text>
        {showTodayButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Jump to today"
            onPress={onToday}
            style={[
              styles.todayButton,
              { backgroundColor: colors.tertiaryContainer },
            ]}
          >
            <Text style={[styles.todayLabel, { color: colors.onTertiary }]}>
              Today
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next month"
        onPress={onNextMonth}
      >
        <Icon
          family="MaterialCommunityIcons"
          name="chevron-right"
          color={colors.primary}
          size={24}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  center: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  todayButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  todayLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
