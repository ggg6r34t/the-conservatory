import { useMemo } from "react";

import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { trackCareCalendarOpened } from "@/features/care-calendar/analytics";
import { deriveCareCalendarEvents } from "@/features/care-calendar/services/careCalendarDerivationService";
import { getCareTypeVerb } from "@/features/care-calendar/services/careCalendarLabels";
import { formatDueLabel } from "@/utils/dateFormatter";
import type { CareLog, CareReminder, PlantWithRelations } from "@/types/models";

interface PlantUpcomingCarePreviewProps {
  data: PlantWithRelations;
}

export function PlantUpcomingCarePreview({ data }: PlantUpcomingCarePreviewProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const events = useMemo(
    () =>
      deriveCareCalendarEvents({
        plants: [data.plant],
        reminders: data.reminders,
        logs: data.logs,
        plantId: data.plant.id,
        horizonDays: 30,
      }).filter((event) => event.status !== "completed").slice(0, 3),
    [data],
  );

  if (!events.length) {
    return null;
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
    >
      <Text style={[styles.eyebrow, { color: colors.secondary }]}>
        Upcoming care
      </Text>
      <View style={styles.list}>
        {events.map((event) => (
          <Text
            key={event.id}
            style={[styles.line, { color: colors.onSurfaceVariant }]}
          >
            {getCareTypeVerb(event.careType)} · {formatDueLabel(`${event.dueDate}T12:00:00`)}
          </Text>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          trackCareCalendarOpened("plant_detail");
          router.push(`/care-calendar?plantId=${data.plant.id}`);
        }}
      >
        <Text style={[styles.link, { color: colors.secondary }]}>
          View in calendar
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 22,
    gap: 10,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  list: {
    gap: 6,
  },
  line: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  link: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: 4,
  },
});
