import { Alert, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { env } from "@/config/env";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";

export default function PrivacySecurityScreen() {
  const { colors } = useTheme();
  const { user, requestPasswordReset } = useAuth();

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
        style={[
          styles.card,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <Text style={[styles.cardLabel, { color: colors.secondary }]}>
          AUTHENTICATION MODE
        </Text>
        <Text style={[styles.cardValue, { color: colors.primary }]}>
          {env.isSupabaseConfigured ? "Supabase synced" : "Local development"}
        </Text>
        <Text style={[styles.cardBody, { color: colors.onSurfaceVariant }]}>
          {env.isSupabaseConfigured
            ? "Your account data is backed by Supabase and mirrored into local storage for fast offline access."
            : "This build is using local-only authentication, so password resets are simulated and account updates remain on-device."}
        </Text>
      </View>

      <PrimaryButton
        label="Send Password Reset"
        onPress={async () => {
          try {
            await requestPasswordReset(user?.email ?? "");
            Alert.alert(
              "Reset requested",
              "If your auth provider is configured, a reset email will be sent shortly.",
            );
          } catch (error) {
            Alert.alert(
              "Request failed",
              error instanceof Error
                ? error.message
                : "We couldn't start password recovery.",
            );
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
