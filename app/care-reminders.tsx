import { useMemo } from "react";

import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useReminders } from "@/features/notifications/hooks/useReminders";
import { useSetReminder } from "@/features/notifications/hooks/useSetReminder";
import { usePlants } from "@/features/plants/hooks/usePlants";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings";
import type { CareReminder } from "@/types/models";

function formatReminderCopy(reminder?: CareReminder, fallbackDays = 7) {
  const frequencyDays = reminder?.frequencyDays ?? fallbackDays;
  const reminderType = reminder?.reminderType ?? "water";

  if (!reminder?.enabled) {
    return "Notifications paused";
  }

  if (reminderType === "mist") {
    if (frequencyDays <= 4) {
      return "Mist twice a week";
    }

    return `Mist every ${frequencyDays} days`;
  }

  if (reminderType === "feed") {
    return `Feed every ${frequencyDays} days`;
  }

  return `Water every ${frequencyDays} days`;
}

function getReminderIcon(reminder?: CareReminder, fallbackDays = 7) {
  const frequencyDays = reminder?.frequencyDays ?? fallbackDays;
  const reminderType = reminder?.reminderType ?? "water";

  if (!reminder?.enabled) {
    return {
      family: "MaterialCommunityIcons" as const,
      name: "water-off-outline",
    };
  }

  if (reminderType === "mist") {
    return {
      family: "Feather" as const,
      name: "droplet",
    };
  }

  if (reminderType === "feed") {
    return {
      family: "MaterialCommunityIcons" as const,
      name: "water-plus-outline",
    };
  }

  if (frequencyDays <= 7) {
    return {
      family: "Ionicons" as const,
      name: "water",
    };
  }

  if (frequencyDays <= 14) {
    return {
      family: "Ionicons" as const,
      name: "water-outline",
    };
  }

  return {
    family: "MaterialCommunityIcons" as const,
    name: "water-minus-outline",
  };
}

