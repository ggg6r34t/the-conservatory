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
  it("shows first-run guidance when there are no plants", () => {
    const { getByText } = render(
      <HydrationCard
        totalPlants={0}
        dueToday={0}
        overdue={0}
        nextCycleHours={null}
      />,
    );

    expect(getByText(/Add your first plant/i)).toBeTruthy();
  });

  it("shows cared-for status when plants exist and none are due", () => {
    const { getByText, queryByText } = render(
      <HydrationCard
        totalPlants={2}
        dueToday={0}
        overdue={0}
        nextCycleHours={null}
      />,
    );

    expect(getByText("Your plants are cared for today.")).toBeTruthy();
    expect(queryByText(/hydrated|rhythm steady/i)).toBeNull();
  });

  it("shows due-soon status and next-cycle-hours meta when care is upcoming", () => {
    const { getByText } = render(
      <HydrationCard totalPlants={2} dueToday={2} overdue={0} nextCycleHours={5} />,
    );

    expect(
      getByText("Two specimens are due for care within the next day."),
    ).toBeTruthy();
    expect(getByText("Next cycle in 5 hours.")).toBeTruthy();
  });

  it("shows overdue status when care is overdue", () => {
    const { getByText } = render(
      <HydrationCard totalPlants={2} dueToday={1} overdue={1} nextCycleHours={2} />,
    );

    expect(getByText(/One specimen needs attention today/i)).toBeTruthy();
  });
});
