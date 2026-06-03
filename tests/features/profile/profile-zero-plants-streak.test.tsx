import { screen } from "@testing-library/react-native";
import React from "react";

import ProfileScreen from "@/app/profile";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
  useFocusEffect: (callback: () => void) => {
    callback();
  },
}));

jest.mock("expo-constants", () => ({
  expoConfig: { version: "1.0.0" },
  manifest2: null,
}));

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return {
    LinearGradient: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      surface: "#fff",
      surfaceContainerLow: "#f2f2f2",
      surfaceContainerHigh: "#ddd",
      surfaceContainerLowest: "#fafafa",
      surfaceBright: "#fff",
      primary: "#111",
      secondary: "#444",
      onSurface: "#222",
      onSurfaceVariant: "#666",
      outlineVariant: "#ccc",
      primaryFixed: "#eee",
      secondaryContainer: "#ddd",
      shadowElevated: "#000",
      primaryContainer: "#333",
      onPrimary: "#fff",
    },
    spacing: { lg: 16, md: 12, sm: 8 },
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "grower@example.com", displayName: "Keeper" },
    signOut: jest.fn(),
    isSigningOut: false,
  }),
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: false,
    tier: "free",
    period: null,
    isLoading: false,
  }),
}));

jest.mock("@/features/plants/hooks/usePlants", () => ({
  useAllActivePlants: () => ({
    data: [],
    isLoading: false,
  }),
}));

jest.mock("@/features/plants/hooks/useGraveyard", () => ({
  useGraveyard: () => ({ data: [], isLoading: false }),
}));

jest.mock("@/features/settings/hooks/useSettings", () => ({
  useSettings: () => ({
    data: { timezone: "UTC", remindersEnabled: true, preferredTheme: "linen-light" },
    isLoading: false,
  }),
}));

jest.mock("@/features/settings/hooks/useUpdateSettings", () => ({
  useUpdateSettings: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/features/plants/hooks/useCollectionStreak", () => ({
  useCollectionStreak: () => ({
    currentStreak: 0,
    longestStreak: 0,
    isLoading: false,
    refreshIfStale: jest.fn(),
  }),
}));

jest.mock("@/features/product-feedback/hooks/useProductFeedbackNotifications", () => ({
  useProductFeedbackNotifications: () => undefined,
}));

jest.mock("@/features/theme/hooks/usePreferredThemeDisplay", () => ({
  usePreferredThemeDisplayName: () => ({ displayName: "Linen Light" }),
}));

describe("profile with zero plants", () => {
  it("does not imply an existing care rhythm on the streak badge", () => {
    renderWithProviders(<ProfileScreen />);

    expect(screen.getByLabelText("Care rhythm begins with your first log")).toBeTruthy();
    expect(screen.getByText("BEGIN CARE RHYTHM")).toBeTruthy();
    expect(screen.getByText("ACTIVE SPECIMENS")).toBeTruthy();
  });
});
