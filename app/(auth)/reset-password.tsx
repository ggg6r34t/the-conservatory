import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { AuthScreenScaffold } from "@/features/auth/components/AuthScreenScaffold";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { usePasswordRecoveryStore } from "@/features/auth/stores/usePasswordRecoveryStore";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const backend = getBackendConfigurationSummary();
  const canResetPassword =
    backend.mode === "cloud" && backend.authActionsEnabled;
  const isRecoveryActive = usePasswordRecoveryStore((state) => state.isActive);
  const linkErrorCode = usePasswordRecoveryStore((state) => state.linkErrorCode);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!linkErrorCode) {
      return;
    }

    const message =
      linkErrorCode === "expired_link"
        ? "This reset link has expired. Request a new one and we'll send fresh instructions."
        : "This reset link is no longer valid. Request a new one from the sign-in screen.";

    void alert.show({
      variant: "error",
      title: "Reset link unavailable",
      message,
      primaryAction: { label: "Request new link", tone: "primary" },
      secondaryAction: { label: "Back to sign in", tone: "primary" },
    }).then((result) => {
      if (result.action === "primary") {
        router.replace("/(auth)/forgot-password");
        return;
      }

      router.replace("/(auth)/login");
    });
  }, [alert, linkErrorCode, router]);

  const handleSuccess = async () => {
    setCompleted(true);
    usePasswordRecoveryStore.getState().clear();
    snackbar.success("Your password has been updated.");

    await alert.show({
      variant: "success",
      title: "Password updated",
      message: "You can now sign in with your new password.",
      primaryAction: { label: "Sign in", tone: "primary" },
    });

    router.replace("/(auth)/login");
  };

  if (completed) {
    return (
      <AuthScreenScaffold
        eyebrow="ACCOUNT RECOVERY"
        title="Password updated"
        body="You can now sign in with your new password."
        footer={
          <Link
            href="/(auth)/login"
            style={[styles.footerLink, { color: colors.primary }]}
          >
            Back to sign in
          </Link>
        }
      >
        <View />
      </AuthScreenScaffold>
    );
  }

  if (!canResetPassword) {
    return (
      <AuthScreenScaffold
        eyebrow="ACCOUNT RECOVERY"
        title="Create a new password"
        body="Password recovery isn't available in this build right now."
        footer={
          <Link
            href="/(auth)/login"
            style={[styles.footerLink, { color: colors.primary }]}
          >
            Back to sign in
          </Link>
        }
      >
        <View />
      </AuthScreenScaffold>
    );
  }

  if (!isRecoveryActive && !linkErrorCode) {
    return (
      <AuthScreenScaffold
        eyebrow="ACCOUNT RECOVERY"
        title="Create a new password"
        body="Open the reset link from your email on this device to choose a new password."
        footer={
          <View style={styles.footerActions}>
            <PrimaryButton
              label="Request reset link"
              onPress={() => router.replace("/(auth)/forgot-password")}
            />
            <Link
              href="/(auth)/login"
              style={[styles.footerLink, { color: colors.primary }]}
            >
              Back to sign in
            </Link>
          </View>
        }
      >
        <Text style={[styles.helper, { color: colors.onSurfaceVariant }]}>
          If you already requested a reset, check your inbox and tap the link
          again on the device where The Conservatory is installed.
        </Text>
      </AuthScreenScaffold>
    );
  }

  if (linkErrorCode) {
    return (
      <AuthScreenScaffold
        eyebrow="ACCOUNT RECOVERY"
        title="Create a new password"
        body="We're checking your reset link."
      >
        <View />
      </AuthScreenScaffold>
    );
  }

  return (
    <AuthScreenScaffold
      eyebrow="ACCOUNT RECOVERY"
      title="Create a new password"
      body="Choose a new password for your account. You'll sign in again once it's saved."
      footer={
        <Link
          href="/(auth)/login"
          style={[styles.footerLink, { color: colors.primary }]}
        >
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm onSuccess={handleSuccess} />
    </AuthScreenScaffold>
  );
}

const styles = StyleSheet.create({
  footerLink: {
    alignSelf: "flex-start",
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  footerActions: {
    gap: 18,
  },
  helper: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
});
