import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
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

export function PermissionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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

    router.push("/onboarding/quick-start");
  };

  const handleSkip = async () => {
    await markOnboardingAction("permissions_skip");
    trackEvent("onboarding_permissions_skipped");
    router.push("/onboarding/quick-start");
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Icon
              family="MaterialIcons"
              name="arrow-back"
              size={24}
              color={colors.primary}
            />
          </Pressable>
          <Text style={[styles.brand, { color: colors.primary }]}>
            Botanical
          </Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.heroCopy}>
          <Text style={[styles.eyebrow, { color: colors.secondary }]}>
            SETTING UP
          </Text>
          <Text style={[styles.title, { color: colors.primary }]}>
            Permissions
          </Text>
        </View>

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

        <LinearGradient
          colors={["rgba(233, 237, 226, 0.02)", "rgba(233, 237, 226, 0.82)"]}
          start={{ x: 0.2, y: 0.12 }}
          end={{ x: 0.85, y: 0.9 }}
          style={styles.ambientOrb}
          pointerEvents="none"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 34,
    paddingTop: 6,
    paddingBottom: 28,
    backgroundColor: "#fbf9f4",
  },
  topBar: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 18,
    lineHeight: 24,
  },
  spacer: {
    width: 36,
  },
  heroCopy: {
    gap: 10,
    marginTop: 34,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 3.8,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 34,
    lineHeight: 42,
  },
  cardStack: {
    gap: 16,
    marginTop: 44,
  },
  card: {
    borderRadius: 24,
    minHeight: 170,
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: {
    gap: 8,
    paddingRight: 8,
  },
  cardTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 20,
    lineHeight: 28,
  },
  cardBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 21,
  },
  inlineAction: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
    gap: 3,
    marginTop: 2,
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
    gap: 24,
    marginTop: "auto",
    paddingTop: 8,
  },
  bottomPanel: {
    marginTop: "auto",
    borderRadius: 24,
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 10,
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
  ambientOrb: {
    position: "absolute",
    right: -124,
    bottom: -92,
    width: 422,
    height: 422,
    borderRadius: 999,
  },
});
