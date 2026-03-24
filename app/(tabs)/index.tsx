import { useRouter } from "expo-router";
import { useQueries } from "@tanstack/react-query";
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
import { queryKeys } from "@/config/constants";
import { DashboardInsightCard } from "@/features/ai/components/DashboardInsightCard";
import { useDashboardInsight } from "@/features/ai/hooks/useDashboardInsight";
import { decideDashboardPresentation } from "@/features/ai/services/dashboardPresentationService";
import { useStreakRecoveryNudge } from "@/features/ai/hooks/useStreakRecoveryNudge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listCareLogs } from "@/features/care-logs/api/careLogsClient";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { HydrationCard } from "@/features/dashboard/components/HydrationCard";
import { StreakSummary } from "@/features/dashboard/components/StreakSummary";
import { UpcomingCare } from "@/features/dashboard/components/UpcomingCare";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { useReminders } from "@/features/notifications/hooks/useReminders";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";

export default function HomeScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const dashboard = useDashboard();
  const { user } = useAuth();
  const remindersQuery = useReminders();
  const { onRefresh, refreshing } = usePullToRefreshSync();
  const fabBottomOffset = getFloatingActionBottomOffset(insets.bottom);
  const plantPhotoUris = dashboard.plants
    .map((plant) => plant.primaryPhotoUri)
    .filter((uri): uri is string => Boolean(uri));
  const logQueries = useQueries({
    queries: dashboard.plants.map((plant) => ({
      queryKey: queryKeys.careLogs(plant.id),
      queryFn: () => listCareLogs(plant.id),
      enabled: Boolean(plant.id),
    })),
  });
  const logs = logQueries.flatMap((query) => query.data ?? []);
  const insightQuery = useDashboardInsight({
    userId: user?.id,
    plants: dashboard.plants,
    reminders: remindersQuery.data ?? [],
    currentStreakDays: 0,
  });
  const streakNudgeQuery = useStreakRecoveryNudge({
    userId: user?.id,
    plants: dashboard.plants,
    logs,
  });
  const presentation = decideDashboardPresentation({
    insight: insightQuery.data ?? null,
    streakNudge: streakNudgeQuery.data ?? null,
  });

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

        {presentation.primaryInsight ? (
          <DashboardInsightCard insight={presentation.primaryInsight} />
        ) : null}

        <StreakSummary
          activePlants={dashboard.plants.length}
          plantPhotoUris={plantPhotoUris}
          nudge={presentation.streakNudge?.body}
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
