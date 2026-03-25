import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";

export default function PrivacySecurityScreen() {
  const { colors } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const { user, requestPasswordReset } = useAuth();
  const backend = getBackendConfigurationSummary();
  const signInSetup =
    backend.mode === "cloud"
      ? {
          title: "Account backup connected",
          description:
            "Sign-in and online backup are ready to use on this app.",
        }
      : backend.mode === "local-development"
        ? {
            title: "This device only",
            description:
              "This build is using device-only sign-in and storage for now.",
          }
        : {
            title: "Account setup needed",
            description:
              "This build is missing account setup values, so online sign-in and backup are unavailable.",
          };

  return (
    <ProfileScreenScaffold
      title="Privacy & Security"
      subtitle="Account safety"
      description="Manage your sign-in details, password recovery, and how your conservatory is saved on this device and in your account."
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surfaceContainerLowest },
        ]}
      >
        <Text style={[styles.cardLabel, { color: colors.secondary }]}>
          ACCOUNT EMAIL
        </Text>
        <Text style={[styles.cardValue, { color: colors.primary }]}>
          {user?.email ?? "botanist@conservatory.com"}
        </Text>
        <Text style={[styles.cardBody, { color: colors.onSurfaceVariant }]}>
          This email is used to sign in and recover your password.
        </Text>
      </View>

      <View
        style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
      >
        <Text style={[styles.cardLabel, { color: colors.secondary }]}>
          SIGN-IN SETUP
        </Text>
        <Text style={[styles.cardValue, { color: colors.primary }]}>
          {signInSetup.title}
        </Text>
        <Text style={[styles.cardBody, { color: colors.onSurfaceVariant }]}>
          {signInSetup.description}
        </Text>
      </View>

      <PrimaryButton
        label="Send Password Reset"
        disabled={!user?.email || !backend.authActionsEnabled}
        onPress={async () => {
          try {
            await requestPasswordReset(user?.email ?? "");
            snackbar.success(
              "If an account exists for this email, reset instructions will arrive shortly.",
            );
          } catch (error) {
            void alert.show({
              variant: "error",
              title: "Request failed",
              message:
                error instanceof Error
                  ? error.message
                  : "We couldn't start password recovery.",
              primaryAction: { label: "Close", tone: "danger" },
            });
          }
        }}
      />
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 20,
    gap: 8,
  },
  cardLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1.8,
  },
  cardValue: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 26,
    lineHeight: 32,
  },
  cardBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
});
