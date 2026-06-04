import { useEffect, useRef } from "react";

import {
  trackAiScheduleSuggestionViewed,
  trackCareCalendarOpened,
} from "@/features/care-calendar/analytics";

export function useCareCalendarAnalytics(input: {
  source: "dashboard" | "reminders" | "plant_detail";
  suggestionCount: number;
  aiSuggestionsEnabled: boolean;
}) {
  const openedTracked = useRef(false);
  const suggestionsTracked = useRef(false);

  useEffect(() => {
    if (openedTracked.current) {
      return;
    }

    openedTracked.current = true;
    trackCareCalendarOpened(input.source);
  }, [input.source]);

  useEffect(() => {
    if (
      suggestionsTracked.current ||
      !input.aiSuggestionsEnabled ||
      input.suggestionCount <= 0
    ) {
      return;
    }

    suggestionsTracked.current = true;
    trackAiScheduleSuggestionViewed(input.suggestionCount);
  }, [input.aiSuggestionsEnabled, input.suggestionCount]);
}
