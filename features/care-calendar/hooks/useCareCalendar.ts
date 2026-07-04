import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { cloudAllowedForFeature } from "@/features/billing/services/featureAccess";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import {
  deriveCareCalendarEvents,
  filterCareCalendarEvents,
} from "@/features/care-calendar/services/careCalendarDerivationService";
import {
  getCareScheduleSuggestions,
  suggestionsToCalendarEvents,
} from "@/features/care-calendar/services/careCalendarAiScheduleService";
import type { CareCalendarFilter } from "@/features/care-calendar/types";
import { useCareLogsForPlantIds } from "@/features/care-logs/hooks/useCareLogsForPlantIds";
import { useReminders } from "@/features/notifications/hooks/useReminders";
import { useAllActivePlants } from "@/features/plants/hooks/usePlants";
import { listCareScheduleSuggestions } from "@/features/care-calendar/api/careScheduleSuggestionsClient";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolveGuestCloudAllowed } from "@/features/auth/services/guestFeatureAccess";

export function useCareCalendar(input?: {
  plantId?: string;
  filter?: CareCalendarFilter;
}) {
  const { user, isGuest } = useAuth();
  const { isPremium } = useSubscription();
  const plantsQuery = useAllActivePlants();
  const remindersQuery = useReminders();
  const plants = plantsQuery.data ?? [];
  const plantIds = input?.plantId
    ? [input.plantId]
    : plants.map((plant) => plant.id);
  const logsQuery = useCareLogsForPlantIds(plantIds, "care-calendar", {
    isPremium,
  });
  const filter = input?.filter ?? "all";
  const cloudAllowed = resolveGuestCloudAllowed(
    isGuest,
    cloudAllowedForFeature("ai_care_schedule", isPremium, {
      totalPlantCount: plants.length,
      progressPhotosForPlant: {},
      aiHealthInsightsThisMonth: {},
      plantIdThisMonth: 0,
    }),
  );

  const schedulesQuery = useQuery({
    queryKey: ["care-calendar", "schedules", user?.id ?? "guest"],
    enabled: Boolean(user?.id),
    queryFn: () => listCareScheduleSuggestions(user!.id),
    staleTime: 1000 * 60 * 5,
  });

  const suggestionsQuery = useQuery({
    queryKey: [
      "care-calendar",
      "ai-suggestions",
      user?.id ?? "guest",
      plantIds.join(","),
      cloudAllowed,
    ],
    enabled: Boolean(user?.id) && plants.length > 0 && cloudAllowed,
    queryFn: () =>
      getCareScheduleSuggestions({
        userId: user!.id,
        plants,
        reminders: remindersQuery.data ?? [],
        logs: logsQuery.data ?? [],
        cloudAllowed,
      }),
    staleTime: 1000 * 60 * 10,
  });

  const derivedEvents = useMemo(
    () =>
      deriveCareCalendarEvents({
        plants,
        reminders: remindersQuery.data ?? [],
        schedules: schedulesQuery.data ?? [],
        logs: logsQuery.data ?? [],
        plantId: input?.plantId,
      }),
    [
      input?.plantId,
      logsQuery.data,
      plants,
      remindersQuery.data,
      schedulesQuery.data,
    ],
  );

  const aiEvents = useMemo(() => {
    if (!cloudAllowed) {
      return [];
    }

    return suggestionsToCalendarEvents(
      suggestionsQuery.data?.suggestions ?? [],
      suggestionsQuery.data?.source,
    );
  }, [cloudAllowed, suggestionsQuery.data]);

  const allEvents = useMemo(() => {
    const merged = [...derivedEvents];
    const seen = new Set(
      derivedEvents.map(
        (event) => `${event.plantId}:${event.careType}:${event.dueDate}`,
      ),
    );

    for (const event of aiEvents) {
      const key = `${event.plantId}:${event.careType}:${event.dueDate}`;
      if (!seen.has(key)) {
        merged.push(event);
        seen.add(key);
      }
    }

    return merged.sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  }, [aiEvents, derivedEvents]);

  const filteredEvents = useMemo(
    () => filterCareCalendarEvents(allEvents, filter),
    [allEvents, filter],
  );

  return {
    plants,
    events: filteredEvents,
    allEvents,
    suggestions: cloudAllowed
      ? (suggestionsQuery.data?.suggestions ?? [])
      : [],
    aiSuggestionsEnabled: cloudAllowed,
    aiSuggestionDerivation: cloudAllowed
      ? suggestionsQuery.data?.source
      : undefined,
    isLoading:
      plantsQuery.isLoading ||
      remindersQuery.isLoading ||
      schedulesQuery.isLoading ||
      logsQuery.isLoading ||
      suggestionsQuery.isLoading,
    isPremium,
    refresh: async () => {
      await Promise.all([
        plantsQuery.refetch(),
        remindersQuery.refetch(),
        schedulesQuery.refetch(),
        logsQuery.refetch(),
        suggestionsQuery.refetch(),
      ]);
    },
    refreshAiSuggestions: async () => {
      if (!cloudAllowed) {
        return;
      }

      await suggestionsQuery.refetch();
    },
  };
}
