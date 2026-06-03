import {
  getUserPreferences,
  updatePreferredTheme,
} from "@/features/settings/api/settingsClient";
import {
  applyTheme,
  reconcilePreferredTheme,
  resolveAccessibleThemeId,
  ThemeApplicationError,
} from "@/features/theme/services/themeApplication";
import { writeCachedThemeId } from "@/features/theme/services/themeCacheStorage";

jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: jest.fn().mockResolvedValue({ preferredTheme: "linen-light" }),
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
  trackThemeSaveFailed: jest.fn(),
}));

const getUserPreferencesMock = getUserPreferences as jest.Mock;
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
    getUserPreferencesMock.mockResolvedValueOnce({ preferredTheme: "linen-light" });

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

  it("persists when runtime already matches but SQLite preference does not", async () => {
    getUserPreferencesMock.mockResolvedValueOnce({ preferredTheme: "linen-light" });

    const result = await applyTheme({
      userId: "user-1",
      themeId: "deep-forest",
      subscription: { tier: "premium", period: "monthly" },
      previousThemeId: "deep-forest",
    });

    expect(result.appliedThemeId).toBe("deep-forest");
    expect(result.changed).toBe(true);
    expect(updatePreferredThemeMock).toHaveBeenCalledWith("user-1", "deep-forest");
    expect(writeCachedThemeIdMock).toHaveBeenCalledWith("deep-forest");
  });

  it("skips writes when preference is already stored", async () => {
    getUserPreferencesMock.mockResolvedValueOnce({ preferredTheme: "deep-forest" });

    const result = await applyTheme({
      userId: "user-1",
      themeId: "deep-forest",
      subscription: { tier: "premium", period: "monthly" },
      previousThemeId: "deep-forest",
    });

    expect(result.appliedThemeId).toBe("deep-forest");
    expect(result.changed).toBe(false);
    expect(updatePreferredThemeMock).not.toHaveBeenCalled();
    expect(writeCachedThemeIdMock).toHaveBeenCalledWith("deep-forest");
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
