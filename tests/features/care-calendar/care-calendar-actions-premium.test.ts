import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import { createElement, type PropsWithChildren } from "react";

import { useCareCalendarActions } from "@/features/care-calendar/hooks/useCareCalendarActions";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: false }),
}));

jest.mock("@/features/notifications/hooks/useSetReminder", () => ({
  useSetReminder: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock("@/features/care-logs/api/careLogsClient", () => ({
  createCareLog: jest.fn(),
}));

jest.mock("@/features/care-calendar/api/careScheduleSuggestionsClient", () => ({
  upsertCareScheduleSuggestion: jest.fn(),
}));

jest.mock("@/features/care-calendar/services/careCalendarAiScheduleService", () => ({
  dismissCareScheduleSuggestion: jest.fn(),
}));

describe("useCareCalendarActions premium gates", () => {
  it("blocks acceptSuggestion for free users", async () => {
    const { result } = renderHook(() => useCareCalendarActions(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.acceptSuggestion.mutateAsync({
        suggestion: {
          id: "suggest:plant-1:repot:2026-06-10",
          plantId: "plant-1",
          plantName: "Monstera",
          careType: "repot",
          suggestedDueDate: "2026-06-10",
          frequencyDays: 365,
          confidence: "low",
          reason: "Test",
        },
        plantName: "Monstera",
        speciesName: "Monstera deliciosa",
      }),
    ).rejects.toThrow(/AI care schedule/i);
  });

  it("blocks dismissSuggestion for free users", async () => {
    const { result } = renderHook(() => useCareCalendarActions(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.dismissSuggestion.mutateAsync({
        id: "suggest:plant-1:repot:2026-06-10",
        plantId: "plant-1",
        plantName: "Monstera",
        careType: "repot",
        suggestedDueDate: "2026-06-10",
        frequencyDays: 365,
        confidence: "low",
        reason: "Test",
      }),
    ).rejects.toThrow(/AI care schedule/i);
  });
});
