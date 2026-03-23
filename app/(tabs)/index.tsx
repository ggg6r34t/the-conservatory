import { useRouter } from "expo-router";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FAB } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { getFloatingActionBottomOffset } from "@/components/navigation/tabBarMetrics";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { HydrationCard } from "@/features/dashboard/components/HydrationCard";
import { StreakSummary } from "@/features/dashboard/components/StreakSummary";
import { UpcomingCare } from "@/features/dashboard/components/UpcomingCare";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";

export default function HomeScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const dashboard = useDashboard();
  const { onRefresh, refreshing } = usePullToRefreshSync();
  const fabBottomOffset = getFloatingActionBottomOffset(insets.bottom);
  const plantPhotoUris = dashboard.plants
    .map((plant) => plant.primaryPhotoUri)
    .filter((uri): uri is string => Boolean(uri));

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: fabBottomOffset + 84,
          },
        ]}
      >
        <DashboardHeader isOffline={dashboard.isOffline} />

        <View style={styles.heroBlock}>
          <View style={styles.copyColumn}>
            <Text style={[styles.eyebrow, { color: colors.secondary }]}>
              YOUR LIVING GALLERY
            </Text>
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.primary }]}>
                Nature is
              </Text>
              <Text
                style={[
                  styles.title,
                  { color: colors.primary, lineHeight: 72 },
                ]}
              >
                thriving.
              </Text>
            </View>
            <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
              Welcome back. Your indoor sanctuary is looking lush today. Three
              specimens are currently ready for hydration.
            </Text>
          </View>
          <PrimaryButton
            compact
            href="/plant/add"
            icon="plus"
            label="New Specimen"
          />
        </View>

        <HydrationCard dueToday={dashboard.dueToday.length} />

        <StreakSummary
          activePlants={dashboard.plants.length}
          plantPhotoUris={plantPhotoUris}
        />

        <UpcomingCare plants={dashboard.plants} />
      </ScrollView>

      <FAB
        icon="camera-outline"
        style={[
          styles.fab,
          {
            backgroundColor: colors.primaryContainer,
            bottom: fabBottomOffset,
          },
        ]}
        color={colors.surfaceBright}
        onPress={() => router.push("/plant/add")}
        accessibilityLabel="Add specimen"
      />
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
  heroBlock: {
    gap: 24,
    alignItems: "flex-start",
  },
  copyColumn: {
    gap: 16,
    paddingRight: 18,
  },
  titleBlock: {
    gap: 0,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 56,
    lineHeight: 64,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 300,
  },
  fab: {
    position: "absolute",
    right: 18,
  },
});
