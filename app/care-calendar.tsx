import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { trackCareCalendarDaySelected } from "@/features/care-calendar/analytics";
import { CareCalendarAgenda } from "@/features/care-calendar/components/CareCalendarAgenda";
import { CareCalendarFilters } from "@/features/care-calendar/components/CareCalendarFilters";
import { CareCalendarMonthGrid } from "@/features/care-calendar/components/CareCalendarMonthGrid";
import { CareCalendarMonthGridSkeleton } from "@/features/care-calendar/components/CareCalendarMonthGridSkeleton";
import { CareCalendarMonthHeader } from "@/features/care-calendar/components/CareCalendarMonthHeader";
import { CareCalendarPlantFocusChip } from "@/features/care-calendar/components/CareCalendarPlantFocusChip";
import { CareCalendarRescheduleModal } from "@/features/care-calendar/components/CareCalendarRescheduleModal";
import { CareCalendarToolbar } from "@/features/care-calendar/components/CareCalendarToolbar";
import { useCareCalendar } from "@/features/care-calendar/hooks/useCareCalendar";
import { useCareCalendarAnalytics } from "@/features/care-calendar/hooks/useCareCalendarAnalytics";
import { useCareCalendarScreenActions } from "@/features/care-calendar/hooks/useCareCalendarScreenActions";
import { resolveCareCalendarRouteState } from "@/features/care-calendar/services/careCalendarDeepLink";
import { buildCareCalendarHorizonNotice } from "@/features/care-calendar/services/careCalendarHorizonNotice";
import { shareCareCalendarIcs } from "@/features/care-calendar/services/careCalendarIcsExport";
import { getVisibleCareCalendarFilters } from "@/features/care-calendar/services/careCalendarFilterOptions";
import { buildCareCalendarToolbarSummary } from "@/features/care-calendar/services/careCalendarToolbarSummary";
import type { CareCalendarOverflowAction } from "@/features/care-calendar/components/CareCalendarOverflowMenu";
import {
  formatAgendaDayTitle,
  getDefaultCareCalendarDateKey,
  groupEventsByDate,
  isVisibleMonthShowingToday,
  toggleSelectedDateKey,
} from "@/features/care-calendar/services/careCalendarDerivationService";
import { useCareCalendarPrefsStore } from "@/features/care-calendar/stores/useCareCalendarPrefsStore";
import type { CareCalendarViewMode } from "@/features/care-calendar/types";
import { UpgradePrompt } from "@/features/billing/components/UpgradePrompt";
import { EmptyState } from "@/features/empty-states/components/EmptyState";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";
import { useSnackbar } from "@/hooks/useSnackbar";

