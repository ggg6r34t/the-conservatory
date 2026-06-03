import { renderHook } from "@testing-library/react-native";

import { usePreferredThemeDisplayName } from "@/features/theme/hooks/usePreferredThemeDisplay";

const mockTrackProfileThemeLabelRendered = jest.fn();

jest.mock("@/features/theme/analytics", () => ({
  trackProfileThemeLabelRendered: (...args: unknown[]) =>
    mockTrackProfileThemeLabelRendered(...args),
}));

jest.mock("@/features/settings/hooks/useSettings", () => ({
  useSettings: () => ({
    isLoading: false,
    data: { preferredTheme: "linen-light" },
  }),
}));

jest.mock("@/features/theme/stores/useThemeRuntimeStore", () => ({
  useThemeRuntimeStore: (
    selector: (state: { activeThemeId: string; hydrated: boolean }) => unknown,
  ) =>
    selector({
      activeThemeId: "deep-forest",
      hydrated: true,
    }),
}));

describe("usePreferredThemeDisplayName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the active runtime theme instead of stale SQLite label data", () => {
    const { result } = renderHook(() => usePreferredThemeDisplayName());

    expect(result.current.displayName).toBe("Deep Forest");
    expect(result.current.themeId).toBe("deep-forest");
    expect(mockTrackProfileThemeLabelRendered).toHaveBeenCalledWith({
      theme_id: "deep-forest",
      source: "profile_settings",
    });
  });
});
