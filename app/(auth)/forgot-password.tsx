import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import { AuthScreenScaffold } from "@/features/auth/components/AuthScreenScaffold";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { forgotPasswordSchema } from "@/features/auth/schemas/authValidation";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const { requestPasswordReset } = useAuth();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loginHref = redirectTo
    ? { pathname: "/(auth)/login" as const, params: { redirectTo } }
    : "/(auth)/login";

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const parsed = forgotPasswordSchema.safeParse({
      email,
    });

    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.email?.[0] ?? "");
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      setIsSubmitting(true);
      await requestPasswordReset(parsed.data.email);
      setSuccessMessage(
        "If an account exists for this email, reset instructions will arrive shortly.",
      );
      snackbar.info(
        "If an account exists for this email, reset instructions will arrive shortly.",
      );
    } catch (submissionError) {
      void alert.show({
        variant: "error",
        title: "Unable to send reset link",
        message:
          submissionError instanceof Error
            ? submissionError.message
            : "Try again.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenScaffold
      eyebrow="ACCOUNT RECOVERY"
      title="Reset Your Password"
      body="Enter the email tied to your account and we'll send a secure reset link."
      footer={
        <Link
          href={loginHref}
          style={[styles.footerLink, { color: colors.primary }]}
        >
          Back to sign in
        </Link>
      }
    >
      <View style={styles.form}>
        <TextInputField
          label="Email address"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError("");
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="botanist@conservatory.com"
          error={error}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="go"
        />
        {successMessage ? (
          <Text style={[styles.successMessage, { color: colors.primary }]}>
            {successMessage}
          </Text>
        ) : null}
        <PrimaryButton
          label="Send Reset Link"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        />
      </View>
    </AuthScreenScaffold>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 24,
  },
  footerLink: {
    alignSelf: "flex-start",
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  successMessage: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
});
