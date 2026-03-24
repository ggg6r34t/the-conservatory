import { useQuery } from "@tanstack/react-query";
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
import { DashboardInsightCard } from "@/features/ai/components/DashboardInsightCard";
import { useDashboardInsight } from "@/features/ai/hooks/useDashboardInsight";
import { calculateCurrentStreakDays } from "@/features/ai/services/streakNudgeService";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listCareLogsForPlants } from "@/features/care-logs/api/careLogsClient";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { HydrationCard } from "@/features/dashboard/components/HydrationCard";
import { StreakSummary } from "@/features/dashboard/components/StreakSummary";
import { UpcomingCare } from "@/features/dashboard/components/UpcomingCare";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { buildDashboardHeroCopy } from "@/features/dashboard/services/dashboardHeroCopy";
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
  const now = Date.now();
  const nowDate = new Date();
  const endOfToday = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();
  const hasCurrentWateringNeed = dashboard.plants.some((plant) => {
    if (!plant.nextWaterDueAt) {
      return false;
    }

    return new Date(plant.nextWaterDueAt).getTime() <= endOfToday;
  });
  const overdueCount = dashboard.plants.filter((plant) => {
    if (!plant.nextWaterDueAt) {
      return false;
    }

    return new Date(plant.nextWaterDueAt).getTime() <= now;
  }).length;
  const upcomingCareCount = dashboard.plants.filter((plant) => {
    if (!plant.nextWaterDueAt) {
      return false;
    }

    const dueAt = new Date(plant.nextWaterDueAt).getTime();
    return (
      dueAt > now + 24 * 60 * 60 * 1000 && dueAt <= now + 72 * 60 * 60 * 1000
    );
  }).length;
  const activeReminderCount = (remindersQuery.data ?? []).filter(
    (reminder) => reminder.enabled,
  ).length;
  const heroCopy = buildDashboardHeroCopy({
    totalPlants: dashboard.plants.length,
    dueToday: dashboard.dueToday.length,
    overdue: overdueCount,
    upcomingCare: upcomingCareCount,
    activeReminders: activeReminderCount,
  });
  const plantIds = dashboard.plants.map((plant) => plant.id);
  const logsQuery = useQuery({
    queryKey: ["care-logs", "batch", plantIds.join("|")],
    queryFn: () => listCareLogsForPlants(plantIds),
    enabled: plantIds.length > 0,
  });
  const logs = logsQuery.data ?? [];
  const currentStreakDays = calculateCurrentStreakDays(logs);
  const insightQuery = useDashboardInsight({
    userId: user?.id,
    plants: dashboard.plants,
    reminders: remindersQuery.data ?? [],
    currentStreakDays,
    enabled: hasCurrentWateringNeed,
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
              {heroCopy.eyebrow}
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
              {heroCopy.body}
            </Text>
          </View>
          <PrimaryButton
            compact
            href="/plant/add"
            icon="plus"
            label="New Specimen"
          />
        </View>

        <HydrationCard
          dueToday={dashboard.dueToday.length}
          overdue={overdueCount}
          nextCycleHours={dashboard.nextCycleHours}
        />

        {insightQuery.data && hasCurrentWateringNeed ? (
          <DashboardInsightCard insight={insightQuery.data} />
        ) : null}

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
