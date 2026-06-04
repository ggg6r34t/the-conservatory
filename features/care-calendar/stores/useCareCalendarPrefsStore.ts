import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CareCalendarFilter, CareCalendarViewMode } from "@/features/care-calendar/types";

interface CareCalendarPrefsState {
  filter: CareCalendarFilter;
  viewMode: CareCalendarViewMode;
  setFilter: (filter: CareCalendarFilter) => void;
  setViewMode: (viewMode: CareCalendarViewMode) => void;
}

export const useCareCalendarPrefsStore = create<CareCalendarPrefsState>()(
  persist(
    (set) => ({
      filter: "all",
      viewMode: "month",
      setFilter: (filter) => set({ filter }),
      setViewMode: (viewMode) => set({ viewMode }),
    }),
    {
      name: "care-calendar-prefs",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        filter: state.filter,
        viewMode: state.viewMode,
      }),
    },
  ),
);
