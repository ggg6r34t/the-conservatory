import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import { ContinueWithoutAccountSection } from "@/features/auth/components/ContinueWithoutAccountSection";
import { OAuthSignInSection } from "@/features/auth/components/OAuthSignInSection";
import { PasswordRequirementsFeedback } from "@/features/auth/components/PasswordRequirementsFeedback";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSignup } from "@/features/auth/hooks/useSignup";
import { signupSchema } from "@/features/auth/schemas/authValidation";
import { evaluateSignupPassword } from "@/features/auth/services/evaluateSignupPassword";
import { SignupLegalAcknowledgment } from "@/features/legal/components/SignupLegalAcknowledgment";
import { useAlert } from "@/hooks/useAlert";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";
import { trackEvent } from "@/services/analytics/analyticsService";

export function SignupForm() {
  const { colors } = useTheme();
  const alert = useAlert();
  const { isGuest } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const passwordStatus = useMemo(
    () =>
      evaluateSignupPassword({
        password,
        fullName: displayName,
        email,
      }),
    [password, displayName, email],
  );
  const showPasswordFeedback = password.length > 0;

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

    if (isGuest) {
      trackEvent("guest_signup_started");
    }

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

      if (isGuest) {
        trackEvent("guest_signup_completed");
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
        secureTextEntry={!showPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        placeholder="Choose a secure password"
        error={errors.password}
        trailingIcon={showPassword ? "eye-off-outline" : "eye-outline"}
        onTrailingPress={() => setShowPassword((current) => !current)}
        trailingAccessibilityLabel={
          showPassword ? "Hide password" : "Show password"
        }
      />
      {showPasswordFeedback ? (
        <PasswordRequirementsFeedback
          strength={passwordStatus.strength}
          requirements={passwordStatus.requirements}
        />
      ) : null}
      {submitError ? (
        <Text style={[styles.submitError, { color: colors.error }]}>
          {submitError}
        </Text>
      ) : null}
      <SignupLegalAcknowledgment />
      <PrimaryButton
        label="Create Account"
        onPress={handleSubmit}
        loading={signupMutation.isPending}
        disabled={signupMutation.isPending || !backend.authActionsEnabled}
        fullWidth
      />
      <OAuthSignInSection
        screen="signup"
        disabled={signupMutation.isPending || !backend.authActionsEnabled}
      />
      <ContinueWithoutAccountSection
        disabled={signupMutation.isPending}
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
