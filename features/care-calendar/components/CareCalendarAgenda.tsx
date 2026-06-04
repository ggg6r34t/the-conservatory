import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { CareCalendarTaskCard } from "@/features/care-calendar/components/CareCalendarTaskCard";
import { formatAgendaDayTitle } from "@/features/care-calendar/services/careCalendarDerivationService";
import type { CareCalendarEvent } from "@/features/care-calendar/types";
import type { CareScheduleSuggestion } from "@/features/care-calendar/types";

interface CareCalendarAgendaProps {
  events: CareCalendarEvent[];
  suggestionsById: Map<string, CareScheduleSuggestion>;
  onLogCare: (event: CareCalendarEvent) => void;
  onReschedule: (event: CareCalendarEvent) => void;
  onEditReminder: (event: CareCalendarEvent) => void;
  onAcceptSuggestion: (event: CareCalendarEvent) => void;
  onDismissSuggestion: (event: CareCalendarEvent) => void;
  allowAiSuggestionActions?: boolean;
  busy?: boolean;
  showDayHeaders?: boolean;
  collapseCompleted?: boolean;
}

function groupByDate(events: CareCalendarEvent[]) {
  const grouped = new Map<string, CareCalendarEvent[]>();

  for (const event of events) {
    const bucket = grouped.get(event.dueDate) ?? [];
    bucket.push(event);
    grouped.set(event.dueDate, bucket);
  }

  return grouped;
}

function AgendaSection({
  dates,
  grouped,
  suggestionsById,
  showDayHeaders,
  colors,
  handlers,
}: {
  dates: string[];
  grouped: Map<string, CareCalendarEvent[]>;
  suggestionsById: Map<string, CareScheduleSuggestion>;
  showDayHeaders: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
  handlers: Omit<CareCalendarAgendaProps, "events" | "suggestionsById" | "showDayHeaders" | "collapseCompleted">;
}) {
  return (
    <>
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
                busy={handlers.busy}
                onLogCare={() => handlers.onLogCare(event)}
                onReschedule={() => handlers.onReschedule(event)}
                onEditReminder={
                  event.reminderId ? () => handlers.onEditReminder(event) : undefined
                }
                onAcceptSuggestion={
                  handlers.allowAiSuggestionActions && event.isAiSuggested
                    ? () => handlers.onAcceptSuggestion(event)
                    : undefined
                }
                onDismissSuggestion={
                  handlers.allowAiSuggestionActions && event.isAiSuggested
                    ? () => handlers.onDismissSuggestion(event)
                    : undefined
                }
              />
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

export function CareCalendarAgenda({
  events,
  suggestionsById,
  onLogCare,
  onReschedule,
  onEditReminder,
  onAcceptSuggestion,
  onDismissSuggestion,
  allowAiSuggestionActions = true,
  busy,
  showDayHeaders = true,
  collapseCompleted = true,
}: CareCalendarAgendaProps) {
  const { colors, spacing } = useTheme();
  const [showCompleted, setShowCompleted] = useState(false);

  const { activeEvents, completedEvents } = useMemo(() => {
    const active: CareCalendarEvent[] = [];
    const completed: CareCalendarEvent[] = [];

    for (const event of events) {
      if (event.status === "completed" || event.status === "skipped") {
        completed.push(event);
      } else {
        active.push(event);
      }
    }

    return { activeEvents: active, completedEvents: completed };
  }, [events]);

  const activeGrouped = groupByDate(activeEvents);
  const completedGrouped = groupByDate(completedEvents);
  const activeDates = [...activeGrouped.keys()].sort();
  const completedDates = [...completedGrouped.keys()].sort();

  const handlers = {
    onLogCare,
    onReschedule,
    onEditReminder,
    onAcceptSuggestion,
    onDismissSuggestion,
    allowAiSuggestionActions,
    busy,
  };

  return (
    <View style={[styles.wrap, { gap: spacing.lg }]}>
      <AgendaSection
        dates={activeDates}
        grouped={activeGrouped}
        suggestionsById={suggestionsById}
        showDayHeaders={showDayHeaders}
        colors={colors}
        handlers={handlers}
      />

      {collapseCompleted && completedEvents.length > 0 ? (
        <View style={styles.completedSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showCompleted }}
            onPress={() => setShowCompleted((current) => !current)}
          >
            <Text style={[styles.completedToggle, { color: colors.secondary }]}>
              {showCompleted ? "Hide" : "Show"} completed ({completedEvents.length})
            </Text>
          </Pressable>
          {showCompleted ? (
            <AgendaSection
              dates={completedDates}
              grouped={completedGrouped}
              suggestionsById={suggestionsById}
              showDayHeaders={showDayHeaders}
              colors={colors}
              handlers={handlers}
            />
          ) : null}
        </View>
      ) : null}
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
  completedSection: {
    gap: 12,
  },
  completedToggle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
