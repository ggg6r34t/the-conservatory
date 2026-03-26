import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";

export default function PrivacySecurityScreen() {
  const { colors } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const [dataSharingEnabled, setDataSharingEnabled] = useState(false);

  return (
    <ProfileScreenScaffold
      title="Privacy & Security"
      subtitle="Account safety"
      description="Your botanical journey is a private one. We ensure your data is as protected as a rare orchid in a climate-controlled conservatory."
    >
      <View
        style={[
          styles.card,
          styles.analyticsCard,
          { backgroundColor: colors.surfaceContainerLowest },
        ]}
      >
        <View>
          <View
            style={[
              styles.analyticsIconWrap,
              { backgroundColor: colors.tertiaryFixed },
            ]}
          >
            <Icon
              name="analytics"
              family="MaterialIcons"
              size={22}
              color={colors.tertiary}
            />
          </View>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            Usage Insights
          </Text>
          <Text style={[styles.cardBody, { color: colors.onSurfaceVariant }]}>
            Share anonymous growth data to help us improve the plant care
            algorithms for the entire community.
          </Text>
        </View>

        <View style={styles.analyticsFooter}>
          <Text style={[styles.analyticsLabel, { color: colors.primary }]}>
            DATA SHARING
          </Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: dataSharingEnabled }}
            onPress={() => setDataSharingEnabled((current) => !current)}
            style={[
              styles.toggleTrack,
              {
                backgroundColor: dataSharingEnabled
                  ? colors.primary
                  : colors.surfaceContainerHigh,
              },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                dataSharingEnabled && styles.toggleThumbEnabled,
                { backgroundColor: colors.surfaceBright },
              ]}
            />
          </Pressable>
        </View>
      </View>

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
            onPress={() => {
              void alert.show({
                variant: "destructive",
                title: "Delete account",
                message:
                  "Account deletion isn't available in this build yet. Your conservatory is still safe.",
                primaryAction: { label: "Close", tone: "danger" },
              });
            }}
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
  analyticsCard: {
    minHeight: 224,
    justifyContent: "space-between",
  },
  analyticsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 6,
  },
  cardBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 24,
    maxWidth: 258,
  },
  analyticsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    marginTop: 20,
  },
  analyticsLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.8,
  },
  toggleTrack: {
    width: 42,
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  toggleThumbEnabled: {
    alignSelf: "flex-end",
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
