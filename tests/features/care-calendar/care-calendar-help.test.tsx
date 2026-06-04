import { render, screen, userEvent } from "@testing-library/react-native";
import React from "react";

import { CareCalendarToolbar } from "@/features/care-calendar/components/CareCalendarToolbar";
import { CARE_CALENDAR_HELP_SECTIONS } from "@/features/care-calendar/services/careCalendarHelpContent";

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      primary: "#111",
      secondary: "#444",
      onSurface: "#222",
      onSurfaceVariant: "#666",
      surfaceContainerLow: "#f2f2f2",
      surfaceContainerHigh: "#ddd",
      backdrop: "rgba(0,0,0,0.4)",
    },
  }),
}));

describe("care calendar help", () => {
  it("opens help modal with marker and schedule copy", async () => {
    const user = userEvent.setup();
    render(
      <CareCalendarToolbar
        summaryLabel="3 due this week"
        horizonNotice={null}
        showAiFallback={false}
        overflowActions={[]}
      />,
    );

    await user.press(screen.getByLabelText("About Care Calendar"));

    expect(screen.getByText("About this calendar")).toBeTruthy();
    expect(screen.getByText(CARE_CALENDAR_HELP_SECTIONS.monthMarkers.title)).toBeTruthy();
    expect(screen.getByText(CARE_CALENDAR_HELP_SECTIONS.monthMarkers.body)).toBeTruthy();
    expect(screen.getByText(CARE_CALENDAR_HELP_SECTIONS.scheduleRange.body)).toBeTruthy();
  });

  it("shows horizon callout when notice is active", async () => {
    const user = userEvent.setup();
    const notice =
      "Some care extends beyond 90 days — open Agenda for the full list.";

    render(
      <CareCalendarToolbar
        summaryLabel="3 due this week"
        horizonNotice={notice}
        showAiFallback={false}
        overflowActions={[]}
      />,
    );

    await user.press(screen.getByLabelText("About Care Calendar"));

    expect(screen.getByText(notice)).toBeTruthy();
  });

  it("shows AI fallback section when enabled", async () => {
    const user = userEvent.setup();
    render(
      <CareCalendarToolbar
        summaryLabel="1 in the next 14 days"
        horizonNotice={null}
        showAiFallback
        overflowActions={[]}
      />,
    );

    await user.press(screen.getByLabelText("About Care Calendar"));

    expect(screen.getByText(CARE_CALENDAR_HELP_SECTIONS.aiFallback.title)).toBeTruthy();
    expect(screen.getByText(CARE_CALENDAR_HELP_SECTIONS.aiFallback.body)).toBeTruthy();
  });
});
