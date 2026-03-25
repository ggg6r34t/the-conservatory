import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { loginSchema } from "@/features/auth/schemas/authValidation";
import { useAlert } from "@/hooks/useAlert";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";

export function LoginForm() {
  const { colors } = useTheme();
  const alert = useAlert();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const loginMutation = useLogin();
  const backend = getBackendConfigurationSummary();
  const authUnavailableMessage =
    backend.mode === "local-development"
      ? "Sign-in is limited in this build right now."
      : backend.mode === "release-misconfigured"
        ? "Sign-in isn't available until account setup is completed for this build."
        : "Sign-in is unavailable right now.";

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((current) => ({ ...current, email: "" }));
    setSubmitError("");
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((current) => ({ ...current, password: "" }));
    setSubmitError("");
  };

  const handleSubmit = async () => {
    if (loginMutation.isPending) {
      return;
    }

    if (!backend.authActionsEnabled) {
      setSubmitError(authUnavailableMessage);
      return;
    }

    const parsed = loginSchema.safeParse({
      email,
      password,
    });

    if (!parsed.success) {
      const nextErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        email: nextErrors.email?.[0] ?? "",
        password: nextErrors.password?.[0] ?? "",
      });
      return;
    }

    setErrors({});
    setSubmitError("");

    try {
      await loginMutation.mutateAsync(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Try again.";
      setSubmitError(message);
      void alert.show({
        variant: "error",
        title: "Unable to sign in",
        message,
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  return (
    <View style={styles.container}>
      <TextInputField
        label="Email address"
        value={email}
        onChangeText={handleEmailChange}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        placeholder="botanist@conservatory.com"
        error={errors.email}
      />
      <TextInputField
        label="Password"
        value={password}
        onChangeText={handlePasswordChange}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        placeholder="Enter your password"
        error={errors.password}
      />
      {submitError ? (
        <Text style={[styles.submitError, { color: colors.error }]}>
          {submitError}
        </Text>
      ) : null}
      <PrimaryButton
        label="Sign In"
        onPress={handleSubmit}
        loading={loginMutation.isPending}
        disabled={loginMutation.isPending || !backend.authActionsEnabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  submitError: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
  },
});
