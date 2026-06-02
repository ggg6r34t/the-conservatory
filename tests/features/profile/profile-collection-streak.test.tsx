import fs from "fs";
import path from "path";

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
    },
    spacing: {
      lg: 16,
      md: 12,
      sm: 8,
    },
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "grower@example.com",
      displayName: "Aster Keeper",
    },
  }),
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: false,
    tier: "free",
    isLoading: false,
  }),
}));

jest.mock("@/features/plants/hooks/usePlants", () => ({
  useAllActivePlants: () => ({
    data: [{ id: "plant-1" }],
    isLoading: false,
  }),
}));

jest.mock("@/features/plants/hooks/useGraveyard", () => ({
  useGraveyard: () => ({
    data: [],
    isLoading: false,
  }),
}));

jest.mock("@/features/settings/hooks/useSettings", () => ({
  useSettings: () => ({
    data: { timezone: "UTC", remindersEnabled: true, preferredTheme: "linen-light" },
    isLoading: false,
  }),
}));

jest.mock("@/features/settings/hooks/useUpdateSettings", () => ({
  useUpdateSettings: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

const mockRefetchStreak = jest.fn();

jest.mock("@/features/plants/hooks/useCollectionStreak", () => ({
  useCollectionStreak: () => ({
    currentStreak: 5,
    longestStreak: 8,
    isLoading: false,
    refetch: mockRefetchStreak,
  }),
}));

describe("profile collection streak", () => {
  it("wires the shared streak hook and StreakBadge on the profile stats card", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app", "profile.tsx"),
      "utf8",
    );

    expect(source).toContain("useCollectionStreak");
    expect(source).toContain("<StreakBadge streak={streakDays}");
    expect(source).toContain("useFocusEffect");
    expect(source).not.toContain("computeCareStreak");
  });

  it("renders the streak count from useCollectionStreak", () => {
    renderWithProviders(<ProfileScreen />);

    expect(screen.getByLabelText("5 day streak")).toBeTruthy();
    expect(screen.getByText("DAYS STREAK")).toBeTruthy();
    expect(mockRefetchStreak).toHaveBeenCalled();
  });
});
