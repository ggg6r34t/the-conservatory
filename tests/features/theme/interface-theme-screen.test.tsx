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

import InterfaceThemeScreen from "@/app/interface-theme";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockMutateAsync = jest.fn();
const mockTrackThemeScreenViewed = jest.fn();
const mockTrackThemePreviewViewed = jest.fn();
const mockTrackThemeSelected = jest.fn();
const mockTrackThemeChanged = jest.fn();

jest.mock("@/features/settings/hooks/useSettings", () => ({
  useSettings: () => ({
    isLoading: false,
    data: { preferredTheme: "linen-light" },
  }),
}));

jest.mock("@/features/theme/hooks/usePreferredThemeMutation", () => ({
  usePreferredThemeMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
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
  trackThemeSelected: (...args: unknown[]) => mockTrackThemeSelected(...args),
  trackThemeChanged: (...args: unknown[]) => mockTrackThemeChanged(...args),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
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

describe("InterfaceThemeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetActiveThemeId.mockClear();
    mockMutateAsync.mockResolvedValue({
      previousTheme: "linen-light",
      nextThemeId: "deep-forest",
      changed: true,
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
    expect(screen.getAllByText("EDITORIAL PREVIEW").length).toBe(4);
  });

  it("applies a new theme when an unselected card is pressed", async () => {
    renderWithProviders(<InterfaceThemeScreen />);

    fireEvent.press(screen.getByLabelText(/Deep Forest/i));

    expect(mockSetActiveThemeId).toHaveBeenCalledWith("deep-forest");
    expect(mockMutateAsync).toHaveBeenCalledWith("deep-forest");
    expect(mockTrackThemeScreenViewed).toHaveBeenCalled();
  });
});
