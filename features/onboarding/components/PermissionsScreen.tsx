import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { useTheme } from "@/components/design-system/useTheme";
import { useOnboardingPermissions } from "@/features/onboarding/hooks/useOnboardingPermissions";
import {
  markOnboardingAction,
  markPermissionsViewed,
} from "@/features/onboarding/services/onboardingDebugStorage";
import type { PermissionState } from "@/features/onboarding/utils/permissionState";
import { trackEvent } from "@/services/analytics/analyticsService";

function getPermissionActionLabel(
  state: PermissionState,
  defaultLabel: string,
) {
  if (state === "granted") {
    return "Allowed";
  }

  if (state === "denied") {
    return "Open Settings";
  }

  if (state === "unavailable") {
    return "Unavailable";
  }

  return defaultLabel;
}

function PermissionCard({
  title,
  body,
  icon,
  actionLabel,
  disabled = false,
  onPress,
}: {
  title: string;
  body: string;
  icon: string;
  actionLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.surfaceContainerLowest },
        ]}
      >
        <Icon
          family="MaterialIcons"
          name={icon}
          size={28}
          color={colors.primary}
        />
      </View>

      <View style={styles.cardCopy}>
        <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
          {title}
        </Text>
        <Text style={[styles.cardBody, { color: colors.onSurfaceVariant }]}>
          {body}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={styles.inlineAction}
      >
        <Text
          style={[
            styles.inlineActionText,
            { color: disabled ? colors.onSurfaceVariant : colors.primary },
          ]}
        >
          {actionLabel}
        </Text>
        <View
          style={[
            styles.inlineActionUnderline,
            { backgroundColor: colors.primaryFixed },
          ]}
        />
      </Pressable>
    </View>
  );
}

export function PermissionsScreen({
  debugPreview = false,
}: {
  debugPreview?: boolean;
}) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const permissions = useOnboardingPermissions();

  useEffect(() => {
    void markPermissionsViewed();
  }, []);

  const handlePermissionRequest = async (
    key: "notifications" | "media" | "location",
  ) => {
    const currentState = permissions.permissions[key];
    if (currentState === "denied") {
      try {
        await Linking.openSettings();
      } catch {
        Alert.alert(
          "Unable to open settings",
          "Open device settings manually.",
        );
      }
      return;
    }

    await markOnboardingAction(`permissions_request_${key}`);
    const result = await permissions.requestPermission(key);

    if (result === "denied") {
      Alert.alert(
        "Permission blocked",
        "This permission was denied. You can continue for now and enable it later from your device settings.",
      );
    }

    if (result === "unavailable") {
      Alert.alert(
        "Permission unavailable",
        "This permission is not available in the current runtime, but you can continue onboarding.",
      );
    }
  };

  const handleContinue = async () => {
    await markOnboardingAction("permissions_continue");
    trackEvent("onboarding_permissions_continue_pressed");
    await permissions.requestAllPendingPermissions();

    router.push(
      debugPreview ? "/debug/onboarding-quick-start" : "/onboarding/quick-start",
    );
  };

  const handleSkip = async () => {
    await markOnboardingAction("permissions_skip");
    trackEvent("onboarding_permissions_skipped");
    router.push(
      debugPreview ? "/debug/onboarding-quick-start" : "/onboarding/quick-start",
    );
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
            paddingBottom: 80,
          },
        ]}
      >
        <AppHeader
          title="Permissions"
          subtitle="Setting Up"
          showBackButton
        />

        <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
          Choose the permissions you want to enable now. You can change any of
          them later from your device settings.
        </Text>

        <View style={styles.cardStack}>
          <PermissionCard
            title="Notifications"
            body="Never miss a watering session or a nutrient boost. We'll send gentle reminders for your green friends."
            icon="notifications"
            actionLabel={getPermissionActionLabel(
              permissions.permissions.notifications,
              "Configure",
            )}
            disabled={
              permissions.activeKey !== null ||
              permissions.permissions.notifications === "unavailable"
            }
            onPress={() => handlePermissionRequest("notifications")}
          />

          <PermissionCard
            title="Photos & Media"
            body="Enable camera access to identify species instantly and track your garden's growth through photos."
            icon="photo-camera"
            actionLabel={getPermissionActionLabel(
              permissions.permissions.media,
              "Allow Access",
            )}
            disabled={
              permissions.activeKey !== null ||
              permissions.permissions.media === "unavailable"
            }
            onPress={() => handlePermissionRequest("media")}
          />

          <PermissionCard
            title="Location"
            body="Get precise local weather alerts and UV indices to optimize your outdoor botanical care."
            icon="location-on"
            actionLabel={getPermissionActionLabel(
              permissions.permissions.location,
              "Use Location",
            )}
            disabled={
              permissions.activeKey !== null ||
              permissions.permissions.location === "unavailable"
            }
            onPress={() => handlePermissionRequest("location")}
          />
        </View>

        <View
          style={[
            styles.bottomPanel,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <View style={styles.bottomActions}>
            <PrimaryButton
              label="Enable & Continue"
              onPress={handleContinue}
              loading={permissions.continueLoading}
              disabled={permissions.activeKey !== null}
              icon="arrow-forward"
              iconFamily="MaterialIcons"
              iconPosition="trailing"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Not now"
              onPress={handleSkip}
              disabled={
                permissions.activeKey !== null || permissions.continueLoading
              }
              style={styles.secondaryAction}
            >
              <Text
                style={[
                  styles.secondaryActionText,
                  { color: colors.onSurface },
                ]}
              >
                Not now
              </Text>
            </Pressable>
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
    gap: 20,
    backgroundColor: "#fbf9f4",
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 28,
    maxWidth: 340,
  },
  cardStack: {
    gap: 16,
  },
  card: {
    borderRadius: 24,
    minHeight: 164,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: {
    gap: 4,
    paddingRight: 12,
  },
  cardTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  cardBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
  inlineAction: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  inlineActionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },
  inlineActionUnderline: {
    width: 112,
    height: 4,
    borderRadius: 999,
  },
  bottomActions: {
    gap: 18,
  },
  bottomPanel: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  secondaryAction: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
});
