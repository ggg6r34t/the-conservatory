import { getCareCalendarSourceLabel } from "@/features/care-calendar/services/careCalendarSourceLabels";

describe("getCareCalendarSourceLabel", () => {
  it("labels manual reminders by care type", () => {
    expect(
      getCareCalendarSourceLabel({
        source: "manual_reminder",
        careType: "mist",
      }),
    ).toBe("From your mist reminder");
  });

  it("labels AI suggestions", () => {
    expect(
      getCareCalendarSourceLabel({
        source: "ai_suggested",
        careType: "repot",
        isAiSuggested: true,
      }),
    ).toBe("Suggested care rhythm");
  });
});
