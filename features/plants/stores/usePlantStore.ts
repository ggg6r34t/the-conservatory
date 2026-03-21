import { create } from "zustand";

import type { PlantLibraryFilter, PlantSortOption } from "@/types/ui";

interface PlantStoreState {
  filter: PlantLibraryFilter;
  sort: PlantSortOption;
  query: string;
  setFilter: (filter: PlantLibraryFilter) => void;
  setSort: (sort: PlantSortOption) => void;
  setQuery: (query: string) => void;
}

export const usePlantStore = create<PlantStoreState>((set) => ({
  filter: "all",
  sort: "recent",
  query: "",
  setFilter: (filter) => set({ filter }),
  setSort: (sort) => set({ sort }),
  setQuery: (query) => set({ query }),
}));
