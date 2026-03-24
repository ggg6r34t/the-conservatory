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

  return (
    <ProfileScreenScaffold
      title="Privacy & Security"
      subtitle="Account safety"
      description="Manage your sign-in identity, password recovery, and how this device stores and syncs your conservatory data."
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
          This email is used for authentication and password recovery.
        </Text>
      </View>

      <View
        style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
      >
        <Text style={[styles.cardLabel, { color: colors.secondary }]}>
          AUTHENTICATION MODE
        </Text>
        <Text style={[styles.cardValue, { color: colors.primary }]}>
          {backend.title}
        </Text>
        <Text style={[styles.cardBody, { color: colors.onSurfaceVariant }]}>
          {backend.description}
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
