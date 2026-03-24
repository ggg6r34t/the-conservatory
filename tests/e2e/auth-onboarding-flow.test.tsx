import React from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { LoginForm } from "@/features/auth/components/LoginForm";
import { SignupForm } from "@/features/auth/components/SignupForm";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { WelcomeGateway } from "@/features/onboarding/components/WelcomeGateway";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockOnboardingComplete = jest.fn().mockResolvedValue(undefined);
const mockMarkOnboardingAction = jest.fn().mockResolvedValue(undefined);
const mockMarkWelcomeViewed = jest.fn().mockResolvedValue(undefined);
const mockTrackEvent = jest.fn();
const mockLogin = jest.fn();
const mockSignup = jest.fn();
const mockUseOnboarding = jest.fn(() => ({
  isReady: true,
  status: "pending" as const,
  isCompleted: false,
  complete: mockOnboardingComplete,
}));

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, null, children);
  },
}));

jest.mock("expo-image", () => ({
  Image: () => {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View);
  },
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: ({
    label,
    onPress,
    disabled,
  }: {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
  }) => {
    const React = require("react");
    const { Pressable, Text } = require("react-native");
    return React.createElement(
      Pressable,
      { accessibilityRole: "button", onPress, disabled },
      React.createElement(Text, null, label),
    );
  },
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    SafeAreaView: ({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    ),
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    ),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => {
    const { tokens } = require("@/styles/tokens");
    return tokens;
  },
}));

jest.mock("@/features/onboarding/hooks/useOnboarding", () => ({
  useOnboarding: () => mockUseOnboarding(),
}));

jest.mock("@/features/onboarding/services/onboardingDebugStorage", () => ({
  markOnboardingAction: (...args: unknown[]) =>
    mockMarkOnboardingAction(...args),
  markWelcomeViewed: (...args: unknown[]) => mockMarkWelcomeViewed(...args),
}));

jest.mock("@/services/analytics/analyticsService", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

jest.mock("@/features/auth/api/authClient", () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  signup: (...args: unknown[]) => mockSignup(...args),
}));

describe("auth and onboarding journey harness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      status: "anonymous",
      transitionId: 0,
    });
    mockLogin.mockResolvedValue({
      user: {
        id: "user-1",
        email: "curator@example.com",
        displayName: "Fern Curator",
        role: "user",
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:00:00.000Z",
      },
      requiresEmailVerification: false,
    });
    mockSignup.mockResolvedValue({
      user: {
        id: "user-2",
        email: "new@example.com",
        displayName: "New Curator",
        role: "user",
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:00:00.000Z",
      },
      requiresEmailVerification: false,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("supports first-launch existing-account onboarding entry into login", async () => {
    renderWithProviders(<WelcomeGateway />);

    fireEvent.press(screen.getByText("I already have an account"));

    await waitFor(() => {
      expect(mockOnboardingComplete).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/(auth)/login");
    });
  });

  it("supports signup completion into the authenticated plant-add flow", async () => {
    renderWithProviders(<SignupForm />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Elowen Thorne"),
      "  New Curator  ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("elowen@garden.io"),
      "NEW@example.com",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Choose a secure password"),
      "garden123",
    );
    fireEvent.press(screen.getByText("Create Account"));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith(
        "new@example.com",
        "garden123",
        "New Curator",
      );
    });

    expect(useAuthStore.getState().user?.email).toBe("new@example.com");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("supports login completion into the authenticated app and rejects unsafe redirects", async () => {
    renderWithProviders(<LoginForm />);

    fireEvent.changeText(
      screen.getByPlaceholderText("botanist@conservatory.com"),
      "Curator@example.com",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Enter your password"),
      "garden123",
    );
    fireEvent.press(screen.getByText("Sign In"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        "curator@example.com",
        "garden123",
      );
    });

    expect(useAuthStore.getState().user?.id).toBe("user-1");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("keeps users on the form with safe validation errors for bad credentials", async () => {
    mockLogin.mockRejectedValue(new Error("Incorrect email or password."));

    renderWithProviders(<LoginForm />);

    fireEvent.changeText(
      screen.getByPlaceholderText("botanist@conservatory.com"),
      "curator@example.com",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Enter your password"),
      "garden123",
    );
    fireEvent.press(screen.getByText("Sign In"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        "curator@example.com",
        "garden123",
      );
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
