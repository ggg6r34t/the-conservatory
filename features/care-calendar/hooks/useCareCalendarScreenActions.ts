import { useCallback, useState } from "react";

import { useRouter } from "expo-router";

import { useCareCalendarActions } from "@/features/care-calendar/hooks/useCareCalendarActions";
import { addLocalDays, toLocalDateKey } from "@/features/care-calendar/services/careCalendarDerivationService";
import type { CareCalendarEvent, CareScheduleSuggestion } from "@/features/care-calendar/types";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import { useSnackbar } from "@/hooks/useSnackbar";

type CalendarRefresh = () => Promise<void>;

export function useCareCalendarScreenActions(input: {
  plants: PlantListItem[];
  suggestionsById: Map<string, CareScheduleSuggestion>;
  refresh: CalendarRefresh;
}) {
  const router = useRouter();
  const snackbar = useSnackbar();
  const actions = useCareCalendarActions();
  const [rescheduleTarget, setRescheduleTarget] = useState<CareCalendarEvent | null>(
    null,
  );
  const [rescheduleDays, setRescheduleDays] = useState("7");

  const findPlant = useCallback(
    (event: CareCalendarEvent) =>
      input.plants.find((plant) => plant.id === event.plantId),
    [input.plants],
  );

  const runRefresh = useCallback(async () => {
    await input.refresh();
  }, [input]);

  const logCare = useCallback(
    async (event: CareCalendarEvent) => {
      try {
        await actions.logCare.mutateAsync({ event });
        snackbar.success("Care logged.");
        await runRefresh();
      } catch (error) {
        snackbar.error(
          error instanceof Error ? error.message : "Could not log care.",
        );
      }
    },
    [actions.logCare, runRefresh, snackbar],
  );

  const openReschedule = useCallback(
    (event: CareCalendarEvent) => {
      setRescheduleTarget(event);
      setRescheduleDays(
        String(
          input.plants.find((plant) => plant.id === event.plantId)
            ?.wateringIntervalDays ?? 7,
        ),
      );
    },
    [input.plants],
  );

  const runSnooze = useCallback(
    async (days: number) => {
      if (!rescheduleTarget) {
        return;
      }

      const plant = findPlant(rescheduleTarget);
      if (!plant) {
        return;
      }

      const frequencyDays = Number.parseInt(rescheduleDays, 10);
      const interval =
        Number.isFinite(frequencyDays) && frequencyDays > 0
          ? frequencyDays
          : plant.wateringIntervalDays || 7;
      const nextDueKey = toLocalDateKey(
        addLocalDays(`${rescheduleTarget.dueDate}T12:00:00`, days),
      );

      try {
        await actions.reschedule.mutateAsync({
          event: rescheduleTarget,
          plantName: plant.name,
          speciesName: plant.speciesName,
          frequencyDays: interval,
          nextDueAt: `${nextDueKey}T09:00:00.000Z`,
        });
        setRescheduleTarget(null);
        snackbar.success(`Snoozed ${days} day${days === 1 ? "" : "s"}.`);
        await runRefresh();
      } catch (error) {
        snackbar.error(
          error instanceof Error ? error.message : "Could not snooze care.",
        );
      }
    },
    [
      actions.reschedule,
      findPlant,
      rescheduleDays,
      rescheduleTarget,
      runRefresh,
      snackbar,
    ],
  );

  const runReschedule = useCallback(async () => {
    if (!rescheduleTarget) {
      return;
    }

    const plant = findPlant(rescheduleTarget);
    if (!plant) {
      return;
    }

    const frequencyDays = Number.parseInt(rescheduleDays, 10);
    if (!Number.isFinite(frequencyDays) || frequencyDays <= 0) {
      snackbar.error("Enter a valid interval in days.");
      return;
    }

    try {
      await actions.reschedule.mutateAsync({
        event: rescheduleTarget,
        plantName: plant.name,
        speciesName: plant.speciesName,
        frequencyDays,
        nextDueAt: `${rescheduleTarget.dueDate}T09:00:00.000Z`,
      });
      setRescheduleTarget(null);
      snackbar.success("Care rescheduled.");
      await runRefresh();
    } catch (error) {
      snackbar.error(
        error instanceof Error ? error.message : "Could not reschedule care.",
      );
    }
  }, [
    actions.reschedule,
    findPlant,
    rescheduleDays,
    rescheduleTarget,
    runRefresh,
    snackbar,
  ]);

  const acceptSuggestion = useCallback(
    async (event: CareCalendarEvent) => {
      const suggestion = input.suggestionsById.get(event.id);
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
        await runRefresh();
      } catch (error) {
        snackbar.error(
          error instanceof Error ? error.message : "Could not accept suggestion.",
        );
      }
    },
    [actions.acceptSuggestion, findPlant, input.suggestionsById, runRefresh, snackbar],
  );

  const dismissSuggestion = useCallback(
    async (event: CareCalendarEvent) => {
      const suggestion = input.suggestionsById.get(event.id);
      if (!suggestion) {
        return;
      }

      try {
        await actions.dismissSuggestion.mutateAsync(suggestion);
        await runRefresh();
      } catch (error) {
        snackbar.error(
          error instanceof Error
            ? error.message
            : "Could not dismiss suggestion.",
        );
      }
    },
    [actions.dismissSuggestion, input.suggestionsById, runRefresh, snackbar],
  );

  const acceptAllSuggestions = useCallback(
    async (events: CareCalendarEvent[]) => {
      const aiEvents = events.filter((event) => event.isAiSuggested);
      if (!aiEvents.length) {
        return;
      }

      let accepted = 0;
      for (const event of aiEvents) {
        const suggestion = input.suggestionsById.get(event.id);
        const plant = findPlant(event);
        if (!suggestion || !plant) {
          continue;
        }

        try {
          await actions.acceptSuggestion.mutateAsync({
            suggestion,
            plantName: plant.name,
            speciesName: plant.speciesName,
          });
          accepted += 1;
        } catch {
          break;
        }
      }

      if (accepted > 0) {
        snackbar.success(
          accepted === 1
            ? "Accepted 1 AI suggestion."
            : `Accepted ${accepted} AI suggestions.`,
        );
        await runRefresh();
      } else {
        snackbar.error("Could not accept AI suggestions.");
      }
    },
    [
      actions.acceptSuggestion,
      findPlant,
      input.suggestionsById,
      runRefresh,
      snackbar,
    ],
  );

  const editReminder = useCallback(() => {
    router.push("/care-reminders");
  }, [router]);

  return {
    busy: actions.logCare.isPending || actions.acceptSuggestion.isPending,
    logCare,
    openReschedule,
    runSnooze,
    runReschedule,
    acceptSuggestion,
    dismissSuggestion,
    acceptAllSuggestions,
    editReminder,
    rescheduleTarget,
    rescheduleDays,
    setRescheduleDays,
    closeReschedule: () => setRescheduleTarget(null),
  };
}