export default function CareRemindersScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const { user } = useAuth();
  const plantsQuery = usePlants();
  const remindersQuery = useReminders();
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();
  const setReminder = useSetReminder();

  const plants = useMemo(() => plantsQuery.data ?? [], [plantsQuery.data]);
  const reminders = useMemo(
    () => remindersQuery.data ?? [],
    [remindersQuery.data],
  );
  const remindersByPlantId = useMemo(() => {
    const map = new Map<string, CareReminder>();

    for (const reminder of reminders) {
      if (reminder.reminderType === "water") {
        map.set(reminder.plantId, reminder);
      }
    }

    return map;
  }, [reminders]);

  const reminderRows = useMemo(
    () =>
      plants
        .filter((plant) => plant.status === "active")
        .map((plant) => ({
          plant,
          reminder: remindersByPlantId.get(plant.id),
        }))
        .sort((left, right) => {
          const leftDue =
            left.reminder?.nextDueAt ??
            left.plant.nextWaterDueAt ??
            left.plant.createdAt;
          const rightDue =
            right.reminder?.nextDueAt ??
            right.plant.nextWaterDueAt ??
            right.plant.createdAt;

          return leftDue.localeCompare(rightDue);
        }),
    [plants, remindersByPlantId],
  );

  const remindersEnabled = settingsQuery.data?.remindersEnabled ?? true;
  const enabledReminderCount = reminderRows.filter(
    ({ reminder }) => reminder?.enabled ?? remindersEnabled,
  ).length;

  const nextPlantWithoutReminder =
    reminderRows.find(({ reminder }) => !reminder)?.plant ?? null;

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
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Icon
                family="MaterialCommunityIcons"
                name="arrow-left"
                size={24}
                color={colors.primary}
              />
            </Pressable>
            <Text style={[styles.topBarTitle, { color: colors.primary }]}>
              Settings
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              { backgroundColor: colors.secondaryContainer },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.secondary }]}>
              {String(enabledReminderCount).padStart(2, "0")}
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.secondary }]}>
            YOUR SCHEDULE
          </Text>
          <Text style={[styles.heroTitle, { color: colors.primary }]}>
            Reminder Settings
          </Text>
        </View>

        <View
          style={[
            styles.notificationsCard,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <View style={styles.notificationsCopy}>
            <Text
              style={[styles.notificationsTitle, { color: colors.onSurface }]}
            >
              Enable Notifications
            </Text>
            <Text
              style={[
                styles.notificationsBody,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Stay updated on your plant&apos;s needs
            </Text>
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: remindersEnabled }}
            onPress={() => {
              updateSettings.mutate({
                remindersEnabled: !remindersEnabled,
              });
            }}
            style={[
              styles.toggleTrack,
              {
                backgroundColor: remindersEnabled
                  ? colors.primary
                  : colors.surfaceContainerHigh,
              },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                remindersEnabled && styles.toggleThumbEnabled,
                { backgroundColor: colors.surfaceBright },
              ]}
            />
          </Pressable>
        </View>

        <View style={styles.reminderList}>
          {reminderRows.map(({ plant, reminder }, index) => {
            const reminderIcon = getReminderIcon(
              reminder,
              plant.wateringIntervalDays,
            );

            return (
              <View key={plant.id} style={styles.reminderItemWrap}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/plant/${plant.id}` as const)}
                  style={styles.reminderItem}
                >
                  <View
                    style={[
                      styles.reminderImageWrap,
                      { backgroundColor: colors.surfaceContainerLow },
                    ]}
                  >
                    {plant.primaryPhotoUri ? (
                      <Image
                        source={{ uri: plant.primaryPhotoUri }}
                        style={styles.reminderImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.reminderFallback,
                          { backgroundColor: colors.surfaceContainerHigh },
                        ]}
                      >
                        <Icon
                          family="MaterialCommunityIcons"
                          name="sprout"
                          size={22}
                          color={colors.primary}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.reminderCopy}>
                    <Text
                      style={[styles.reminderName, { color: colors.primary }]}
                    >
                      {plant.name}
                    </Text>
                    <View style={styles.reminderMetaRow}>
                      <Icon
                        family={reminderIcon.family}
                        name={reminderIcon.name}
                        size={16}
                        color={colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.reminderMeta,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {formatReminderCopy(
                          reminder,
                          plant.wateringIntervalDays,
                        )}
                      </Text>
                    </View>
                  </View>

                  <Icon
                    family="MaterialCommunityIcons"
                    name="chevron-right"
                    size={22}
                    color={colors.outlineVariant}
                  />
                </Pressable>

                {index < reminderRows.length - 1 ? (
                  <View
                    style={[
                      styles.rowRule,
                      { backgroundColor: colors.surfaceContainerHigh },
                    ]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.addButtonWrap}>
          <PrimaryButton
            label={setReminder.isPending ? "Adding..." : "Add Reminder"}
            icon="plus"
            onPress={() => {
              if (!user?.id) {
                return;
              }

              if (!plants.length) {
                router.push("/plant/add");
                return;
              }

              if (!nextPlantWithoutReminder) {
                void alert.show({
                  variant: "info",
                  title: "All reminders active",
                  message:
                    "Every active specimen already has a reminder. Open a plant to fine-tune its schedule.",
                  primaryAction: { label: "Close" },
                });
                return;
              }

              const nextDueAt =
                nextPlantWithoutReminder.nextWaterDueAt ??
                new Date().toISOString();

              setReminder
                .mutateAsync({
                  plantId: nextPlantWithoutReminder.id,
                  plantName: nextPlantWithoutReminder.name,
                  frequencyDays: nextPlantWithoutReminder.wateringIntervalDays,
                  nextDueAt,
                  enabled: remindersEnabled,
                })
                .then(() => {
                  snackbar.success(
                    `${nextPlantWithoutReminder.name} is now part of your care schedule.`,
                  );
                })
                .catch((error) => {
                  void alert.show({
                    variant: "error",
                    title: "Unable to add reminder",
                    message:
                      error instanceof Error ? error.message : "Try again.",
                    primaryAction: { label: "Close", tone: "danger" },
                  });
                });
            }}
          />
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
    gap: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  hero: {
    gap: 10,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2.2,
  },
  heroTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 36,
  },
  notificationsCard: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  notificationsCopy: {
    flex: 1,
    gap: 4,
  },
  notificationsTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    lineHeight: 21,
  },
  notificationsBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  toggleTrack: {
    width: 54,
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  toggleThumbEnabled: {
    alignSelf: "flex-end",
  },
  reminderList: {
    gap: 0,
  },
  reminderItemWrap: {
    gap: 0,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
  },
  reminderImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: "hidden",
  },
  reminderImage: {
    width: "100%",
    height: "100%",
  },
  reminderFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderCopy: {
    flex: 1,
    gap: 6,
  },
  reminderName: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 28,
  },
  reminderMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reminderMeta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  rowRule: {
    height: 1,
    opacity: 0.45,
    marginLeft: 96,
  },
  addButtonWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
});
