import fs from "fs";
import path from "path";

describe("streak flicker remediation", () => {
  it("keeps the last stable streak while care logs are unavailable", () => {
    const hookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "features",
        "plants",
        "hooks",
        "useCollectionStreak.ts",
      ),
      "utf8",
    );

    expect(hookSource).toContain("resolveDisplayStreak");
    expect(hookSource).toContain("lastStableStreakRef");
    expect(hookSource).toContain("refreshIfStale");
  });

  it("preserves care-log query data during refetch for collection streak", () => {
    const hookSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "features",
        "care-logs",
        "hooks",
        "useCareLogsForPlantIds.ts",
      ),
      "utf8",
    );

    expect(hookSource).toContain("placeholderData: (previousData) => previousData");
    expect(hookSource).toContain('scope === "collection-streak" ? 1000 * 30 : 0');
  });

  it("refreshes profile streak only when stale", () => {
    const profileSource = fs.readFileSync(
      path.join(process.cwd(), "app", "profile.tsx"),
      "utf8",
    );

    expect(profileSource).toContain("refreshIfStale");
    expect(profileSource).not.toContain("refetchStreak");
  });

  it("renders compact streak badge without a duplicate stats-card background", () => {
    const badgeSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "features",
        "plants",
        "components",
        "StreakBadge.tsx",
      ),
      "utf8",
    );

    expect(badgeSource).toContain("styles.compactContainer");
    expect(badgeSource).toMatch(
      /compact\s*\?\s*styles\.compactContainer\s*:\s*\[styles\.container, \{ backgroundColor: colors\.surfaceContainerLow \}\]/,
    );
  });
});
