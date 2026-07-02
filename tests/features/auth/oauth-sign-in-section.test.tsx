import React from "react";
import { Platform } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { OAuthSignInSection } from "@/features/auth/components/OAuthSignInSection";

jest.mock("@/hooks/useAlert", () => ({
  useAlert: () => ({
    show: jest.fn(),
    confirm: jest.fn(),
  }),
}));

jest.mock("@/services/supabase/backendReadiness", () => ({
  getBackendConfigurationSummary: () => ({
    isSupabaseConfigured: true,
    authActionsEnabled: true,
    mode: "cloud",
  }),
}));

jest.mock("@/config/env", () => ({
  env: {
    isSupabaseConfigured: true,
  },
}));

const mockSignInWithProvider = jest.fn();

jest.mock("@/features/auth/hooks/useOAuthSignIn", () => ({
  useOAuthSignIn: (screen: string) => ({
    signInWithProvider: mockSignInWithProvider,
    isPending: false,
    activeProvider: null,
    isOAuthCancellation: () => false,
    getErrorMessage: () => "error",
    screen,
  }),
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      borderSubtle: "#ddd",
      secondary: "#666",
      surfaceContainerLowest: "#fff",
      onSurface: "#111",
      shadow: "#000",
    },
    isDark: false,
  }),
}));

describe("OAuthSignInSection", () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "ios";
  });

  afterAll(() => {
    Platform.OS = originalPlatform;
  });

  it("renders provider buttons and starts google sign in on login", () => {
    render(<OAuthSignInSection screen="login" />);

    fireEvent.press(screen.getByLabelText("Continue with Google"));
    expect(mockSignInWithProvider).toHaveBeenCalledWith("google");
  });

  it("renders apple on ios and starts apple sign in on signup", () => {
    render(<OAuthSignInSection screen="signup" />);

    expect(screen.getByLabelText("Continue with Apple")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Continue with Apple"));
    expect(mockSignInWithProvider).toHaveBeenCalledWith("apple");
  });
});
