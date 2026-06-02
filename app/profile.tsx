import { useCallback, useEffect, useMemo, useState } from "react";

import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { IconFamily } from "@/components/common/Icon/Icon";
import { Icon } from "@/components/common/Icon/Icon";
import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { useGraveyard } from "@/features/plants/hooks/useGraveyard";
import { useCollectionStreak } from "@/features/plants/hooks/useCollectionStreak";
import { StreakBadge } from "@/features/plants/components/StreakBadge";
import { useProductFeedbackNotifications } from "@/features/product-feedback/hooks/useProductFeedbackNotifications";
import { useAllActivePlants } from "@/features/plants/hooks/usePlants";
import {
  getProfileDisplayEmail,
  getProfileDisplayName,
  getProfileInitials,
  getProfileVersionLabel,
} from "@/features/profile/services/profilePresentationService";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings";

type ProfileRowProps = {
  icon: string;
  iconFamily?: IconFamily;
  label: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
};

type StatItemProps = {
  value: string;
  label: string;
};

function formatThemeLabel(theme: string | undefined) {
  if (!theme) {
    return "Linen Light";
  }

  return theme
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function StatItem({ value, label }: StatItemProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.onSurface }]}>
        {label}
      </Text>
    </View>
  );
}

function ProfileRow({
  icon,
  iconFamily,
  label,
  value,
  onPress,
  trailing,
}: ProfileRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
      disabled={!onPress}
    >
      <View style={styles.rowLead}>
        <Icon
          family={iconFamily}
          name={icon}
          size={24}
          color={colors.primary}
          style={styles.rowIcon}
        />
        <Text style={[styles.rowLabel, { color: colors.onSurface }]}>
          {label}
        </Text>
      </View>

      <View style={styles.rowTrail}>
        {value ? (
          <Text style={[styles.rowValue, { color: colors.onSurfaceVariant }]}>
            {value}
          </Text>
        ) : null}
        {trailing ?? (
          <Icon
            name="chevron-right"
            size={24}
            color={colors.surfaceContainerHigh}
          />
        )}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { colors, spacing } = useTheme();
  const { user, signOut, isSigningOut } = useAuth();
  const router = useRouter();
  const [showDeveloperMenu, setShowDeveloperMenu] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const plantsQuery = useAllActivePlants();
  const graveyardQuery = useGraveyard();
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();
  const { isPremium } = useSubscription();

  const plants = plantsQuery.data ?? [];
  const graveyard = graveyardQuery.data ?? [];
  const remindersEnabled = settingsQuery.data?.remindersEnabled ?? true;
  const themeLabel = formatThemeLabel(settingsQuery.data?.preferredTheme);
  const { currentStreak: streakDays, refetch: refetchStreak } =
    useCollectionStreak();
  useProductFeedbackNotifications();

  useFocusEffect(
    useCallback(() => {
      void refetchStreak();
    }, [refetchStreak]),
  );

  const displayName = getProfileDisplayName(user?.displayName);
  const email = getProfileDisplayEmail(user?.email);
  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version;
  const initials = getProfileInitials(displayName);
  const avatarSource = useMemo(
    () =>
      user?.avatarUrl
        ? { uri: user.avatarUrl }
        : require("@/assets/images/placeholder-avatar.png"),
    [user?.avatarUrl],
  );
  const plantsRemembered = graveyard.length;
  const activeSpecimens = plants.length;

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarSource]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: 96,
          },
        ]}
      >
        <AppHeader title="Profile" subtitle="Curator's Corner" showBackButton />

        <View style={styles.hero}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile photo"
            onPress={() => router.push("/profile-edit")}
            style={[styles.avatarOuter, { borderColor: colors.primaryFixed }]}
          >
            <View
              style={[
                styles.avatarInner,
                { backgroundColor: colors.secondaryContainer },
              ]}
            >
              {!avatarFailed ? (
                <Image
                  source={avatarSource}
                  style={styles.avatarImage}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Text
                  style={[styles.avatarInitials, { color: colors.primary }]}
                >
                  {initials}
                </Text>
              )}
            </View>

            <View
              style={[
                styles.editBadge,
                {
                  backgroundColor: colors.primary,
                  shadowColor: "rgba(27, 28, 25, 0.1)",
                },
              ]}
            >
              <Icon name="pencil" size={16} color={colors.surfaceBright} />
            </View>
          </Pressable>

          <Text style={[styles.profileName, { color: colors.primary }]}>
            {displayName}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.onSurface }]}>
            {email}
          </Text>

          <Pressable
            accessibilityRole="button"
            style={styles.editProfilePressable}
            onPress={() => router.push("/profile-edit")}
          >
            <Text
              style={[styles.editProfileLabel, { color: colors.secondary }]}
            >
              EDIT PROFILE
            </Text>
            <View
              style={[
                styles.editProfileUnderline,
                { backgroundColor: colors.secondaryContainer },
              ]}
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.statsCard,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <StatItem value={`${activeSpecimens}`} label="ACTIVE SPECIMENS" />
          <View
            style={[
              styles.statDivider,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          />
          <StreakBadge streak={streakDays} variant="compact" />
          <View
            style={[
              styles.statDivider,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          />
          <StatItem value={`${plantsRemembered}`} label="PLANTS REMEMBERED" />
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
          >
            MY COLLECTION
          </Text>
          <View
            style={[
              styles.groupCard,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <ProfileRow
              icon="archive-arrow-down-outline"
              label="Archive Gallery"
              onPress={() => router.push("/archive-gallery")}
            />
            <ProfileRow
              icon="qrcode-scan"
              label="Specimen Tags"
              onPress={() => router.push("/specimen-tags")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
          >
            SUBSCRIPTION
          </Text>
          <LinearGradient
            colors={[colors.primary, colors.primaryContainer]}
            start={{ x: 0.08, y: 0.08 }}
            end={{ x: 0.92, y: 0.92 }}
            style={styles.subscriptionCard}
          >
            <View style={styles.subscriptionCardContent}>
              <View style={styles.statBlock}>
                <Text
                  style={[
                    styles.subscriptionCardTitle,
                    { color: colors.onPrimary },
                  ]}
                >
                  {isPremium ? "Premium Plan" : "Free Plan"}
                </Text>
                {isPremium ? (
                  <View
                    style={[
                      styles.causeChip,
                      { backgroundColor: colors.primaryFixed },
                    ]}
                  >
                    <Text
                      style={[styles.causeChipLabel, { color: colors.primary }]}
                    >
                      Active
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.subscriptionCardBody}>
                <Text
                  style={[
                    styles.subscriptionCardBodyText,
                    { color: colors.primaryFixed },
                  ]}
                >
                  {isPremium
                    ? "Your subscription is active. Enjoy unlimited AI insights, full cloud backup, and all premium features."
                    : "Upgrade for unlimited AI insights, full cloud backup, and tools built for serious plant collectors."}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/premium")}
                  style={[
                    styles.subscriptionButton,
                    { backgroundColor: colors.secondaryContainer },
                  ]}
                >
                  <Text
                    style={[
                      styles.subscriptionButtonLabel,
                      { color: colors.onSecondaryContainer },
                    ]}
                  >
                    Manage Plan
                  </Text>
                </Pressable>
              </View>
            </View>

            <Image
              source={require("@/assets/images/potted-plant.png")}
              resizeMode="contain"
              style={[
                styles.subscriptionCardGlyph,
                { tintColor: colors.primaryFixed },
              ]}
            />
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
          >
            PREFERENCES
          </Text>
          <View
            style={[
              styles.groupCard,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <ProfileRow
              icon="bell-cog-outline"
              label="Care Reminders"
              onPress={() => router.push("/care-reminders")}
            />
            <ProfileRow
              icon="bell-ring-outline"
              label="Reminders Enabled"
              onPress={() => {
                updateSettings.mutate({ remindersEnabled: !remindersEnabled });
              }}
              trailing={
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: remindersEnabled }}
                  onPress={() => {
                    updateSettings.mutate({
                      remindersEnabled: !remindersEnabled,
                    });
                  }}
                  style={[
                    styles.toggleTrack,
                    {
                      backgroundColor: remindersEnabled
                        ? colors.primary
                        : colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      remindersEnabled && styles.toggleThumbEnabled,
                      { backgroundColor: colors.surfaceBright },
                    ]}
                  />
                </Pressable>
              }
            />
            <ProfileRow
              icon="weather-night"
              label="Interface Theme"
              value={themeLabel}
              onPress={() => router.push("/interface-theme")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
          >
            ACCOUNT
          </Text>
          <View
            style={[
              styles.groupCard,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <ProfileRow
              icon="lightbulb-on-outline"
              label="Request a Feature"
              onPress={() => router.push("/feature-requests" as Href)}
            />
            <ProfileRow
              icon="star-circle-outline"
              label="Manage Subscription"
              onPress={() => router.push("/subscription-plans")}
            />
            <ProfileRow
              icon="shield-account-outline"
              label="Privacy & Security"
              onPress={() => router.push("/privacy-security")}
            />
            <ProfileRow
              icon="cloud-check-outline"
              label="Data & Backup"
              onPress={() => router.push("/data-backup")}
            />
            <ProfileRow
              icon="lock-reset"
              label="Change Password"
              onPress={() => router.push("/change-password")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
          >
            LEGAL
          </Text>
          <View
            style={[
              styles.groupCard,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <ProfileRow
              icon="file-document-outline"
              label="Terms of Service"
              onPress={() => router.push("/terms")}
            />
            <ProfileRow
              icon="shield-check-outline"
              label="Privacy Policy"
              onPress={() => router.push("/privacy")}
            />
            <ProfileRow
              icon="robot-outline"
              label="AI Disclosure Policy"
              onPress={() => router.push("/ai-disclosure")}
            />
            <ProfileRow
              icon="puzzle-outline"
              label="Third-Party Licenses"
              onPress={() => router.push("/license")}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSigningOut }}
          disabled={isSigningOut}
          onPress={() => {
            void signOut();
          }}
          style={styles.signOutRow}
        >
          <Icon name="logout" size={22} color={colors.secondary} />
          <Text style={[styles.signOutLabel, { color: colors.secondary }]}>
            {isSigningOut ? "SIGNING OUT" : "SIGN OUT"}
          </Text>
        </Pressable>

        {__DEV__ && showDeveloperMenu ? (
          <View style={styles.section}>
            <Text
              style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
            >
              DEVELOPER
            </Text>
            <View
              style={[
                styles.groupCard,
                { backgroundColor: colors.surfaceContainerLowest },
              ]}
            >
              <ProfileRow
                icon="bug-outline"
                label="Onboarding Debug"
                onPress={() => router.push("/debug/onboarding")}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Developer menu"
            accessibilityHint="Long press to reveal developer tools"
            delayLongPress={450}
            onLongPress={() => {
              if (__DEV__) {
                setShowDeveloperMenu((current) => !current);
              }
            }}
            style={styles.footerBrandPressable}
          >
            <Text style={[styles.footerBrand, { color: colors.primaryFixed }]}>
              The Conservatory
            </Text>
          </Pressable>
          <View style={styles.footerMetaRow}>
            <Text
              style={[styles.footerMeta, { color: colors.onSurfaceVariant }]}
            >
              {getProfileVersionLabel(appVersion)}
            </Text>
            <Icon
              name="circle-small"
              size={18}
              color={colors.onSurfaceVariant}
            />
            <Text
              style={[styles.footerMeta, { color: colors.onSurfaceVariant }]}
            >
              BUILT FOR BOTANISTS
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 28,
  },
  hero: {
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },
  avatarOuter: {
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarInner: {
    width: 126,
    height: 126,
    borderRadius: 63,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 42,
    lineHeight: 50,
  },
  editBadge: {
    position: "absolute",
    right: -4,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  profileName: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 31,
    lineHeight: 39,
    textAlign: "center",
  },
  profileEmail: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  editProfilePressable: {
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  editProfileLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 2.1,
  },
  editProfileUnderline: {
    width: 114,
    height: 2,
    borderRadius: 999,
    opacity: 0.9,
  },
  statsCard: {
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 6,
  },
  statValue: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 23,
    lineHeight: 28,
    textAlign: "center",
  },
  statLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.45,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    opacity: 0.6,
    marginVertical: 8,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 2.1,
    paddingHorizontal: 8,
  },
  sectionDetail: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  groupCard: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 2,
  },
  subscriptionCard: {
    minHeight: 208,
    borderRadius: 30,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingVertical: 26,
    justifyContent: "space-between",
  },
  subscriptionCardContent: {
    gap: 10,
    zIndex: 1,
  },
  statBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  subscriptionCardTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 31,
    lineHeight: 37,
  },
  subscriptionCardBody: {
    maxWidth: 236,
    gap: 10,
  },
  subscriptionCardBodyText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 23,
    opacity: 0.84,
  },
  subscriptionButton: {
    alignSelf: "flex-start",
    minHeight: 56,
    borderRadius: 999,
    paddingHorizontal: 20,
    justifyContent: "center",
    marginTop: 4,
  },
  subscriptionButtonLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 20,
  },
  subscriptionCardGlyph: {
    position: "absolute",
    right: -10,
    bottom: -18,
    width: 156,
    height: 156,
    opacity: 0.14,
    transform: [{ rotate: "12deg" }],
  },
  causeChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  causeChipLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
  },
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  rowLead: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  rowIcon: {
    width: 28,
    textAlign: "center",
  },
  rowLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 17,
    lineHeight: 24,
  },
  rowTrail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowValue: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 20,
  },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  toggleThumbEnabled: {
    alignSelf: "flex-end",
  },
  signOutRow: {
    marginTop: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  signOutLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    letterSpacing: 2.1,
  },
  footer: {
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
  },
  footerBrandPressable: {
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  footerBrand: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 17,
    lineHeight: 24,
    fontStyle: "italic",
    opacity: 0.8,
  },
  footerMeta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 1.6,
    textAlign: "center",
  },
  footerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
