import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { CareCalendarTaskCard } from "@/features/care-calendar/components/CareCalendarTaskCard";
import { formatAgendaDayTitle } from "@/features/care-calendar/services/careCalendarDerivationService";
import type { CareCalendarEvent } from "@/features/care-calendar/types";
import type { CareScheduleSuggestion } from "@/features/care-calendar/types";

interface CareCalendarAgendaProps {
  events: CareCalendarEvent[];
  suggestionsById: Map<string, CareScheduleSuggestion>;
  onLogCare: (event: CareCalendarEvent) => void;
  onMarkDone: (event: CareCalendarEvent) => void;
  onReschedule: (event: CareCalendarEvent) => void;
  onEditReminder: (event: CareCalendarEvent) => void;
  onAcceptSuggestion: (event: CareCalendarEvent) => void;
  onDismissSuggestion: (event: CareCalendarEvent) => void;
  allowAiSuggestionActions?: boolean;
  busy?: boolean;
  showDayHeaders?: boolean;
}

export function CareCalendarAgenda({
  events,
  suggestionsById,
  onLogCare,
  onMarkDone,
  onReschedule,
  onEditReminder,
  onAcceptSuggestion,
  onDismissSuggestion,
  allowAiSuggestionActions = true,
  busy,
  showDayHeaders = true,
}: CareCalendarAgendaProps) {
  const { colors, spacing } = useTheme();
  const grouped = new Map<string, CareCalendarEvent[]>();

  for (const event of events) {
    const bucket = grouped.get(event.dueDate) ?? [];
    bucket.push(event);
    grouped.set(event.dueDate, bucket);
  }

  const dates = [...grouped.keys()].sort();

  return (
    <View style={[styles.wrap, { gap: spacing.lg }]}>
      {dates.map((dateKey) => (
        <View key={dateKey} style={styles.section}>
          {showDayHeaders ? (
            <Text style={[styles.dayTitle, { color: colors.primary }]}>
              {formatAgendaDayTitle(dateKey)}
            </Text>
          ) : null}
          <View style={styles.tasks}>
            {(grouped.get(dateKey) ?? []).map((event) => (
              <CareCalendarTaskCard
                key={event.id}
                event={event}
                suggestion={suggestionsById.get(event.id)}
                busy={busy}
                onLogCare={() => onLogCare(event)}
                onMarkDone={() => onMarkDone(event)}
                onReschedule={() => onReschedule(event)}
                onEditReminder={
                  event.reminderId ? () => onEditReminder(event) : undefined
                }
                onAcceptSuggestion={
                  allowAiSuggestionActions && event.isAiSuggested
                    ? () => onAcceptSuggestion(event)
                    : undefined
                }
                onDismissSuggestion={
                  allowAiSuggestionActions && event.isAiSuggested
                    ? () => onDismissSuggestion(event)
                    : undefined
                }
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  section: {
    gap: 12,
  },
  dayTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  tasks: {
    gap: 16,
  },
});
