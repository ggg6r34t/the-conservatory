import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Divider, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getOnboardingDebugSnapshot,
  markOnboardingAction,
  markOnboardingCompletedAt,
  resetOnboardingDebugSnapshot,
  type ResolvedOnboardingDebugSnapshot,
} from "@/features/onboarding/services/onboardingDebugStorage";
import {
  completeOnboarding,
  resetOnboardingStatus,
} from "@/features/onboarding/services/onboardingStorage";

const formatTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleString();
};

export function OnboardingDebugScreen() {
  const { user, isAuthenticated } = useAuth();
  const [snapshot, setSnapshot] = useState<ResolvedOnboardingDebugSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = user?.id;

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const nextSnapshot = await getOnboardingDebugSnapshot(userId);
      setSnapshot(nextSnapshot);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const handleResetOnboarding = async () => {
    await resetOnboardingStatus({
      userId,
      scope: userId ? "both" : "device",
    });
    await markOnboardingAction("debug_reset");
    await resetOnboardingDebugSnapshot();
    await loadSnapshot();
  };

  const handleCompleteOnboarding = async () => {
    await completeOnboarding({
      userId,
      scope: userId ? "both" : "device",
    });
    await markOnboardingAction("debug_mark_completed");
    await markOnboardingCompletedAt();
    await loadSnapshot();
  };

  const milestoneRows = [
    {
      label: "Onboarding Status",
      value: snapshot?.status === "completed" ? "Completed" : "Pending",
    },
    {
      label: "Welcome Viewed",
      value: formatTimestamp(snapshot?.welcomeViewedAt),
    },
    {
      label: "Slides Viewed",
      value: snapshot ? `${snapshot.slideViewCount} / 3` : "0 / 3",
    },
    {
      label: "Last Viewed Slide",
      value: snapshot?.lastViewedSlide ?? "Not yet",
    },
    {
      label: "Permissions Viewed",
      value: formatTimestamp(snapshot?.permissionsViewedAt),
    },
    {
      label: "Quick Start Viewed",
      value: formatTimestamp(snapshot?.quickStartViewedAt),
    },
    {
      label: "Completed At",
      value: formatTimestamp(snapshot?.completedAt),
    },
  ];

  const analyticsRows = [
    {
      label: "Last Action",
      value: snapshot?.lastAction ?? "No onboarding action recorded",
    },
    {
      label: "Last Action At",
      value: formatTimestamp(snapshot?.lastActionAt),
    },
    {
      label: "Snapshot Updated",
      value: formatTimestamp(snapshot?.updatedAt),
    },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <MaterialCommunityIcons name="bug-outline" size={64} color="#0c6a53" />
        <Text variant="headlineMedium" style={styles.title}>
          Onboarding Debug
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Inspect onboarding state, preview the first-run flow, and reset completion for QA.
        </Text>
      </View>

      <Card mode="elevated" elevation={0} style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Current Status
          </Text>
          <View style={styles.statusRow}>
            <MaterialCommunityIcons
              name={snapshot?.status === "completed" ? "check-circle" : "clock-outline"}
              size={24}
              color={snapshot?.status === "completed" ? "#10b981" : "#c7774d"}
              style={styles.statusIcon}
            />
            <Text variant="bodyLarge">
              Onboarding {snapshot?.status === "completed" ? "Completed" : "Not Completed"}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.helperText}>
            {loading ? "Refreshing state..." : `Completed at: ${formatTimestamp(snapshot?.completedAt)}`}
          </Text>
        </Card.Content>
      </Card>

      <Card mode="elevated" elevation={0} style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <Text variant="titleMedium">Milestone Reporting</Text>
            <Button mode="text" compact onPress={loadSnapshot} icon="refresh">
              Refresh
            </Button>
          </View>
          {milestoneRows.map((item) => (
            <View key={item.label} style={styles.dataRow}>
              <Text variant="bodyMedium" style={styles.dataLabel}>
                {item.label}
              </Text>
              <Text variant="bodyMedium" style={styles.dataValue}>
                {item.value}
              </Text>
            </View>
          ))}
          <View style={styles.dataRow}>
            <Text variant="bodyMedium" style={styles.dataLabel}>
              Active Account Scope
            </Text>
            <Text variant="bodyMedium" style={styles.dataValue}>
              {isAuthenticated && userId ? "Signed-in account + device" : "Device only"}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card mode="elevated" elevation={0} style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            QA Snapshot
          </Text>
          <Text variant="bodySmall" style={styles.helperText}>
            Reads the persisted onboarding debug snapshot so you can verify what parts of the
            flow were actually visited.
          </Text>
          {analyticsRows.map((item) => (
            <View key={item.label} style={styles.dataRow}>
              <Text variant="bodyMedium" style={styles.dataLabel}>
                {item.label}
              </Text>
              <Text variant="bodyMedium" style={styles.dataValue}>
                {item.value}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card mode="elevated" elevation={0} style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Debug Actions
          </Text>

          <Button
            mode="contained"
            onPress={() => router.push("/debug/onboarding-welcome")}
            style={styles.actionButton}
            icon="home-outline"
          >
            View Welcome Screen
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.push("/debug/onboarding-walkthrough")}
            style={styles.actionButton}
            icon="view-carousel-outline"
          >
            View Walkthrough Deck
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.push("/debug/onboarding-permissions")}
            style={styles.actionButton}
            icon="shield-check-outline"
          >
            View Permissions
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.push("/debug/onboarding-quick-start")}
            style={styles.actionButton}
            icon="sprout-outline"
          >
            View Quick Start
          </Button>

          <Divider style={styles.divider} />

          <Button
            mode="outlined"
            onPress={handleResetOnboarding}
            style={styles.actionButton}
            icon="refresh"
          >
            Reset Onboarding Status
          </Button>

          <Button
            mode="outlined"
            onPress={handleCompleteOnboarding}
            style={styles.actionButton}
            icon="check"
          >
            Mark as Completed
          </Button>

          <Divider style={styles.divider} />

          <Text variant="bodySmall" style={styles.helperText}>
            Reset and complete actions now target the same onboarding scope the app uses:
            the active account when signed in, plus the device marker for first-run QA.
          </Text>

          <Divider style={styles.divider} />

          <Button mode="text" onPress={() => router.back()} icon="arrow-left">
            Go Back
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f3ee",
  },
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 20,
  },
  hero: {
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  title: {
    fontWeight: "700",
  },
  subtitle: {
    textAlign: "center",
    color: "#5a615b",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
  },
  cardTitle: {
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIcon: {
    marginRight: 8,
  },
  helperText: {
    marginTop: 8,
    color: "#666",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6,
    gap: 12,
  },
  dataLabel: {
    flex: 1,
    color: "#666",
  },
  dataValue: {
    flex: 1,
    textAlign: "right",
    fontWeight: "600",
  },
  actionButton: {
    marginBottom: 10,
  },
  divider: {
    marginVertical: 10,
  },
});
