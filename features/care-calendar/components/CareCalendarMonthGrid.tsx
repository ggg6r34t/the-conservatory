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
  selectedDateKey: string;
  events: CareCalendarEvent[];
  onSelectDate: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

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
          const selected = dateKey === selectedDateKey;
          const isToday = dateKey === todayKey;
          const hasOverdue = (grouped.get(dateKey) ?? []).some(
            (event) => event.status === "overdue",
          );

          return (
            <Pressable
              key={dateKey}
              accessibilityRole="button"
              accessibilityLabel={buildDayAccessibilityLabel({ date: day, taskCount })}
              accessibilityState={{ selected }}
              onPress={() => onSelectDate(dateKey)}
              style={styles.cell}
            >
              <View
                style={[
                  styles.dayBubble,
                  selected && { backgroundColor: colors.primaryContainer },
                  isToday &&
                    !selected && {
                      borderWidth: 1,
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
                          ? colors.onPrimaryContainer
                          : colors.onSurface
                        : colors.outline,
                    },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
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
            </Pressable>
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
  dayBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
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
