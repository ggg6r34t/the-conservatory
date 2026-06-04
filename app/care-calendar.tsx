import { Fragment, useEffect, useMemo, useState } from "react";

import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { trackCareCalendarDaySelected } from "@/features/care-calendar/analytics";
import { useCareCalendarAnalytics } from "@/features/care-calendar/hooks/useCareCalendarAnalytics";
import { resolvePlantFocusedCalendarState } from "@/features/care-calendar/services/careCalendarDeepLink";
import { CareCalendarAgenda } from "@/features/care-calendar/components/CareCalendarAgenda";
import { CareCalendarFilters } from "@/features/care-calendar/components/CareCalendarFilters";
import { CareCalendarMonthGrid } from "@/features/care-calendar/components/CareCalendarMonthGrid";
import { useCareCalendar } from "@/features/care-calendar/hooks/useCareCalendar";
import { useCareCalendarActions } from "@/features/care-calendar/hooks/useCareCalendarActions";
import {
  formatMonthTitle,
  groupEventsByDate,
  toLocalDateKey,
} from "@/features/care-calendar/services/careCalendarDerivationService";
import type {
  CareCalendarEvent,
  CareCalendarFilter,
  CareCalendarViewMode,
  CareScheduleSuggestion,
} from "@/features/care-calendar/types";
import { UpgradePrompt } from "@/features/billing/components/UpgradePrompt";
import { EmptyState } from "@/features/empty-states/components/EmptyState";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";
import { useSnackbar } from "@/hooks/useSnackbar";

