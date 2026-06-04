import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import {
  buildDayAccessibilityLabel,
  getMonthGridDates,
  groupEventsByDate,
  isSameLocalMonth,
  toLocalDateKey,
} from "@/features/care-calendar/services/careCalendarDerivationService";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

interface CareCalendarMonthGridProps {
  month: Date;
  selectedDateKey: string | null;
  events: CareCalendarEvent[];
  onSelectDate: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
export const CARE_CALENDAR_DAY_MARKER_SIZE = 36;

export function CareCalendarMonthGrid({
  month,
  selectedDateKey,
  events,
  onSelectDate,
}: CareCalendarMonthGridProps) {
  const { colors } = useTheme();
  const grouped = groupEventsByDate(events);
  const { days } = getMonthGridDates(month);
  const todayKey = toLocalDateKey(new Date());

  return (
    <View style={styles.wrap}>
      <View style={styles.weekdays}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text
            key={`${label}-${index}`}
            style={[styles.weekday, { color: colors.onSurfaceVariant }]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const dateKey = toLocalDateKey(day);
          const inMonth = isSameLocalMonth(day, month);
          const taskCount = grouped.get(dateKey)?.length ?? 0;
          const selected =
            selectedDateKey != null && dateKey === selectedDateKey;
          const isToday = dateKey === todayKey;
          const hasOverdue = (grouped.get(dateKey) ?? []).some(
            (event) => event.status === "overdue",
          );

          return (
            <View key={dateKey} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={buildDayAccessibilityLabel({ date: day, taskCount })}
                accessibilityState={{ selected }}
                onPress={() => onSelectDate(dateKey)}
                style={styles.dayPressable}
              >
                <View
                  style={[
                    styles.dayBubble,
                    selected && {
                      backgroundColor: colors.primary,
                    },
                    isToday && {
                      borderWidth: 1.5,
                      borderColor: colors.secondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      {
                        color: inMonth
                          ? selected
                            ? colors.onPrimary
                            : colors.onSurface
                          : colors.outline,
                      },
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
              </Pressable>
              {taskCount > 0 ? (
                <View style={styles.markerRow}>
                  <View
                    style={[
                      styles.marker,
                      {
                        backgroundColor: hasOverdue
                          ? colors.error
                          : colors.secondary,
                      },
                    ]}
                  />
                </View>
              ) : (
                <View style={styles.markerSpacer} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  weekdays: {
    flexDirection: "row",
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    lineHeight: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    paddingVertical: 6,
    gap: 4,
  },
  dayPressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayBubble: {
    width: CARE_CALENDAR_DAY_MARKER_SIZE,
    height: CARE_CALENDAR_DAY_MARKER_SIZE,
    borderRadius: CARE_CALENDAR_DAY_MARKER_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dayNumber: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    lineHeight: 18,
  },
  markerRow: {
    minHeight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  markerSpacer: {
    minHeight: 6,
  },
});
