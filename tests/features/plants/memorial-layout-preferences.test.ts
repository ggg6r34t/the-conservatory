jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  readMemorialLayoutPreferences,
  setFeaturedMemorialPreference,
} from "@/features/plants/services/memorialLayoutPreferencesService";
import {
  applyMemorialLayoutPreferences,
  selectMemorialRoles,
} from "@/features/plants/services/memorialSelectionService";
import type { GraveyardPlantListItem } from "@/features/plants/api/plantsClient";

function buildMemorial(id: string): GraveyardPlantListItem {
  return {
    id,
    plantId: `plant-${id}`,
    userId: "user-1",
    name: `Plant ${id}`,
    speciesName: "Species",
    nickname: null,
    memorialNote: "Remembered gently.",
    plantNotes: null,
    causeOfPassing: null,
    primaryPhotoUri: null,
    hasPrimaryPhoto: false,
    photoCount: 1,
    careLogCount: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    archivedAt: "2025-01-01T00:00:00.000Z",
    pending: 0,
  };
}

describe("memorial layout preferences", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("persists featured memorial preference per user", async () => {
    await setFeaturedMemorialPreference("user-1", "memorial-b");
    const preferences = await readMemorialLayoutPreferences("user-1");

    expect(preferences.featuredMemorialId).toBe("memorial-b");
    expect(preferences.pinnedMemorialIds).toContain("memorial-b");
  });

  it("applies featured memorial preference to graveyard role selection", () => {
    const memorials = [buildMemorial("a"), buildMemorial("b"), buildMemorial("c")];
    const base = selectMemorialRoles(memorials);
    const roles = applyMemorialLayoutPreferences(
      base,
      {
        featuredMemorialId: "b",
      },
      memorials,
    );

    expect(roles.featuredMemorial?.id).toBe("b");
  });
});
