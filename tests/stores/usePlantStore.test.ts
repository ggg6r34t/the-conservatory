import AsyncStorage from "@react-native-async-storage/async-storage";

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
});
