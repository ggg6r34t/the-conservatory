import { setEntitlementState } from "@/services/entitlementState";

import {
  getCareLogHistorySinceForDisplay,
  getCareLogHistorySinceForMode,
  getExportCareLogHistoryLimitDays,
  resolveExportMode,
} from "@/features/export/services/exportAccessPolicy";

describe("export access policy", () => {
  beforeEach(() => {
    setEntitlementState(false);
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-02T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resolves premium export only when entitled", () => {
    setEntitlementState(true);
    expect(resolveExportMode("premium")).toBe("premium");
    expect(resolveExportMode()).toBe("premium");
  });

  it("rejects premium export for free users", () => {
    expect(() => resolveExportMode("premium")).toThrow(/premium/i);
  });

  it("applies the free care-log window for basic export and display", () => {
    const since = getCareLogHistorySinceForMode("basic");
    expect(since).toBe("2026-04-03T12:00:00.000Z");
    expect(getExportCareLogHistoryLimitDays("basic")).toBe(60);
    expect(getExportCareLogHistoryLimitDays("premium")).toBeNull();
    expect(
      getCareLogHistorySinceForDisplay(false, "display"),
    ).toBe(since);
    expect(getCareLogHistorySinceForDisplay(false, "streak")).toBeUndefined();
    expect(getCareLogHistorySinceForDisplay(true, "display")).toBeUndefined();
  });
});
