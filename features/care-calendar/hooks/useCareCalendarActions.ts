import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { upsertCareScheduleSuggestion } from "@/features/care-calendar/api/careScheduleSuggestionsClient";
import { dismissCareScheduleSuggestion } from "@/features/care-calendar/services/careCalendarAiScheduleService";
import type { CareScheduleSuggestion } from "@/features/care-calendar/types";
import {
  trackAiScheduleSuggestionAccepted,
  trackAiScheduleSuggestionDismissed,
  trackCareCalendarTaskCompleted,
  trackCareCalendarTaskRescheduled,
} from "@/features/care-calendar/analytics";
import type { CareCalendarCareType, CareCalendarEvent } from "@/features/care-calendar/types";
import { createCareLog } from "@/features/care-logs/api/careLogsClient";
import { invalidateCareLogQueries } from "@/features/care-logs/utils/invalidateCareLogQueries";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { assertFeatureAccess } from "@/features/billing/services/featureAccess";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import {
  isReminderCareType,
} from "@/features/notifications/constants/reminderTypes";
import { useSetReminder } from "@/features/notifications/hooks/useSetReminder";
import type { CareLogType, ReminderType } from "@/types/models";

function careTypeToLogType(careType: CareCalendarCareType): CareLogType | null {
  if (
    careType === "water" ||
    careType === "mist" ||
    careType === "feed" ||
    careType === "repot" ||
    careType === "prune" ||
    careType === "inspect" ||
    careType === "note"
  ) {
    return careType;
  }

  if (careType === "pest_check") {
    return "pest";
  }

  return null;
}

function careTypeToReminderType(
  careType: CareCalendarCareType,
): ReminderType | null {
  return isReminderCareType(careType) ? careType : null;
}

export function useCareCalendarActions() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const queryClient = useQueryClient();
  const setReminder = useSetReminder();

  function assertAiCareScheduleAccess() {
    assertFeatureAccess("ai_care_schedule", isPremium);
  }

  const logCare = useMutation({
    mutationFn: async (input: {
      event: CareCalendarEvent;
      notes?: string;
    }) => {
      const logType = careTypeToLogType(input.event.careType);
      if (!logType) {
        throw new Error("This care type cannot be logged yet.");
      }

      return createCareLog({
        userId: user!.id,
        plantId: input.event.plantId,
        logType,
        notes: input.notes,
      });
    },
    onSuccess: async (_result, variables) => {
      trackCareCalendarTaskCompleted(variables.event.careType);
      await invalidateCareLogQueries(queryClient, variables.event.plantId);
      await queryClient.invalidateQueries({ queryKey: ["care-calendar"] });
    },
  });

  const reschedule = useMutation({
    mutationFn: async (input: {
      event: CareCalendarEvent;
      plantName: string;
      speciesName: string;
      frequencyDays: number;
      nextDueAt: string;
    }) => {
      const reminderType = careTypeToReminderType(input.event.careType);
      if (reminderType) {
        return setReminder.mutateAsync({
          plantId: input.event.plantId,
          plantName: input.plantName,
          speciesName: input.speciesName,
          frequencyDays: input.frequencyDays,
          nextDueAt: input.nextDueAt,
          enabled: true,
          reminderType,
        });
      }

      return upsertCareScheduleSuggestion({
        userId: user!.id,
        plantId: input.event.plantId,
        careType: input.event.careType,
        frequencyDays: input.frequencyDays,
        nextDueAt: input.nextDueAt,
        enabled: true,
        reason: input.event.reason ?? null,
        confidence: input.event.confidence ?? null,
        source: input.event.isAiSuggested ? "ai_suggested" : "manual",
      });
    },
    onSuccess: (_data, variables) => {
      trackCareCalendarTaskRescheduled(variables.event.careType);
      void queryClient.invalidateQueries({ queryKey: ["care-calendar"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reminders });
    },
  });

  const acceptSuggestion = useMutation({
    mutationFn: async (input: {
      suggestion: CareScheduleSuggestion;
      plantName: string;
      speciesName: string;
    }) => {
      assertAiCareScheduleAccess();
      const reminderType = careTypeToReminderType(input.suggestion.careType);
      if (reminderType) {
        const reminder = await setReminder.mutateAsync({
          plantId: input.suggestion.plantId,
          plantName: input.plantName,
          speciesName: input.speciesName,
          frequencyDays: input.suggestion.frequencyDays,
          nextDueAt: `${input.suggestion.suggestedDueDate}T09:00:00.000Z`,
          enabled: true,
          reminderType,
        });
        trackAiScheduleSuggestionAccepted(input.suggestion.careType);
        return reminder;
      }

      const schedule = await upsertCareScheduleSuggestion({
        userId: user!.id,
        plantId: input.suggestion.plantId,
        careType: input.suggestion.careType,
        frequencyDays: input.suggestion.frequencyDays,
        nextDueAt: `${input.suggestion.suggestedDueDate}T09:00:00.000Z`,
        enabled: true,
        reason: input.suggestion.reason,
        confidence: input.suggestion.confidence,
        source: "ai_suggested",
      });
      trackAiScheduleSuggestionAccepted(input.suggestion.careType);
      await dismissCareScheduleSuggestion(user!.id, input.suggestion.id);
      return schedule;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.reminders });
      await queryClient.invalidateQueries({ queryKey: ["care-calendar"] });
    },
  });

  const dismissSuggestion = useMutation({
    mutationFn: async (suggestion: CareScheduleSuggestion) => {
      assertAiCareScheduleAccess();
      await dismissCareScheduleSuggestion(user!.id, suggestion.id);
      trackAiScheduleSuggestionDismissed(suggestion.careType);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["care-calendar"] });
    },
  });

  return {
    logCare,
    reschedule,
    acceptSuggestion,
    dismissSuggestion,
  };
}
