import { useEffect, useState } from "react";

import { Image, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfileEditScreen() {
  const { colors } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user?.displayName]);

  const trimmedName = displayName.trim();
  const initials = getInitials(trimmedName || user?.displayName || "Curator");
  const isInvalid = trimmedName.length < 2;
  const isUnchanged = trimmedName === (user?.displayName ?? "").trim();

  return (
    <ProfileScreenScaffold
      title="Edit Profile"
      subtitle="Identity details"
      description="Update the name shown across your conservatory while keeping your account email and synced identity intact."
    >
      <View
        style={[
          styles.heroCard,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.secondaryContainer },
          ]}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.initials, { color: colors.primary }]}>
              {initials || "C"}
            </Text>
          )}
        </View>

        <View style={styles.heroCopy}>
          <Text style={[styles.heroTitle, { color: colors.primary }]}>
            {trimmedName || "Curator"}
          </Text>
          <Text style={[styles.heroBody, { color: colors.onSurfaceVariant }]}>
            {user?.email ?? "botanist@conservatory.com"}
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
        style={[
          styles.noteCard,
          { backgroundColor: colors.surfaceContainerLowest },
        ]}
      >
        <Text style={[styles.noteLabel, { color: colors.secondary }]}>
          PROFILE SYNC
        </Text>
        <Text style={[styles.noteBody, { color: colors.onSurfaceVariant }]}>
          Changes update your local session immediately and attempt to sync your
          profile record remotely when connected.
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
});
