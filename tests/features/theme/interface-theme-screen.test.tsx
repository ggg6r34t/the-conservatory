import type React from "react";
import { fireEvent, screen } from "@testing-library/react-native";

jest.mock("@/features/theme/services/themeCacheStorage", () => ({
  readCachedThemeId: jest.fn().mockResolvedValue("linen-light"),
  writeCachedThemeId: jest.fn().mockResolvedValue(undefined),
  clearCachedThemeId: jest.fn().mockResolvedValue(undefined),
  getBootstrapThemeId: jest.fn(
    (_cached: string | null, preferred?: string | null) => preferred ?? "linen-light",
  ),
}));

const mockPush = jest.fn();
const mockMutateAsync = jest.fn();
const mockTrackThemeScreenViewed = jest.fn();
const mockTrackThemePreviewViewed = jest.fn();
const mockTrackPremiumThemeTapped = jest.fn();
const mockTrackPremiumThemeBlocked = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
}));

jest.mock("@/features/settings/hooks/useSettings", () => ({
  useSettings: () => ({
    isLoading: false,
    data: { preferredTheme: "linen-light" },
  }),
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free",
    period: null,
    isPremium: false,
  }),
}));

jest.mock("@/features/theme/hooks/usePreferredThemeMutation", () => ({
  usePreferredThemeMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  ThemeApplicationError: class ThemeApplicationError extends Error {},
}));

const mockSetActiveThemeId = jest.fn();

jest.mock("@/features/theme/stores/useThemeRuntimeStore", () => ({
  useThemeRuntimeStore: (
    selector: (state: {
      activeThemeId: string;
      setActiveThemeId: (themeId: string) => void;
    }) => unknown,
  ) =>
    selector({
      activeThemeId: "linen-light",
      setActiveThemeId: mockSetActiveThemeId,
    }),
}));

jest.mock("@/features/theme/analytics", () => ({
  trackThemeScreenViewed: (...args: unknown[]) =>
    mockTrackThemeScreenViewed(...args),
  trackThemePreviewViewed: (...args: unknown[]) =>
    mockTrackThemePreviewViewed(...args),
  trackPremiumThemeTapped: (...args: unknown[]) =>
    mockTrackPremiumThemeTapped(...args),
  trackPremiumThemeBlocked: (...args: unknown[]) =>
    mockTrackPremiumThemeBlocked(...args),
}));

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: ({ name }: { name: string }) => {
    const { Text } = require("react-native");
    return <Text>{name}</Text>;
  },
}));

import InterfaceThemeScreen from "@/app/interface-theme";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

describe("InterfaceThemeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetActiveThemeId.mockClear();
    mockMutateAsync.mockResolvedValue({
      appliedThemeId: "deep-forest",
      changed: true,
      previousThemeId: "linen-light",
    });
  });

  it("renders all theme cards from the catalog", () => {
    renderWithProviders(<InterfaceThemeScreen />);

    expect(screen.getByText("Interface Theme")).toBeTruthy();
    expect(screen.getByText("Save")).toBeTruthy();
    expect(screen.getByText("Linen Light")).toBeTruthy();
    expect(screen.getByText("Deep Forest")).toBeTruthy();
    expect(screen.getByText("Midnight Ivy")).toBeTruthy();
    expect(screen.getByText("Terracotta Dusk")).toBeTruthy();
  });

  it("routes free users to Premium when tapping a locked theme", () => {
    renderWithProviders(<InterfaceThemeScreen />);

    fireEvent.press(screen.getByLabelText(/Deep Forest, Premium theme/i));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/premium",
      params: { source: "theme_screen", theme_id: "deep-forest" },
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockTrackPremiumThemeTapped).toHaveBeenCalled();
  });

  it("applies linen-light when selected by a free user", async () => {
    renderWithProviders(<InterfaceThemeScreen />);

    fireEvent.press(screen.getByLabelText(/Linen Light/i));

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
