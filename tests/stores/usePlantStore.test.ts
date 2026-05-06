import AsyncStorage from "@react-native-async-storage/async-storage";
import { waitFor } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("usePlantStore persistence", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.resetModules();
  });

  it("has persist middleware configured for filter and sort", async () => {
    const { usePlantStore } = require("@/features/plants/stores/usePlantStore");

    // Verify the store has a persist API (added by persist middleware)
    expect(usePlantStore.persist).toBeDefined();
    expect(typeof usePlantStore.persist.getOptions).toBe("function");

    const options = usePlantStore.persist.getOptions();
    expect(options.name).toBe("plant-library-prefs");
  });

  it("does not persist query (search text)", async () => {
    const { usePlantStore } = require("@/features/plants/stores/usePlantStore");
    const options = usePlantStore.persist.getOptions();

    // partialize should exclude query
    const state = { filter: "all", sort: "recent", query: "test search" };
    const partial = options.partialize(state);
    expect(partial).not.toHaveProperty("query");
    expect(partial).toHaveProperty("filter");
    expect(partial).toHaveProperty("sort");
  });

  it("starts from an empty query after a fresh store load", async () => {
    jest.resetModules();
    const reloadedAsyncStorage = require("@react-native-async-storage/async-storage");
    await reloadedAsyncStorage.setItem(
      "plant-library-prefs",
      JSON.stringify({
        state: {
          filter: "graveyard",
          sort: "name",
        },
        version: 0,
      }),
    );

    const reloadedStore =
      require("@/features/plants/stores/usePlantStore").usePlantStore;
    await reloadedStore.persist.rehydrate();

    await waitFor(() => {
      expect(reloadedStore.getState().filter).toBe("graveyard");
      expect(reloadedStore.getState().sort).toBe("name");
      expect(reloadedStore.getState().query).toBe("");
    });
    expect(
      reloadedStore.persist.getOptions().partialize({
        filter: "graveyard",
        sort: "name",
        query: "search term",
      }),
    ).toEqual({
      filter: "graveyard",
      sort: "name",
    });
  });
});
