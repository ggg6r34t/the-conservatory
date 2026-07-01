import React from "react";
import { render } from "@testing-library/react-native";

import ResetPasswordScreen from "@/app/(auth)/reset-password";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

jest.mock("@/features/auth/stores/usePasswordRecoveryStore", () => ({
  usePasswordRecoveryStore: (selector: (state: unknown) => unknown) =>
    selector({
      isActive: true,
      linkErrorCode: null,
      clear: jest.fn(),
    }),
}));

jest.mock("@/services/supabase/backendReadiness", () => ({
  getBackendConfigurationSummary: () => ({
    mode: "cloud",
    authActionsEnabled: true,
    description: "Cloud mode",
  }),
}));

jest.mock("@/features/auth/components/AuthScreenScaffold", () => ({
  AuthScreenScaffold: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => {
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text>{title}</Text>
        {children}
      </View>
    );
  },
}));

jest.mock("@/features/auth/components/ResetPasswordForm", () => ({
  ResetPasswordForm: () => {
    const { Text } = require("react-native");
    return <Text>Reset form</Text>;
  },
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      primary: "#123",
      onSurfaceVariant: "#456",
    },
  }),
}));

jest.mock("@/hooks/useAlert", () => ({
  useAlert: () => ({ show: jest.fn().mockResolvedValue({ action: "primary" }) }),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ success: jest.fn() }),
}));

describe("ResetPasswordScreen", () => {
  it("renders the reset form when recovery is active", () => {
    const { getByText } = render(<ResetPasswordScreen />);

    expect(getByText("Create a new password")).toBeTruthy();
    expect(getByText("Reset form")).toBeTruthy();
  });
});
