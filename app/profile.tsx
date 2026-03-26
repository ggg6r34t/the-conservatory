import { useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import { listCareLogsForPlants } from "@/features/care-logs/api/careLogsClient";
import { useGraveyard } from "@/features/plants/hooks/useGraveyard";
import { usePlants } from "@/features/plants/hooks/usePlants";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings";
import { useAlert } from "@/hooks/useAlert";

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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "C";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function computeCareStreak(loggedAtValues: string[]) {
  if (!loggedAtValues.length) {
    return 0;
  }

  const dayKeys = Array.from(
    new Set(
      loggedAtValues.map((value) => {
        const date = new Date(value);
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        ).getTime();
      }),
    ),
  ).sort((left, right) => right - left);

  const today = new Date();
  let cursor = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  let streak = 0;

  for (const dayKey of dayKeys) {
    if (dayKey === cursor) {
      streak += 1;
      cursor -= 24 * 60 * 60 * 1000;
      continue;
    }

    if (streak === 0 && dayKey === cursor - 24 * 60 * 60 * 1000) {
      streak += 1;
      cursor = dayKey - 24 * 60 * 60 * 1000;
      continue;
    }

    if (dayKey < cursor) {
      break;
    }
  }

  return streak;
}

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
  const alert = useAlert();
  const { user, signOut, isSigningOut } = useAuth();
  const router = useRouter();
  const [showDeveloperMenu, setShowDeveloperMenu] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const plantsQuery = usePlants();
  const graveyardQuery = useGraveyard();
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();

  const plants = plantsQuery.data ?? [];
  const graveyard = graveyardQuery.data ?? [];
  const remindersEnabled = settingsQuery.data?.remindersEnabled ?? true;
  const themeLabel = formatThemeLabel(settingsQuery.data?.preferredTheme);

  const plantIds = plants.map((plant) => plant.id);
  const careLogsQuery = useQuery({
    queryKey: ["care-logs", "batch", plantIds.join("|")],
    queryFn: () => listCareLogsForPlants(plantIds),
    enabled: plantIds.length > 0,
  });

  const streakDays = useMemo(() => {
    const allLoggedAt = (careLogsQuery.data ?? []).map((log) => log.loggedAt);

    return computeCareStreak(allLoggedAt);
  }, [careLogsQuery.data]);

  const displayName = user?.displayName ?? "Elowen Thorne";
  const email = user?.email ?? "elowen.garden@botany.io";
  const initials = getInitials(displayName);
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

  const showSubscriptionAlert = (title: string) => {
    void alert.show({
      variant: "info",
      title,
      message: "This subscription feature is coming soon.",
      icon: "sprout",
      primaryAction: { label: "Close", tone: "primary" },
    });
  };

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
          <View
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
          </View>

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
          <StatItem value={`${streakDays}`} label="DAYS STREAK" />
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
            <ProfileRow
              icon="ios-share"
              iconFamily="MaterialIcons"
              label="Export Collection Data"
              onPress={() => router.push("/export-collection-data")}
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
              <Text
                style={[
                  styles.subscriptionCardTitle,
                  { color: colors.onPrimary },
                ]}
              >
                Conservatory Premium
              </Text>
              <Text
                style={[
                  styles.subscriptionCardBody,
                  { color: colors.primaryFixed },
                ]}
              >
                Access expert diagnostics and unlimited specimen tracking.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => showSubscriptionAlert("Manage Plan")}
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
              label="Watering Alerts"
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
              icon="shield-account-outline"
              label="Privacy & Security"
              onPress={() => router.push("/privacy-security")}
            />
            <ProfileRow
              icon="cloud-check-outline"
              label="Data Backup"
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
              onPress={() => router.push("/privavcy")}
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
              VERSION 2.4.0
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
    maxWidth: 236,
    gap: 10,
    zIndex: 1,
  },
  subscriptionCardTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 31,
    lineHeight: 37,
  },
  subscriptionCardBody: {
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
