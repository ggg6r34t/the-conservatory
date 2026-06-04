import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { getCareTypeLabel, getCareTypeVerb } from "@/features/care-calendar/services/careCalendarLabels";
import { getCareCalendarSourceLabel } from "@/features/care-calendar/services/careCalendarSourceLabels";
import type { CareCalendarEvent } from "@/features/care-calendar/types";
import type { CareScheduleSuggestion } from "@/features/care-calendar/types";

interface CareCalendarTaskCardProps {
  event: CareCalendarEvent;
  onLogCare: () => void;
  onMarkDone: () => void;
  onReschedule: () => void;
  onEditReminder?: () => void;
  onAcceptSuggestion?: () => void;
  onDismissSuggestion?: () => void;
  suggestion?: CareScheduleSuggestion;
  busy?: boolean;
}

function getStatusLabel(status: CareCalendarEvent["status"]) {
  switch (status) {
    case "due_today":
      return "Due today";
    case "overdue":
      return "Overdue";
    case "completed":
      return "Completed";
    case "upcoming":
      return "Upcoming";
    default:
      return status;
  }
}

function ActionChip({
  label,
  onPress,
  disabled,
  selected,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? colors.tertiaryContainer
            : colors.surfaceContainerHigh,
          opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          { color: selected ? colors.onTertiary : colors.onSurface },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function CareCalendarTaskCard({
  event,
  onLogCare,
  onMarkDone,
  onReschedule,
  onEditReminder,
  onAcceptSuggestion,
  onDismissSuggestion,
  busy,
}: CareCalendarTaskCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const isSuggestion = Boolean(event.isAiSuggested);

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
    >
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={[styles.plantName, { color: colors.primary }]}>
            {event.plantName}
          </Text>
          <Text style={[styles.careType, { color: colors.onSurface }]}>
            {getCareTypeVerb(event.careType)} · {getCareTypeLabel(event.careType)}
          </Text>
        </View>
        <Text style={[styles.status, { color: colors.secondary }]}>
          {getStatusLabel(event.status)}
        </Text>
      </View>

      <Text style={[styles.source, { color: colors.onSurfaceVariant }]}>
        {getCareCalendarSourceLabel({
          source: event.source,
          careType: event.careType,
          isAiSuggested: event.isAiSuggested,
          suggestionDerivation: event.suggestionDerivation,
        })}
      </Text>

      {event.reason ? (
        <Text style={[styles.reason, { color: colors.onSurfaceVariant }]}>
          {event.reason}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {isSuggestion && onAcceptSuggestion && onDismissSuggestion ? (
          <>
            <ActionChip
              label="Accept rhythm"
              onPress={onAcceptSuggestion}
              disabled={busy}
              selected
            />
            <ActionChip label="Dismiss" onPress={onDismissSuggestion} />
          </>
        ) : (
          <>
            <ActionChip
              label="Log care"
              onPress={onLogCare}
              disabled={busy || event.status === "completed"}
              selected
            />
            <ActionChip
              label="Mark done"
              onPress={onMarkDone}
              disabled={busy || event.status === "completed"}
            />
            <ActionChip label="Reschedule" onPress={onReschedule} />
            {onEditReminder ? (
              <ActionChip label="Edit reminder" onPress={onEditReminder} />
            ) : null}
            <ActionChip
              label="View plant"
              onPress={() => router.push(`/plant/${event.plantId}`)}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 22,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  plantName: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  careType: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  status: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  source: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  reason: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: "center",
  },
  chipLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
});
