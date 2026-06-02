import type { PlantListItem } from "@/features/plants/api/plantsClient";
import {
  groupPlantsForAdvancedFilter,
  isPremiumLibraryFilter,
  resolvePlantLibraryFilter,
} from "@/features/plants/services/plantLibraryFilterService";

function buildPlant(
  id: string,
  patch: Partial<PlantListItem> = {},
): PlantListItem {
  return {
    id,
    userId: "user-1",
    name: `Plant ${id}`,
    speciesName: "Monstera deliciosa",
    status: "active",
    wateringIntervalDays: 7,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    pending: 0,
    ...patch,
  };
}

describe("plantLibraryFilterService", () => {
  it("identifies premium-only library filters", () => {
    expect(isPremiumLibraryFilter("by-location")).toBe(true);
    expect(isPremiumLibraryFilter("by-species")).toBe(true);
    expect(isPremiumLibraryFilter("all")).toBe(false);
  });

  it("falls back to all for free users attempting premium filters", () => {
    expect(resolvePlantLibraryFilter("by-location", false)).toBe("all");
    expect(resolvePlantLibraryFilter("by-species", false)).toBe("all");
    expect(resolvePlantLibraryFilter("by-location", true)).toBe("by-location");
  });

  it("groups plants by location with unplaced last", () => {
    const sections = groupPlantsForAdvancedFilter(
      [
        buildPlant("a", { name: "Alpha", location: "Kitchen" }),
        buildPlant("b", { name: "Beta", location: null }),
        buildPlant("c", { name: "Charlie", location: "Living Room" }),
      ],
      "by-location",
    );

    expect(sections.map((section) => section.title)).toEqual([
      "Kitchen",
      "Living Room",
      "Unplaced",
    ]);
    expect(sections[0]?.plants.map((plant) => plant.name)).toEqual(["Alpha"]);
  });

  it("groups plants by species alphabetically", () => {
    const sections = groupPlantsForAdvancedFilter(
      [
        buildPlant("a", { name: "Alpha", speciesName: "Ficus lyrata" }),
        buildPlant("b", { name: "Beta", speciesName: "Monstera deliciosa" }),
        buildPlant("c", {
          name: "Charlie",
          speciesName: "Monstera deliciosa",
        }),
      ],
      "by-species",
    );

    expect(sections.map((section) => section.title)).toEqual([
      "Ficus lyrata",
      "Monstera deliciosa",
    ]);
    expect(sections[1]?.plants.map((plant) => plant.name)).toEqual([
      "Beta",
      "Charlie",
    ]);
  });
});