export default function CareCalendarScreen() {
  const router = useRouter();
  const { plantId, date: dateParam } = useLocalSearchParams<{
    plantId?: string;
    date?: string;
  }>();
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const filter = useCareCalendarPrefsStore((state) => state.filter);
  const setFilter = useCareCalendarPrefsStore((state) => state.setFilter);
  const viewMode = useCareCalendarPrefsStore((state) => state.viewMode);
  const setViewMode = useCareCalendarPrefsStore((state) => state.setViewMode);
  const todayKey = useMemo(() => getDefaultCareCalendarDateKey(), []);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(`${todayKey}T12:00:00`),
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(todayKey);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [refreshingAi, setRefreshingAi] = useState(false);
  const { onRefresh, refreshing } = usePullToRefreshSync();
  const appliedRouteRef = useRef<string | null>(null);
  const calendar = useCareCalendar({ plantId, filter });
  const grouped = useMemo(
    () => groupEventsByDate(calendar.allEvents),
    [calendar.allEvents],
  );
  const selectedDayEvents = useMemo(
    () =>
      selectedDateKey
        ? calendar.events.filter((event) => event.dueDate === selectedDateKey)
        : [],
    [calendar.events, selectedDateKey],
  );
  const agendaEvents = useMemo(() => calendar.events, [calendar.events]);
  const suggestionsById = useMemo(() => {
    const map = new Map(
      calendar.suggestions.map((suggestion) => [suggestion.id, suggestion] as const),
    );
    return map;
  }, [calendar.suggestions]);
  const screenActions = useCareCalendarScreenActions({
    plants: calendar.plants,
    suggestionsById,
    refresh: calendar.refresh,
  });
  const hasPlants = calendar.plants.length > 0;
  const hasScheduledCare = calendar.allEvents.some(
    (event) => !event.isAiSuggested,
  );
  const focusedPlant = plantId
    ? calendar.plants.find((plant) => plant.id === plantId)
    : undefined;
  const toolbarSummaryLabel = useMemo(
    () => buildCareCalendarToolbarSummary(calendar.events, viewMode),
    [calendar.events, viewMode],
  );
  const showAiFallbackHelp =
    calendar.aiSuggestionsEnabled && calendar.aiSuggestionDerivation === "local";
  const horizonNotice = useMemo(
    () => buildCareCalendarHorizonNotice(calendar.allEvents),
    [calendar.allEvents],
  );
  const aiSuggestionEvents = useMemo(
    () => agendaEvents.filter((event) => event.isAiSuggested),
    [agendaEvents],
  );
  const filterOptions = useMemo(
    () =>
      getVisibleCareCalendarFilters({
        events: calendar.allEvents,
        showAiFilter: calendar.aiSuggestionsEnabled,
      }),
    [calendar.aiSuggestionsEnabled, calendar.allEvents],
  );
  const routeState = useMemo(
    () =>
      resolveCareCalendarRouteState({
        plantId,
        plantName: focusedPlant?.name,
        dateKey: typeof dateParam === "string" ? dateParam : undefined,
        events: calendar.allEvents,
      }),
    [calendar.allEvents, dateParam, focusedPlant?.name, plantId],
  );

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

  useEffect(() => {
    if (!calendar.aiSuggestionsEnabled && filter === "ai_suggested") {
      setFilter("all");
    }
  }, [calendar.aiSuggestionsEnabled, filter, setFilter]);

  useFocusEffect(
    useCallback(() => {
      setSelectedDateKey((current) => current ?? todayKey);
    }, [todayKey]),
  );

  useEffect(() => {
    const routeKey = `${plantId ?? ""}:${dateParam ?? ""}`;
    if (calendar.isLoading) {
      return;
    }

    if (appliedRouteRef.current === routeKey) {
      return;
    }

    appliedRouteRef.current = routeKey;
    setSelectedDateKey(routeState.selectedDateKey);
    setVisibleMonth(routeState.visibleMonth);
  }, [calendar.isLoading, dateParam, plantId, routeState]);

  const handleSelectDate = useCallback(
    (dateKey: string) => {
      const nextSelectedDateKey = toggleSelectedDateKey(selectedDateKey, dateKey);
      void Haptics.selectionAsync();

      if (nextSelectedDateKey === null) {
        setSelectedDateKey(null);
        return;
      }

      setSelectedDateKey(nextSelectedDateKey);
      const dayEvents = grouped.get(dateKey) ?? [];
      trackCareCalendarDaySelected({
        task_count: dayEvents.length,
        has_overdue: dayEvents.some((event) => event.status === "overdue"),
      });
    },
    [grouped, selectedDateKey],
  );

  const shiftMonth = useCallback(
    (delta: number) => {
      setVisibleMonth((current) => {
        if (reduceMotionEnabled) {
          const next = new Date(current);
          next.setMonth(next.getMonth() + delta);
          return next;
        }

        return new Date(current.getFullYear(), current.getMonth() + delta, 1);
      });
    },
    [reduceMotionEnabled],
  );

  const jumpToToday = useCallback(() => {
    setVisibleMonth(new Date(`${todayKey}T12:00:00`));
    setSelectedDateKey(todayKey);
  }, [todayKey]);

  const handleExport = useCallback(async () => {
    const result = await shareCareCalendarIcs(calendar.allEvents);
    if (!result.ok) {
      snackbar.error("Calendar export is not available on this device.");
    }
  }, [calendar.allEvents, snackbar]);

  const handleRefreshAi = useCallback(async () => {
    setRefreshingAi(true);
    try {
      await calendar.refreshAiSuggestions();
      snackbar.success("AI care suggestions refreshed.");
    } catch {
      snackbar.error("Could not refresh AI suggestions.");
    } finally {
      setRefreshingAi(false);
    }
  }, [calendar, snackbar]);

  const setView = useCallback(
    (mode: CareCalendarViewMode) => setViewMode(mode),
    [setViewMode],
  );

  const overflowActions = useMemo(() => {
    const actions: CareCalendarOverflowAction[] = [];

    if (calendar.aiSuggestionDerivation === "local") {
      actions.push({
        id: "refresh-ai",
        label: refreshingAi ? "Refreshing AI…" : "Refresh AI suggestions",
        onPress: () => void handleRefreshAi(),
      });
    }

    if (calendar.aiSuggestionsEnabled && aiSuggestionEvents.length > 1) {
      actions.push({
        id: "accept-all",
        label: "Accept all AI suggestions",
        onPress: () => void screenActions.acceptAllSuggestions(aiSuggestionEvents),
      });
    }

    if (calendar.allEvents.length > 0) {
      actions.push({
        id: "export-ics",
        label: "Export calendar (.ics)",
        onPress: () => void handleExport(),
      });
    }

    return actions;
  }, [
    aiSuggestionEvents,
    calendar.aiSuggestionDerivation,
    calendar.aiSuggestionsEnabled,
    calendar.allEvents.length,
    handleExport,
    handleRefreshAi,
    refreshingAi,
    screenActions,
  ]);

  useEffect(() => {
    if (!filterOptions.some((option) => option.id === filter)) {
      setFilter("all");
    }
  }, [filter, filterOptions, setFilter]);

  const agendaHandlers = {
    events: agendaEvents,
    suggestionsById,
    showDayHeaders: viewMode === "agenda",
    allowAiSuggestionActions: calendar.aiSuggestionsEnabled,
    busy: screenActions.busy,
    onLogCare: screenActions.logCare,
    onReschedule: screenActions.openReschedule,
    onEditReminder: screenActions.editReminder,
    onAcceptSuggestion: screenActions.acceptSuggestion,
    onDismissSuggestion: screenActions.dismissSuggestion,
    collapseCompleted: true,
  };

  return (
    <Fragment>
      <ProfileScreenScaffold
        navigationTitle="Care Calendar"
        subtitle="Botanical planner"
        title="Care rhythm"
        description={
          plantId
            ? undefined
            : "Upcoming watering, feeding, and gentle care — derived from your plants and reminders."
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
            {plantId && focusedPlant ? (
              <CareCalendarPlantFocusChip
                plantName={focusedPlant.name}
                onClear={() => router.replace("/care-calendar")}
              />
            ) : null}

            <CareCalendarToolbar
              summaryLabel={toolbarSummaryLabel}
              horizonNotice={horizonNotice}
              showAiFallback={showAiFallbackHelp}
              overflowActions={overflowActions}
            />

            <View style={styles.segmented}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: viewMode === "month" }}
                onPress={() => setView("month")}
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
                onPress={() => setView("agenda")}
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
              options={filterOptions}
              onChange={setFilter}
            />

            {viewMode === "month" ? (
              <View style={styles.monthSection}>
                <CareCalendarMonthHeader
                  visibleMonth={visibleMonth}
                  showTodayButton={!isVisibleMonthShowingToday(visibleMonth)}
                  onPreviousMonth={() => shiftMonth(-1)}
                  onNextMonth={() => shiftMonth(1)}
                  onToday={jumpToToday}
                />

                {calendar.isLoading ? (
                  <CareCalendarMonthGridSkeleton />
                ) : (
                  <CareCalendarMonthGrid
                    month={visibleMonth}
                    selectedDateKey={selectedDateKey}
                    events={calendar.events}
                    plants={calendar.plants}
                    onSelectDate={handleSelectDate}
                    onShiftMonth={shiftMonth}
                    onPlantLongPress={(id) => router.push(`/plant/${id}`)}
                  />
                )}

                {selectedDateKey ? (
                  <Text style={[styles.dayHeading, { color: colors.primary }]}>
                    {formatAgendaDayTitle(selectedDateKey)}
                  </Text>
                ) : (
                  <Text
                    style={[styles.dayPrompt, { color: colors.onSurfaceVariant }]}
                  >
                    Select a day to view scheduled care.
                  </Text>
                )}

                {selectedDateKey && selectedDayEvents.length ? (
                  <CareCalendarAgenda
                    {...agendaHandlers}
                    events={selectedDayEvents}
                    showDayHeaders={false}
                  />
                ) : selectedDateKey ? (
                  <EmptyState
                    screen="care-calendar"
                    reason="empty_day"
                    content={{
                      tone: "neutral",
                      analyticsKey: "care_calendar_empty_day",
                      title: "No care planned for this day",
                      body: "Add a reminder to schedule care for this date.",
                      primaryActionLabel: "Create reminder",
                    }}
                    primaryHref="/care-reminders"
                  />
                ) : null}
              </View>
            ) : (
              <CareCalendarAgenda {...agendaHandlers} />
            )}

            {!calendar.aiSuggestionsEnabled ? (
              <UpgradePrompt
                compact
                message="Unlock optional AI care rhythms on your calendar."
                cta="Explore Premium"
              />
            ) : null}
          </>
        )}
      </ProfileScreenScaffold>

      <CareCalendarRescheduleModal
        visible={screenActions.rescheduleTarget != null}
        target={screenActions.rescheduleTarget}
        days={screenActions.rescheduleDays}
        onChangeDays={screenActions.setRescheduleDays}
        onSnooze={(days) => void screenActions.runSnooze(days)}
        onSave={() => void screenActions.runReschedule()}
        onClose={screenActions.closeReschedule}
      />
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
  dayHeading: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  dayPrompt: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
});
