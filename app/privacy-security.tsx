import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { deleteAccount } from "@/features/auth/api/authClient";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import { tokens } from "@/styles/tokens";

export default function PrivacySecurityScreen() {
  const { colors } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const router = useRouter();
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    const confirmed = await alert.confirm({
      variant: "destructive",
      title: "Delete Account",
      message:
        "Are you sure you want to delete your account? This action cannot be undone.",
      primaryAction: { label: "Delete Account", tone: "danger" },
      secondaryAction: { label: "Cancel" },
    });

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      await deleteAccount(user?.id ?? "");
      router.replace("/(auth)/login");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't delete your account right now.";
      snackbar.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ProfileScreenScaffold
      title="Privacy & Security"
      subtitle="Account safety"
      description="Your botanical journey is a private one. We ensure your data is as protected as a rare orchid in a climate-controlled conservatory."
    >
      <View
        style={[
          styles.card,
          styles.archiveCard,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <View style={styles.archiveCopy}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            Your Botanical Archive
          </Text>
          <Text
            style={[styles.archiveBody, { color: colors.onSurfaceVariant }]}
          >
            Download a comprehensive record of your plant care history, photos,
            and personal journals in a portable format.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            snackbar.success("Personal data requests will be available soon.");
          }}
          style={styles.archiveLinkWrap}
        >
          <View
            style={[
              styles.archiveUnderline,
              { backgroundColor: colors.primaryFixed },
            ]}
          />
          <View style={styles.archiveLinkRow}>
            <Text style={[styles.archiveLink, { color: colors.primary }]}>
              Request Personal Data
            </Text>
            <Icon
              name="download"
              family="MaterialIcons"
              size={18}
              color={colors.primary}
            />
          </View>
        </Pressable>
      </View>

      <View
        style={[
          styles.card,
          styles.policyCard,
          { backgroundColor: colors.surfaceContainerLowest },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openURL("https://conservatory.app/privacy")}
          style={styles.policyRow}
        >
          <Text style={[styles.policyLabel, { color: colors.primary }]}>
            Privacy Policy
          </Text>
          <Icon
            name="open-in-new"
            family="MaterialIcons"
            size={18}
            color={colors.onSurfaceVariant}
          />
        </Pressable>
      </View>

      <View style={styles.dangerSection}>
        <View
          style={[
            styles.dangerDivider,
            { backgroundColor: colors.outlineVariant },
          ]}
        />
        <View style={styles.dangerContent}>
          <Text style={[styles.dangerEyebrow, { color: colors.error }]}>
            CAUTIONARY STEPS
          </Text>
          <Text style={[styles.dangerTitle, { color: colors.onSurface }]}>
            End of the Season
          </Text>
          <Text style={[styles.dangerBody, { color: colors.onSurfaceVariant }]}>
            Deleting your account will permanently remove all your plant
            collections, growth journals, and care history. This action cannot
            be undone.
          </Text>

          <PrimaryButton
            label="Delete Account"
            icon="delete-forever"
            iconFamily="MaterialIcons"
            tone="danger"
            loading={deleting}
            disabled={deleting}
            onPress={() => void handleDeleteAccount()}
          />

          <Text style={[styles.dangerNote, { color: colors.outline }]}>
            Once deleted, your data will be purged from our soil within 30 days.
          </Text>
        </View>
      </View>
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 20,
  },
  cardTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 6,
  },
  archiveCard: {
    alignItems: "center",
    gap: 20,
    paddingVertical: 24,
  },
  archiveCopy: {
    alignItems: "center",
    gap: 4,
  },
  archiveBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 278,
  },
  archiveLinkWrap: {
    alignItems: "center",
    gap: 6,
  },
  archiveUnderline: {
    width: 176,
    height: 3,
    borderRadius: 999,
    opacity: 0.85,
  },
  archiveLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  archiveLink: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  policyCard: {
    borderRadius: 26,
    paddingVertical: 4,
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  policyLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  dangerSection: {
    gap: 28,
    paddingTop: 14,
  },
  dangerDivider: {
    height: 1,
    opacity: 0.2,
  },
  dangerContent: {
    alignItems: "center",
    gap: 10,
  },
  dangerEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 3.4,
  },
  dangerTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
    lineHeight: 38,
    textAlign: "center",
  },
  dangerBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 18,
  },
  dangerNote: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
    textAlign: "center",
    maxWidth: 280,
    marginTop: 8,
  },
});
