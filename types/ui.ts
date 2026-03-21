export type PlantLibraryFilter = "all" | "needs-water" | "thriving";
export type PlantSortOption = "recent" | "name" | "water-due";

export interface PlantLibraryState {
  filter: PlantLibraryFilter;
  sort: PlantSortOption;
  query: string;
}
