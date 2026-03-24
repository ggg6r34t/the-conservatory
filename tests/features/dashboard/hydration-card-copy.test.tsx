import React from "react";

import { render } from "@testing-library/react-native";

import { HydrationCard } from "@/features/dashboard/components/HydrationCard";

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      surfaceContainerLow: "#111",
      primary: "#222",
      onSurface: "#333",
      onSurfaceVariant: "#444",
    },
  }),
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

describe("HydrationCard copy", () => {
  it("shows overdue status and gentle-pass meta when care is overdue", () => {
    const { getByText } = render(<HydrationCard dueToday={1} overdue={1} />);

    expect(
      getByText(
        "One specimen needs attention today. One care window opens in the next day.",
      ),
    ).toBeTruthy();
    expect(
      getByText("A gentle watering pass today should keep your rhythm steady."),
    ).toBeTruthy();
  });

  it("shows due-soon status and next-cycle-hours meta when care is upcoming", () => {
    const { getByText } = render(<HydrationCard dueToday={2} overdue={0} />);

    expect(
      getByText("Two specimens are due for care within the next day."),
    ).toBeTruthy();
    expect(getByText("Next cycle in 2 hours.")).toBeTruthy();
  });

  it("shows hydrated status and gentle-pass meta when there is no time left", () => {
    const { getByText } = render(<HydrationCard dueToday={0} overdue={0} />);

    expect(getByText("All specimens are comfortably hydrated.")).toBeTruthy();
    expect(
      getByText("A gentle watering pass today should keep your rhythm steady."),
    ).toBeTruthy();
  });
});