export default function CareCalendarScreen() {
  const router = useRouter();
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<CareCalendarFilter>("all");
  const [viewMode, setViewMode] = useState<CareCalendarViewMode>("month");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    toLocalDateKey(new Date()),
  );
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<CareCalendarEvent | null>(
    null,
  );
  const [rescheduleDays, setRescheduleDays] = useState("7");
  const { onRefresh, refreshing } = usePullToRefreshSync();
  const snackbar = useSnackbar();
  const calendar = useCareCalendar({ plantId, filter });
  const actions = useCareCalendarActions();
  const grouped = useMemo(
    () => groupEventsByDate(calendar.allEvents),
    [calendar.allEvents],
  );
  const selectedDayEvents = useMemo(
    () =>
      calendar.events.filter((event) => event.dueDate === selectedDateKey),
    [calendar.events, selectedDateKey],
  );
  const agendaEvents = useMemo(() => {
    const upcoming = calendar.events.filter(
      (event) => event.status !== "completed",
    );
    return upcoming.length ? upcoming : calendar.events;
  }, [calendar.events]);
  const suggestionsById = useMemo(() => {
    const map = new Map<string, CareScheduleSuggestion>();
    for (const suggestion of calendar.suggestions) {
      map.set(suggestion.id, suggestion);
    }
    return map;
  }, [calendar.suggestions]);
  const hasPlants = calendar.plants.length > 0;
  const hasScheduledCare = calendar.allEvents.some(
    (event) => !event.isAiSuggested,
  );
  const focusedPlant = plantId
    ? calendar.plants.find((plant) => plant.id === plantId)
    : undefined;

  useCareCalendarAnalytics({
    source: plantId ? "plant_detail" : "dashboard",
    suggestionCount: calendar.suggestions.length,
    aiSuggestionsEnabled: calendar.aiSuggestionsEnabled,
  });

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotionEnabled,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const plantDeepLink = useMemo(
    () =>
      resolvePlantFocusedCalendarState({
        plantId,
        plantName: focusedPlant?.name,
        events: calendar.allEvents,
      }),
    [calendar.allEvents, focusedPlant?.name, plantId],
  );

  useEffect(() => {
    if (!calendar.aiSuggestionsEnabled && filter === "ai_suggested") {
      setFilter("all");
    }
  }, [calendar.aiSuggestionsEnabled, filter]);

  useEffect(() => {
    if (!plantId || calendar.isLoading) {
      return;
    }

    setSelectedDateKey(plantDeepLink.selectedDateKey);
    setVisibleMonth(plantDeepLink.visibleMonth);
  }, [calendar.isLoading, plantDeepLink, plantId]);

  const findPlant = (event: CareCalendarEvent) =>
    calendar.plants.find((plant) => plant.id === event.plantId);

  const handleSelectDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    const taskCount = grouped.get(dateKey)?.length ?? 0;
    const hasOverdue = (grouped.get(dateKey) ?? []).some(
      (event) => event.status === "overdue",
    );
    trackCareCalendarDaySelected({ task_count: taskCount, has_overdue: hasOverdue });
  };

  const shiftMonth = (delta: number) => {
    setVisibleMonth((current) => {
      if (reduceMotionEnabled) {
        const next = new Date(current);
        next.setMonth(next.getMonth() + delta);
        return next;
      }

      return new Date(current.getFullYear(), current.getMonth() + delta, 1);
    });
  };

  const runReschedule = async () => {
    if (!rescheduleTarget) {
      return;
    }

    const plant = findPlant(rescheduleTarget);
    if (!plant) {
      return;
    }

    const frequencyDays = Number.parseInt(rescheduleDays, 10);
    if (!Number.isFinite(frequencyDays) || frequencyDays <= 0) {
      snackbar.success("Enter a valid interval in days.");
      return;
    }

    try {
      await actions.reschedule.mutateAsync({
        event: rescheduleTarget,
        plantName: plant.name,
        speciesName: plant.speciesName,
        frequencyDays,
        nextDueAt: `${selectedDateKey}T09:00:00.000Z`,
      });
      setRescheduleTarget(null);
      snackbar.success("Care rescheduled.");
      await calendar.refresh();
    } catch (error) {
      snackbar.success(
        error instanceof Error ? error.message : "Could not reschedule care.",
      );
    }
  };

  return (
    <Fragment>
      <ProfileScreenScaffold
        navigationTitle="Care Calendar"
        subtitle="Botanical planner"
        title="Care rhythm"
        description={
          plantDeepLink.description ??
          "Upcoming watering, feeding, and gentle care — derived from your plants and reminders."
        }
        refreshing={refreshing}
        onRefresh={async () => {
          await onRefresh();
          await calendar.refresh();
        }}
      >
        {!hasPlants ? (
          <EmptyState
            screen="care-calendar"
            reason="no_plants"
            content={{
              tone: "firstRun",
              analyticsKey: "care_calendar_no_plants",
              title: "Begin with one plant",
              body: "Add your first plant to start building a care calendar.",
              primaryActionLabel: "Add plant",
            }}
            primaryHref="/plant/add"
          />
        ) : !hasScheduledCare && calendar.suggestions.length === 0 ? (
          <EmptyState
            screen="care-calendar"
            reason="no_schedule"
            content={{
              tone: "neutral",
              analyticsKey: "care_calendar_no_schedule",
              title: "No care schedule yet",
              body: "Create reminders or let The Conservatory suggest a gentle care rhythm.",
              primaryActionLabel: "Create reminder",
            }}
            primaryHref="/care-reminders"
          />
        ) : (
          <>
            <View style={styles.segmented}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: viewMode === "month" }}
                onPress={() => setViewMode("month")}
                style={[
                  styles.segment,
                  {
                    backgroundColor:
                      viewMode === "month"
                        ? colors.tertiaryContainer
                        : colors.surfaceContainerLow,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    {
                      color:
                        viewMode === "month"
                          ? colors.onTertiary
                          : colors.onSurface,
                    },
                  ]}
                >
                  Month
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: viewMode === "agenda" }}
                onPress={() => setViewMode("agenda")}
                style={[
                  styles.segment,
                  {
                    backgroundColor:
                      viewMode === "agenda"
                        ? colors.tertiaryContainer
                        : colors.surfaceContainerLow,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    {
                      color:
                        viewMode === "agenda"
                          ? colors.onTertiary
                          : colors.onSurface,
                    },
                  ]}
                >
                  Agenda
                </Text>
              </Pressable>
            </View>

            <CareCalendarFilters
              value={filter}
              onChange={setFilter}
              showAiFilter={calendar.aiSuggestionsEnabled}
            />

            {viewMode === "month" ? (
              <View style={styles.monthSection}>
                <View style={styles.monthHeader}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    onPress={() => shiftMonth(-1)}
                  >
                    <Icon
                      family="MaterialCommunityIcons"
                      name="chevron-left"
                      color={colors.primary}
                      size={24}
                    />
                  </Pressable>
                  <Text style={[styles.monthTitle, { color: colors.primary }]}>
                    {formatMonthTitle(visibleMonth)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    onPress={() => shiftMonth(1)}
                  >
                    <Icon
                      family="MaterialCommunityIcons"
                      name="chevron-right"
                      color={colors.primary}
                      size={24}
                    />
                  </Pressable>
                </View>

                <CareCalendarMonthGrid
                  month={visibleMonth}
                  selectedDateKey={selectedDateKey}
                  events={calendar.events}
                  onSelectDate={handleSelectDate}
                />

                <Text style={[styles.dayHeading, { color: colors.primary }]}>
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  }).format(new Date(`${selectedDateKey}T12:00:00`))}
                </Text>

                {selectedDayEvents.length ? (
                  <CareCalendarAgenda
                    events={selectedDayEvents}
                    suggestionsById={suggestionsById}
                    allowAiSuggestionActions={calendar.aiSuggestionsEnabled}
                    busy={actions.logCare.isPending}
                    onLogCare={async (event) => {
                      try {
                        await actions.logCare.mutateAsync({ event });
                        snackbar.success("Care logged.");
                        await calendar.refresh();
                      } catch (error) {
                        snackbar.success(
                          error instanceof Error
                            ? error.message
                            : "Could not log care.",
                        );
                      }
                    }}
                    onMarkDone={async (event) => {
                      try {
                        await actions.logCare.mutateAsync({ event });
                        snackbar.success("Marked done.");
                        await calendar.refresh();
                      } catch (error) {
                        snackbar.success(
                          error instanceof Error
                            ? error.message
                            : "Could not complete care.",
                        );
                      }
                    }}
                    onReschedule={(event) => {
                      setRescheduleTarget(event);
                      setRescheduleDays(
                        String(
                          calendar.plants.find((plant) => plant.id === event.plantId)
                            ?.wateringIntervalDays ?? 7,
                        ),
                      );
                    }}
                    onEditReminder={() => router.push("/care-reminders")}
                    onAcceptSuggestion={async (event) => {
                      const suggestion = suggestionsById.get(event.id);
                      const plant = findPlant(event);
                      if (!suggestion || !plant) {
                        return;
                      }

                      try {
                        await actions.acceptSuggestion.mutateAsync({
                          suggestion,
                          plantName: plant.name,
                          speciesName: plant.speciesName,
                        });
                        snackbar.success("Care rhythm saved.");
                        await calendar.refresh();
                      } catch (error) {
                        snackbar.success(
                          error instanceof Error
                            ? error.message
                            : "Could not accept suggestion.",
                        );
                      }
                    }}
                    onDismissSuggestion={async (event) => {
                      const suggestion = suggestionsById.get(event.id);
                      if (!suggestion) {
                        return;
                      }

                      await actions.dismissSuggestion.mutateAsync(suggestion);
                      await calendar.refresh();
                    }}
                  />
                ) : (
                  <EmptyState
                    screen="care-calendar"
                    reason="empty_day"
                    content={{
                      tone: "neutral",
                      analyticsKey: "care_calendar_empty_day",
                      title: "No care planned for this day",
                      body: "Your plants have no scheduled care here.",
                    }}
                  />
                )}
              </View>
            ) : (
              <CareCalendarAgenda
                events={agendaEvents}
                suggestionsById={suggestionsById}
                allowAiSuggestionActions={calendar.aiSuggestionsEnabled}
                busy={actions.logCare.isPending}
                onLogCare={async (event) => {
                  try {
                    await actions.logCare.mutateAsync({ event });
                    snackbar.success("Care logged.");
                    await calendar.refresh();
                  } catch (error) {
                    snackbar.success(
                      error instanceof Error ? error.message : "Could not log care.",
                    );
                  }
                }}
                onMarkDone={async (event) => {
                  try {
                    await actions.logCare.mutateAsync({ event });
                        snackbar.success("Marked done.");
                    await calendar.refresh();
                  } catch (error) {
                    snackbar.success(
                      error instanceof Error
                        ? error.message
                        : "Could not complete care.",
                    );
                  }
                }}
                onReschedule={(event) => {
                  setRescheduleTarget(event);
                  setRescheduleDays(
                    String(
                      calendar.plants.find((plant) => plant.id === event.plantId)
                        ?.wateringIntervalDays ?? 7,
                    ),
                  );
                }}
                onEditReminder={() => router.push("/care-reminders")}
                onAcceptSuggestion={async (event) => {
                  const suggestion = suggestionsById.get(event.id);
                  const plant = findPlant(event);
                  if (!suggestion || !plant) {
                    return;
                  }

                  try {
                    await actions.acceptSuggestion.mutateAsync({
                      suggestion,
                      plantName: plant.name,
                      speciesName: plant.speciesName,
                    });
                        snackbar.success("Care rhythm saved.");
                    await calendar.refresh();
                  } catch (error) {
                    snackbar.success(
                      error instanceof Error
                        ? error.message
                        : "Could not accept suggestion.",
                    );
                  }
                }}
                onDismissSuggestion={async (event) => {
                  const suggestion = suggestionsById.get(event.id);
                  if (!suggestion) {
                    return;
                  }

                  await actions.dismissSuggestion.mutateAsync(suggestion);
                  await calendar.refresh();
                }}
              />
            )}

            {!calendar.aiSuggestionsEnabled ? (
              <View style={styles.aiUpsell}>
                <Text
                  style={[styles.aiNote, { color: colors.onSurfaceVariant }]}
                >
                  Showing your local care schedule. Premium adds optional AI-assisted
                  rhythm suggestions.
                </Text>
                <UpgradePrompt
                  compact
                  message="Unlock AI care rhythms on your calendar."
                  cta="Explore Premium"
                />
              </View>
            ) : calendar.aiSuggestionDerivation === "local" ? (
              <Text
                style={[styles.aiNote, { color: colors.onSurfaceVariant }]}
              >
                Cloud AI is unavailable. Showing on-device rhythm hints until the
                next refresh.
              </Text>
            ) : null}
          </>
        )}
      </ProfileScreenScaffold>

      <Modal
        visible={rescheduleTarget != null}
        transparent
        animationType="fade"
        onRequestClose={() => setRescheduleTarget(null)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.primary }]}>
              Reschedule care
            </Text>
            <Text style={[styles.modalBody, { color: colors.onSurfaceVariant }]}>
              Set how often this care should repeat, starting {selectedDateKey}.
            </Text>
            <TextInput
              value={rescheduleDays}
              onChangeText={setRescheduleDays}
              keyboardType="number-pad"
              style={[
                styles.input,
                {
                  color: colors.onSurface,
                  backgroundColor: colors.surfaceContainerLow,
                },
              ]}
              accessibilityLabel="Repeat every number of days"
            />
            <View style={styles.modalActions}>
              <PrimaryButton label="Save" onPress={() => void runReschedule()} />
              <Pressable
                accessibilityRole="button"
                onPress={() => setRescheduleTarget(null)}
              >
                <Text style={[styles.cancel, { color: colors.secondary }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Fragment>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  monthSection: { gap: 24 },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  dayHeading: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  aiUpsell: {
    gap: 12,
  },
  aiNote: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 28,
    maxWidth: 340,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  modalBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 28,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
  },
  modalActions: {
    gap: 10,
    alignItems: "flex-start",
  },
  cancel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
