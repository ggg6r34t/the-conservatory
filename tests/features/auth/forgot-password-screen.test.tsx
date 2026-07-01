import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ForgotPasswordScreen from "@/app/(auth)/forgot-password";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";

const mockRequestPasswordReset = jest.fn().mockResolvedValue(undefined);
const mockAlertShow = jest.fn().mockResolvedValue({ action: "primary" });
const mockSnackbarInfo = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useLocalSearchParams: () => ({}),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    requestPasswordReset: mockRequestPasswordReset,
  }),
}));

jest.mock("@/services/supabase/backendReadiness", () => ({
  getBackendConfigurationSummary: jest.fn(() => ({
    mode: "cloud",
    isSupabaseConfigured: true,
    authActionsEnabled: true,
    requiresReleaseConfig: false,
    title: "Cloud",
    description: "Cloud mode",
    missingConfig: [],
  })),
}));

jest.mock("@/features/auth/components/AuthScreenScaffold", () => ({
  AuthScreenScaffold: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      primary: "#123",
      secondary: "#456",
    },
  }),
}));

jest.mock("@/hooks/useAlert", () => ({
  useAlert: () => ({ show: mockAlertShow }),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ info: mockSnackbarInfo }),
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => {
  const { Pressable, Text } = require("react-native");
  return {
    PrimaryButton: ({
      label,
      onPress,
      disabled,
    }: {
      label: string;
      onPress?: () => void;
      disabled?: boolean;
    }) => (
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});

jest.mock("@/components/common/Forms/TextInput", () => {
  const { TextInput } = require("react-native");
  return {
    TextInputField: ({
      value,
      onChangeText,
      label,
    }: {
      value: string;
      onChangeText: (value: string) => void;
      label: string;
    }) => (
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
      />
    ),
  };
});

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("disables password reset action in local-only mode", () => {
    jest.mocked(getBackendConfigurationSummary).mockReturnValueOnce({
      mode: "local-development",
      isSupabaseConfigured: false,
      authActionsEnabled: true,
      requiresReleaseConfig: false,
      title: "Local development",
      description: "Local-only mode",
      missingConfig: [],
    });

    const { getByText } = render(<ForgotPasswordScreen />);

    expect(getByText("Send Reset Link")).toBeDisabled();
  });

  it("blocks invalid email submissions", async () => {
    const { getByLabelText, getByText, queryByText } = render(
      <ForgotPasswordScreen />,
    );

    fireEvent.changeText(getByLabelText("Email address"), "not-an-email");
    fireEvent.press(getByText("Send Reset Link"));

    await waitFor(() => {
      expect(mockRequestPasswordReset).not.toHaveBeenCalled();
      expect(queryByText(/Check your email/i)).toBeNull();
    });
  });

  it("shows neutral success copy after valid email submission", async () => {
    const { getByLabelText, getByText, findByText } = render(
      <ForgotPasswordScreen />,
    );

    fireEvent.changeText(getByLabelText("Email address"), "curator@example.com");
    fireEvent.press(getByText("Send Reset Link"));

    expect(await findByText(/If an account exists for this address/i)).toBeTruthy();
    expect(mockRequestPasswordReset).toHaveBeenCalledWith("curator@example.com");
    expect(mockSnackbarInfo).toHaveBeenCalledWith(
      expect.stringContaining("If an account exists for this address"),
    );
  });
});
