import React from "react";

import { render, screen } from "@testing-library/react-native";

const mockPermissions = {
  permissions: {
    notifications: "unknown",
    media: "unknown",
  },
  activeKey: null,
  continueLoading: false,
  requestPermission: jest.fn(),
  requestAllPendingPermissions: jest.fn(),
};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: ({ label }: { label: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, label);
  },
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("@/components/common/TopBar/AppHeader", () => ({
  AppHeader: ({ title }: { title: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, title);
  },
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      surface: "#fff",
      onSurface: "#222",
      onSurfaceVariant: "#666",
      surfaceContainerLow: "#f2f2f2",
      surfaceContainerLowest: "#fafafa",
      primary: "#111",
      secondary: "#444",
    },
    spacing: {
      lg: 16,
    },
  }),
}));

jest.mock("@/features/onboarding/hooks/useOnboardingPermissions", () => ({
  useOnboardingPermissions: () => mockPermissions,
}));

jest.mock("@/features/onboarding/services/onboardingDebugStorage", () => ({
  markOnboardingAction: jest.fn().mockResolvedValue(undefined),
  markPermissionsViewed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/analytics/analyticsService", () => ({
  trackEvent: jest.fn(),
}));

describe("PermissionsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows notifications and media permissions without rendering a location permission card", () => {
    const {
      PermissionsScreen,
    } = require("@/features/onboarding/components/PermissionsScreen");

    render(<PermissionsScreen />);

    expect(screen.getByText("Notifications")).toBeTruthy();
    expect(screen.getByText("Photos & Media")).toBeTruthy();
    expect(screen.queryByText(/location/i)).toBeNull();
  });
});
