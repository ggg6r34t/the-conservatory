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

  it("labels cloud AI suggestions", () => {
    expect(
      getCareCalendarSourceLabel({
        source: "ai_suggested",
        careType: "repot",
        isAiSuggested: true,
        suggestionDerivation: "cloud",
      }),
    ).toBe("AI-assisted care rhythm");
  });

  it("labels on-device heuristic suggestions", () => {
    expect(
      getCareCalendarSourceLabel({
        source: "ai_suggested",
        careType: "repot",
        isAiSuggested: true,
        suggestionDerivation: "local",
      }),
    ).toBe("On-device rhythm hint");
  });

  it("labels cached suggestions neutrally", () => {
    expect(
      getCareCalendarSourceLabel({
        source: "ai_suggested",
        careType: "repot",
        isAiSuggested: true,
        suggestionDerivation: "cached",
      }),
    ).toBe("Suggested care rhythm");
  });
});
