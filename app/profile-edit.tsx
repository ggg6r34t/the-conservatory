import { BlurView } from "expo-blur";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  capturePlantImage,
  pickPlantImage,
} from "@/features/plants/services/photoService";
import type { PlantImageAsset } from "@/features/plants/services/photoService";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile";
import { useUploadProfileAvatar } from "@/features/profile/hooks/useUploadProfileAvatar";
import {
  getProfileDisplayEmail,
  getProfileDisplayName,
  getProfileInitials,
} from "@/features/profile/services/profilePresentationService";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";

export default function ProfileEditScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadProfileAvatar();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user?.displayName]);

  useEffect(() => {
    if (!photoPickerVisible) {
      sheetOpacity.setValue(0);
      sheetTranslateY.setValue(24);
      return;
    }

    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [photoPickerVisible, sheetOpacity, sheetTranslateY]);

  const displayedAvatarUri = pendingAvatarUri ?? user?.avatarUrl ?? null;

  useEffect(() => {
    setAvatarFailed(false);
  }, [displayedAvatarUri]);

  const trimmedName = displayName.trim();
  const displayNamePreview = getProfileDisplayName(trimmedName || user?.displayName);
  const initials = getProfileInitials(displayNamePreview);

  const avatarSource = useMemo(
    () =>
      displayedAvatarUri
        ? { uri: displayedAvatarUri }
        : require("@/assets/images/placeholder-avatar.png"),
    [displayedAvatarUri],
  );

  const isInvalid = trimmedName.length < 2;
  const isUnchanged = trimmedName === (user?.displayName ?? "").trim();

  const applyAvatarAsset = (asset: PlantImageAsset | null) => {
    if (!asset) return;
    setPendingAvatarUri(asset.uri);
    uploadAvatar.mutate(asset, {
      onSuccess: () => {
        snackbar.success("Profile photo updated.");
      },
      onError: (error) => {
        setPendingAvatarUri(null);
        void alert.show({
          variant: "error",
          title: "Upload failed",
          message:
            error instanceof Error
              ? error.message
              : "Unable to update your profile photo. Try again.",
          primaryAction: { label: "Close", tone: "danger" },
        });
      },
    });
  };

  const handleCapturePhoto = async () => {
    setPhotoPickerVisible(false);
    try {
      applyAvatarAsset(await capturePlantImage());
    } catch (error) {
      void alert.show({
        variant: "error",
        title: "Unable to open camera",
        message: error instanceof Error ? error.message : "Try again.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  const handlePickFromLibrary = async () => {
    setPhotoPickerVisible(false);
    try {
      applyAvatarAsset(await pickPlantImage());
    } catch (error) {
      void alert.show({
        variant: "error",
        title: "Unable to open photo library",
        message: error instanceof Error ? error.message : "Try again.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  return (
    <>
      <ProfileScreenScaffold
        title="Edit Profile"
        subtitle="Identity details"
        description="Update the name and photo shown across your conservatory while keeping your account email connected."
      >
        <View
          style={[styles.heroCard, { backgroundColor: colors.surfaceContainerLow }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            onPress={() => setPhotoPickerVisible(true)}
            disabled={uploadAvatar.isPending}
            style={styles.avatarWrapper}
          >
            <View
              style={[styles.avatar, { backgroundColor: colors.secondaryContainer }]}
            >
              {!avatarFailed ? (
                <Image
                  source={avatarSource}
                  style={styles.avatarImage}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Text style={[styles.initials, { color: colors.primary }]}>
                  {initials || "C"}
                </Text>
              )}
            </View>

            {uploadAvatar.isPending ? (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator color="white" size="small" />
              </View>
            ) : (
              <View
                style={[styles.avatarCameraBadge, { backgroundColor: colors.primary }]}
              >
                <Icon
                  family="MaterialIcons"
                  name="photo-camera"
                  size={13}
                  color={colors.surfaceBright}
                />
              </View>
            )}
          </Pressable>

          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: colors.primary }]}>
              {displayNamePreview}
            </Text>
            <Text style={[styles.heroBody, { color: colors.onSurfaceVariant }]}>
              {getProfileDisplayEmail(user?.email)}
            </Text>
          </View>
        </View>

        <TextInputField
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="How should your name appear?"
          error={isInvalid ? "Use at least 2 characters." : undefined}
        />

        <TextInputField
          label="Account email"
          value={user?.email ?? ""}
          editable={false}
        />

        <View
          style={[styles.noteCard, { backgroundColor: colors.surfaceContainerLowest }]}
        >
          <Text style={[styles.noteLabel, { color: colors.secondary }]}>
            PROFILE UPDATES
          </Text>
          <Text style={[styles.noteBody, { color: colors.onSurfaceVariant }]}>
            Changes appear on this device right away and are saved to your account
            when you&apos;re connected.
          </Text>
        </View>

        <PrimaryButton
          label={updateProfile.isPending ? "Saving..." : "Save Profile"}
          disabled={isInvalid || isUnchanged || updateProfile.isPending}
          loading={updateProfile.isPending}
          onPress={() => {
            updateProfile.mutate(
              { displayName: trimmedName },
              {
                onSuccess: () => {
                  snackbar.success(
                    "Your display name has been refreshed across the app.",
                  );
                },
                onError: (error) => {
                  void alert.show({
                    variant: "error",
                    title: "Update failed",
                    message:
                      error instanceof Error
                        ? error.message
                        : "We couldn't save your profile right now.",
                    primaryAction: { label: "Close", tone: "danger" },
                  });
                },
              },
            );
          }}
        />
      </ProfileScreenScaffold>

      <Modal
        animationType="none"
        transparent
        visible={photoPickerVisible}
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPhotoPickerVisible(false)}
          />
          <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFill}>
            <View
              style={[styles.pickerOverlayTint, { backgroundColor: colors.backdrop }]}
            />
          </BlurView>
          <Animated.View
            style={[
              styles.pickerSheet,
              {
                backgroundColor: colors.surfaceContainerLowest,
                paddingBottom: Math.max(20, insets.bottom + 8),
                opacity: sheetOpacity,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View
              style={[styles.pickerHandle, { backgroundColor: colors.surfaceContainerHigh }]}
            />

            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.primary }]}>
                Profile Photo
              </Text>
              <Text style={[styles.pickerBody, { color: colors.onSurfaceVariant }]}>
                Choose how you&apos;d like to update your profile picture.
              </Text>
            </View>

            <View style={styles.pickerActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleCapturePhoto();
                }}
                style={({ pressed }) => [
                  styles.pickerActionCard,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.surfaceContainerHigh,
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.992 : 1 }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.pickerActionIconTile,
                    { backgroundColor: colors.secondaryContainer },
                  ]}
                >
                  <Icon
                    family="MaterialIcons"
                    name="photo-camera"
                    size={22}
                    color={colors.secondary}
                  />
                </View>
                <View style={styles.pickerActionText}>
                  <Text style={[styles.pickerActionTitle, { color: colors.onSurface }]}>
                    Take Photo
                  </Text>
                  <Text
                    style={[styles.pickerActionBody, { color: colors.onSurfaceVariant }]}
                  >
                    Open the camera for a fresh portrait.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handlePickFromLibrary();
                }}
                style={({ pressed }) => [
                  styles.pickerActionCard,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.surfaceContainerHigh,
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.992 : 1 }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.pickerActionIconTile,
                    { backgroundColor: colors.primaryFixed },
                  ]}
                >
                  <Icon
                    family="MaterialIcons"
                    name="photo-library"
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.pickerActionText}>
                  <Text style={[styles.pickerActionTitle, { color: colors.onSurface }]}>
                    Photo Library
                  </Text>
                  <Text
                    style={[styles.pickerActionBody, { color: colors.onSurfaceVariant }]}
                  >
                    Import an image from your camera roll.
                  </Text>
                </View>
              </Pressable>
            </View>

            <SecondaryButton
              label="Cancel"
              fullWidth
              variant="surface"
              onPress={() => setPhotoPickerVisible(false)}
            />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 28,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 42,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  heroBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  noteCard: {
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  noteLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1.8,
  },
  noteBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerOverlayTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.72,
  },
  pickerSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.72)",
  },
  pickerHandle: {
    width: 64,
    height: 6,
    borderRadius: 999,
    alignSelf: "center",
  },
  pickerHeader: {
    gap: 6,
  },
  pickerTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  pickerBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  pickerActions: {
    gap: 12,
  },
  pickerActionCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  pickerActionIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pickerActionText: {
    flex: 1,
    gap: 3,
  },
  pickerActionTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  pickerActionBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
});
