import { useMemo, useRef } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { CareCalendarDayMarkers } from "@/features/care-calendar/components/CareCalendarDayMarkers";
import { deriveCareCalendarDayMarkers } from "@/features/care-calendar/services/careCalendarDayMarkers";
import {
  buildDayAccessibilityLabel,
  getMonthGridDates,
  groupEventsByDate,
  isSameLocalMonth,
  toLocalDateKey,
} from "@/features/care-calendar/services/careCalendarDerivationService";
import type { CareCalendarEvent } from "@/features/care-calendar/types";
import type { PlantListItem } from "@/features/plants/api/plantsClient";

interface CareCalendarMonthGridProps {
  month: Date;
  selectedDateKey: string | null;
  events: CareCalendarEvent[];
  plants: PlantListItem[];
  onSelectDate: (dateKey: string) => void;
  onShiftMonth?: (delta: number) => void;
  onPlantLongPress?: (plantId: string) => void;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
export const CARE_CALENDAR_DAY_MARKER_SIZE = 36;

export function CareCalendarMonthGrid({
  month,
  selectedDateKey,
  events,
  plants,
  onSelectDate,
  onShiftMonth,
  onPlantLongPress,
}: CareCalendarMonthGridProps) {
  const { colors } = useTheme();
  const swipeTriggered = useRef(false);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (!onShiftMonth || swipeTriggered.current) {
            return;
          }

          if (gesture.dx <= -40) {
            swipeTriggered.current = true;
            onShiftMonth(1);
          } else if (gesture.dx >= 40) {
            swipeTriggered.current = true;
            onShiftMonth(-1);
          }

          setTimeout(() => {
            swipeTriggered.current = false;
          }, 250);
        },
      }),
    [onShiftMonth],
  );
  const grouped = groupEventsByDate(events);
  const { days } = getMonthGridDates(month);
  const todayKey = toLocalDateKey(new Date());
  const plantById = useMemo(
    () => new Map(plants.map((plant) => [plant.id, plant] as const)),
    [plants],
  );

  return (
    <View style={styles.wrap} {...(onShiftMonth ? panResponder.panHandlers : {})}>
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
          const dayEvents = grouped.get(dateKey) ?? [];
          const markers = deriveCareCalendarDayMarkers({
            events: dayEvents,
            plantById,
          });
          const selected =
            selectedDateKey != null && dateKey === selectedDateKey;
          const isToday = dateKey === todayKey;

          return (
            <View key={dateKey} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={buildDayAccessibilityLabel({
                  date: day,
                  markers,
                })}
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
                <CareCalendarDayMarkers
                  markers={markers}
                  selected={selected}
                  onPlantLongPress={onPlantLongPress}
                />
              </Pressable>
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
    paddingVertical: 4,
  },
  dayPressable: {
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 2,
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
});
