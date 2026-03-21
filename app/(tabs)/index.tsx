import { Link } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { StreakSummary } from "@/features/dashboard/components/StreakSummary";
import { UpcomingCare } from "@/features/dashboard/components/UpcomingCare";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";

export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const dashboard = useDashboard();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
      >
        <DashboardHeader isOffline={dashboard.isOffline} />
        <View style={styles.heroBlock}>
          <View style={styles.copyColumn}>
            <Link
              href="/(tabs)"
              style={[styles.eyebrow, { color: colors.secondary }]}
            >
              YOUR LIVING GALLERY
            </Link>
            <Link
              href="/(tabs)"
              style={[styles.title, { color: colors.primary }]}
            >
              Nature is thriving.
            </Link>
            <Link
              href="/(tabs)"
              style={[styles.body, { color: colors.onSurfaceVariant }]}
            >
              Welcome back. Your indoor sanctuary is looking lush today. Three
              specimens are currently ready for hydration.
            </Link>
          </View>
          <PrimaryButton label="New Specimen" href="/plant/add" />
        </View>
        <StreakSummary
          activePlants={dashboard.plants.length}
          dueToday={dashboard.dueToday.length}
        />
        <QuickActions />
        <UpcomingCare plants={dashboard.dueToday} />
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
  heroBlock: {
    gap: 24,
    paddingVertical: 12,
  },
  copyColumn: {
    gap: 16,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 52,
    lineHeight: 58,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 17,
    lineHeight: 28,
  },
});
