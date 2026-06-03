import { updatePreferredTheme } from "@/features/settings/api/settingsClient";
import {
  applyTheme,
  reconcilePreferredTheme,
  resolveAccessibleThemeId,
  ThemeApplicationError,
} from "@/features/theme/services/themeApplication";
import { writeCachedThemeId } from "@/features/theme/services/themeCacheStorage";

jest.mock("@/features/settings/api/settingsClient", () => ({
  updatePreferredTheme: jest.fn().mockResolvedValue({ preferredTheme: "linen-light" }),
}));

jest.mock("@/features/theme/services/themeCacheStorage", () => ({
  writeCachedThemeId: jest.fn().mockResolvedValue(undefined),
  readCachedThemeId: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/features/theme/analytics", () => ({
  trackThemeSelected: jest.fn(),
  trackThemeChanged: jest.fn(),
  trackThemeFallbackApplied: jest.fn(),
  trackThemeRevertedAfterDowngrade: jest.fn(),
}));

const updatePreferredThemeMock = updatePreferredTheme as jest.Mock;
const writeCachedThemeIdMock = writeCachedThemeId as jest.Mock;

describe("theme application service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects premium theme application for free users", async () => {
    await expect(
      applyTheme({
        userId: "user-1",
        themeId: "deep-forest",
        subscription: { tier: "free", period: null },
        previousThemeId: "linen-light",
      }),
    ).rejects.toBeInstanceOf(ThemeApplicationError);

    expect(updatePreferredThemeMock).not.toHaveBeenCalled();
    expect(writeCachedThemeIdMock).not.toHaveBeenCalled();
  });

  it("persists premium theme for recurring subscribers", async () => {
    const result = await applyTheme({
      userId: "user-1",
      themeId: "midnight-ivy",
      subscription: { tier: "premium", period: "annual" },
      previousThemeId: "linen-light",
    });

    expect(result.appliedThemeId).toBe("midnight-ivy");
    expect(updatePreferredThemeMock).toHaveBeenCalledWith("user-1", "midnight-ivy");
    expect(writeCachedThemeIdMock).toHaveBeenCalledWith("midnight-ivy");
  });

  it("reconciles stale premium preference to linen-light", async () => {
    const result = await reconcilePreferredTheme({
      userId: "user-1",
      preferredThemeId: "deep-forest",
      subscription: { tier: "free", period: null },
      source: "test",
    });

    expect(result.themeId).toBe("linen-light");
    expect(result.corrected).toBe(true);
    expect(updatePreferredThemeMock).toHaveBeenCalledWith("user-1", "linen-light");
  });

  it("resolves accessible theme without persisting", () => {
    expect(
      resolveAccessibleThemeId("terracotta-dusk", {
        tier: "free",
        period: null,
      }),
    ).toBe("linen-light");
    expect(
      resolveAccessibleThemeId("terracotta-dusk", {
        tier: "premium",
        period: "monthly",
      }),
    ).toBe("terracotta-dusk");
  });
});
