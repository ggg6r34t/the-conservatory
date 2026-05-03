import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { PlantLibraryFilter, PlantSortOption } from "@/types/ui";

interface PlantStoreState {
  filter: PlantLibraryFilter;
  sort: PlantSortOption;
  query: string;
  setFilter: (filter: PlantLibraryFilter) => void;
  setSort: (sort: PlantSortOption) => void;
  setQuery: (query: string) => void;
}

export const usePlantStore = create<PlantStoreState>()(
  persist(
    (set) => ({
      filter: "all",
      sort: "recent",
      query: "",
      setFilter: (filter) => set({ filter }),
      setSort: (sort) => set({ sort }),
      setQuery: (query) => set({ query }),
    }),
    {
      name: "plant-library-prefs",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ filter: state.filter, sort: state.sort }),
    },
  ),
);
