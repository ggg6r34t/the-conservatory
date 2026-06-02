import { careLogsBatchQueryKey } from "@/features/care-logs/hooks/useCareLogsForPlantIds";
import { getCareLogHistorySinceForDisplay } from "@/features/export/services/exportAccessPolicy";

describe("careLogsBatchQueryKey", () => {
  it("sorts plant ids so key order is stable", () => {
    const left = careLogsBatchQueryKey("collection-streak", ["b", "a", "c"]);
    const right = careLogsBatchQueryKey("collection-streak", ["c", "a", "b"]);

    expect(left).toEqual(right);
    expect(left[4]).toBe("a|b|c");
  });

  it("scopes keys by batch purpose", () => {
    const streakKey = careLogsBatchQueryKey("collection-streak", ["plant-1"]);
    const dashboardKey = careLogsBatchQueryKey("dashboard", ["plant-1"]);

    expect(streakKey[2]).toBe("collection-streak");
    expect(dashboardKey[2]).toBe("dashboard");
    expect(streakKey).not.toEqual(dashboardKey);
  });

  it("keeps full history for streak scope while limiting display scope for free users", () => {
    const streakKey = careLogsBatchQueryKey("collection-streak", ["plant-1"]);
    const journalKey = careLogsBatchQueryKey(
      "journal",
      ["plant-1"],
      getCareLogHistorySinceForDisplay(false, "display"),
    );

    expect(streakKey[3]).toBe("all");
    expect(journalKey[3]).not.toBe("all");
  });
});
