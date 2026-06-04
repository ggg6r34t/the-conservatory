import fs from "fs";
import path from "path";

import { render, screen } from "@testing-library/react-native";
import React from "react";

import { CareCalendarAgenda } from "@/features/care-calendar/components/CareCalendarAgenda";
import { CARE_CALENDAR_DAY_MARKER_SIZE } from "@/features/care-calendar/components/CareCalendarMonthGrid";
import { toggleSelectedDateKey } from "@/features/care-calendar/services/careCalendarDerivationService";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      primary: "#111",
      secondary: "#444",
      onSurface: "#222",
      onSurfaceVariant: "#666",
      onTertiary: "#111",
      surfaceContainerLow: "#f2f2f2",
      surfaceContainerHigh: "#ddd",
      tertiaryContainer: "#e8efe8",
    },
    spacing: { lg: 16 },
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const sampleEvent: CareCalendarEvent = {
  id: "event-1",
  plantId: "plant-1",
  plantName: "Aloe Vera",
  careType: "water",
  dueDate: "2026-06-23",
  status: "upcoming",
  source: "manual_reminder",
  reminderId: "reminder-1",
};

describe("care calendar UI interactions", () => {
  it("toggles date selection off when the same day is pressed again", () => {
    expect(toggleSelectedDateKey("2026-06-23", "2026-06-23")).toBeNull();
    expect(toggleSelectedDateKey("2026-06-23", "2026-06-24")).toBe("2026-06-24");
    expect(toggleSelectedDateKey(null, "2026-06-23")).toBe("2026-06-23");
  });

  it("uses a circular day marker for month selection", () => {
    expect(CARE_CALENDAR_DAY_MARKER_SIZE).toBeGreaterThanOrEqual(36);
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "features",
        "care-calendar",
        "components",
        "CareCalendarMonthGrid.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("borderRadius: CARE_CALENDAR_DAY_MARKER_SIZE / 2");
    expect(source).toContain("CareCalendarDayMarkers");
    expect(source).toContain("deriveCareCalendarDayMarkers");
    expect(source).toContain("plants: PlantListItem[]");
    expect(source).not.toMatch(/styles\.marker,/);
    expect(source).not.toContain("CareCalendarDayOverflowBadge");
    expect(source).toContain("onShiftMonth");
    expect(source).not.toContain("CareCalendarMarkerHint");
  });

  it("omits agenda day headers in month day detail mode", () => {
    render(
      <CareCalendarAgenda
        events={[sampleEvent]}
        suggestionsById={new Map()}
        showDayHeaders={false}
        onLogCare={jest.fn()}
        onReschedule={jest.fn()}
        onEditReminder={jest.fn()}
        onAcceptSuggestion={jest.fn()}
        onDismissSuggestion={jest.fn()}
      />,
    );

    expect(screen.getByText("Aloe Vera")).toBeTruthy();
    expect(screen.queryByText("Tuesday, June 23")).toBeNull();
  });

  it("uses uniform action chips on task cards", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "features",
        "care-calendar",
        "components",
        "CareCalendarTaskCard.tsx",
      ),
      "utf8",
    );
    expect(source).not.toContain("PrimaryButton");
    expect(source).not.toContain("Mark done");
    expect(source).not.toContain("View plant");
    expect(source).toContain('label="Log care"');
    expect(source).toContain("minHeight: 40");
    expect(source).toContain('flexDirection: "row"');
  });

  it("supports clearing month selection in the screen shell", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app", "care-calendar.tsx"),
      "utf8",
    );
    expect(source).toContain("getDefaultCareCalendarDateKey");
    expect(source).toContain("useState<string | null>(todayKey)");
    expect(source).toContain("useFocusEffect");
    expect(source).toContain("Select a day to view scheduled care.");
    expect(source).toContain("showDayHeaders={false}");
    expect(source).toContain("appliedRouteRef");
    expect(source).toContain("plants={calendar.plants}");
    expect(source).toContain("CareCalendarMonthHeader");
    expect(source).toContain("useCareCalendarScreenActions");
  });
});
