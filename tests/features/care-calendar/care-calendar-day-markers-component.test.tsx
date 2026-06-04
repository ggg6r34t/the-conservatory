import fs from "fs";
import path from "path";

import { render } from "@testing-library/react-native";
import React from "react";

import { CareCalendarDayMarkers } from "@/features/care-calendar/components/CareCalendarDayMarkers";

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      primary: "#111",
      secondary: "#444",
      onPrimary: "#fff",
      error: "#c00",
      surface: "#fafafa",
      surfaceContainerHigh: "#ddd",
    },
  }),
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

describe("CareCalendarDayMarkers", () => {
  it("renders empty spacer when there are no active tasks", () => {
    const view = render(
      <CareCalendarDayMarkers
        markers={{
          careTypes: [],
          plants: [],
          hasOverdue: false,
          activeTaskCount: 0,
        }}
      />,
    );

    expect(view.toJSON()).toBeTruthy();
  });

  it("renders marker rows for active tasks without crashing", () => {
    const view = render(
      <CareCalendarDayMarkers
        markers={{
          careTypes: ["water"],
          plants: [
            { plantId: "plant-a", plantName: "Aloe", photoUri: "file:///aloe.jpg" },
            { plantId: "plant-b", plantName: "Fern", photoUri: null },
          ],
          hasOverdue: true,
          activeTaskCount: 2,
        }}
        selected={false}
      />,
    );

    expect(view.toJSON()).toBeTruthy();
  });

  it("does not ship a visual +N overflow badge", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "features",
        "care-calendar",
        "components",
        "CareCalendarDayMarkers.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("colors.error");
    expect(source).not.toMatch(/\+[\s{]*count|OverflowBadge|overflow.*Text/i);
  });
});
