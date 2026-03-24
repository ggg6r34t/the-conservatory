import React from "react";

import { render } from "@testing-library/react-native";

import ForgotPasswordScreen from "@/app/(auth)/forgot-password";

const mockPrimaryButton = jest.fn(
  (_props: { label: string; disabled?: boolean }) => null,
);

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useLocalSearchParams: () => ({}),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    requestPasswordReset: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/services/supabase/backendReadiness", () => ({
  getBackendConfigurationSummary: () => ({
    mode: "local-development",
    authActionsEnabled: true,
    description: "Local-only mode",
  }),
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: (props: { label: string; disabled?: boolean }) =>
    mockPrimaryButton(props),
}));

jest.mock("@/features/auth/components/AuthScreenScaffold", () => ({
  AuthScreenScaffold: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/common/Forms/TextInput", () => ({
  TextInputField: () => null,
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      primary: "#123",
    },
  }),
}));

jest.mock("@/hooks/useAlert", () => ({
  useAlert: () => ({ show: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ info: jest.fn() }),
}));

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("disables password reset action in local-only mode", () => {
    render(<ForgotPasswordScreen />);

    expect(mockPrimaryButton).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Send Reset Link", disabled: true }),
    );
  });
});
