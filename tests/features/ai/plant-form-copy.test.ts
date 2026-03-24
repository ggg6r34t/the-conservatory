jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { REMINDER_TIMING_COPY } from "@/features/plants/components/PlantForm";

describe("PlantForm AI copy", () => {
  it("does not overclaim humidity-driven reminder intelligence", () => {
    expect(REMINDER_TIMING_COPY.toLowerCase()).not.toContain("humidity");
    expect(REMINDER_TIMING_COPY).toBe("Adaptive reminders based on care rhythm");
  });
});
