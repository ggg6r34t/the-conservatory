import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import { useSignup } from "@/features/auth/hooks/useSignup";
import { signupSchema } from "@/features/auth/schemas/authValidation";
import { useAlert } from "@/hooks/useAlert";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";

export function SignupForm() {
  const { colors } = useTheme();
  const alert = useAlert();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const signupMutation = useSignup();
  const backend = getBackendConfigurationSummary();
  const authUnavailableMessage =
    backend.mode === "local-development"
      ? "Account creation is limited in this build right now."
      : backend.mode === "release-misconfigured"
        ? "Account creation isn't available until account setup is completed for this build."
        : "Account creation is unavailable right now.";

  const clearFieldError = (field: "displayName" | "email" | "password") => {
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError("");
  };

  const handleSubmit = async () => {
    if (signupMutation.isPending) {
      return;
    }

    if (!backend.authActionsEnabled) {
      setSubmitError(authUnavailableMessage);
      return;
    }

    const parsed = signupSchema.safeParse({
      displayName,
      email,
      password,
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        displayName: fieldErrors.displayName?.[0] ?? "",
        email: fieldErrors.email?.[0] ?? "",
        password: fieldErrors.password?.[0] ?? "",
      });
      return;
    }

    setErrors({});
    setSubmitError("");

    try {
      const result = await signupMutation.mutateAsync(parsed.data);

      if (result.requiresEmailVerification) {
        void alert.show({
          variant: "info",
          title: "Verify your email",
          message:
            "Check your inbox to activate your account before signing in.",
          primaryAction: { label: "Close" },
        });
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Try again.";
      setSubmitError(message);
      void alert.show({
        variant: "error",
        title: "Unable to create account",
        message,
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  return (
    <View style={styles.container}>
      <TextInputField
        label="Full name"
        value={displayName}
        onChangeText={(value) => {
          setDisplayName(value);
          clearFieldError("displayName");
        }}
        textContentType="name"
        autoComplete="name"
        returnKeyType="next"
        placeholder="Elowen Thorne"
        error={errors.displayName}
      />
      <TextInputField
        label="Email address"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          clearFieldError("email");
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        placeholder="elowen@garden.io"
        error={errors.email}
      />
      <TextInputField
        label="Password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearFieldError("password");
        }}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        placeholder="Choose a secure password"
        error={errors.password}
      />
      {submitError ? (
        <Text style={[styles.submitError, { color: colors.error }]}>
          {submitError}
        </Text>
      ) : null}
      <PrimaryButton
        label="Create Account"
        onPress={handleSubmit}
        loading={signupMutation.isPending}
        disabled={signupMutation.isPending || !backend.authActionsEnabled}
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
