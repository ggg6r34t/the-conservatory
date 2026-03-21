import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { SettingsForm } from "@/features/settings/components/SettingsForm";

export default function ProfileScreen() {
  const { colors, spacing } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
      >
        <AppHeader title="Profile" subtitle="Account & preferences" />
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text style={[styles.name, { color: colors.primary }]}>
            {user?.displayName ?? "Curator"}
          </Text>
          <Text style={[styles.email, { color: colors.onSurfaceVariant }]}>
            {user?.email ?? "botanist@conservatory.com"}
          </Text>
        </View>
        <SettingsForm />
        <PrimaryButton label="Sign Out" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 24,
  },
  profileCard: {
    borderRadius: 28,
    padding: 24,
    gap: 8,
  },
  name: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
  },
  email: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
  },
});
