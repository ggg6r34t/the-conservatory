import { useMemo, useState } from "react";

import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { optimizeReminderTiming } from "@/features/ai/services/reminderOptimizationService";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDeleteReminder } from "@/features/notifications/hooks/useDeleteReminder";
import { useReminders } from "@/features/notifications/hooks/useReminders";
import { useSetReminder } from "@/features/notifications/hooks/useSetReminder";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import { useAllActivePlants } from "@/features/plants/hooks/usePlants";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import { shadowScale, shadowWithColor } from "@/styles/shadows";
import type { CareReminder, ReminderType } from "@/types/models";

const REMINDER_TYPES: ReminderType[] = ["water", "mist", "feed"];

interface ReminderRow {
  plant: PlantListItem;
  reminder: CareReminder;
  reminderType: ReminderType;
}

interface ReminderDraft {
  mode: "create" | "edit";
  reminderId?: string;
  plantId: string;
  reminderType: ReminderType;
  frequencyDays: string;
  enabled: boolean;
}

function getDefaultFrequencyDays(
  type: ReminderType,
  wateringIntervalDays: number,
) {
  if (type === "mist") return 3;
  if (type === "feed") return 30;
  return wateringIntervalDays;
}

function getReminderTypeLabel(type: ReminderType) {
  if (type === "mist") return "Mist";
  if (type === "feed") return "Feed";
  return "Water";
}

function formatReminderCopy(input: {
  reminder?: CareReminder;
  fallbackDays?: number;
  remindersEnabled: boolean;
}) {
  const { reminder, remindersEnabled, fallbackDays = 7 } = input;
  const frequencyDays = reminder?.frequencyDays ?? fallbackDays;
  const reminderType = reminder?.reminderType ?? "water";

  if (!remindersEnabled) {
    return "Notifications paused globally";
  }

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

function getReminderIcon(input: {
  reminder?: CareReminder;
  fallbackDays?: number;
  remindersEnabled: boolean;
}) {
  const { reminder, remindersEnabled, fallbackDays = 7 } = input;
  const frequencyDays = reminder?.frequencyDays ?? fallbackDays;
  const reminderType = reminder?.reminderType ?? "water";

  if (!remindersEnabled || !reminder?.enabled) {
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
  const { colors } = useTheme();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const { user } = useAuth();
  const plantsQuery = useAllActivePlants();
  const remindersQuery = useReminders();
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();
  const setReminder = useSetReminder();
  const deleteReminder = useDeleteReminder();
  const [draft, setDraft] = useState<ReminderDraft | null>(null);

  const plants = useMemo(() => plantsQuery.data ?? [], [plantsQuery.data]);
  const reminders = useMemo(
    () => remindersQuery.data ?? [],
    [remindersQuery.data],
  );
  const remindersByPlantId = useMemo(() => {
    const map = new Map<string, CareReminder[]>();

    for (const reminder of reminders) {
      const existing = map.get(reminder.plantId) ?? [];
      existing.push(reminder);
      map.set(reminder.plantId, existing);
    }

    return map;
  }, [reminders]);

  const reminderRows = useMemo(
    () =>
      plants
        .filter((plant) => plant.status === "active")
        .flatMap<ReminderRow>((plant) => {
          const plantReminders = remindersByPlantId.get(plant.id) ?? [];
          return [...plantReminders]
            .sort(
              (left, right) =>
                REMINDER_TYPES.indexOf(left.reminderType) -
                REMINDER_TYPES.indexOf(right.reminderType),
            )
            .map((reminder) => ({
              plant,
              reminder,
              reminderType: reminder.reminderType,
            }));
        })
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

  const nextMissingReminder = useMemo(() => {
    for (const plant of plants.filter(
      (candidate) => candidate.status === "active",
    )) {
      const existing = new Set(
        (remindersByPlantId.get(plant.id) ?? []).map(
          (reminder) => reminder.reminderType,
        ),
      );
      const reminderType = REMINDER_TYPES.find((type) => !existing.has(type));
      if (reminderType) {
        return { plant, reminderType };
      }
    }
    return null;
  }, [plants, remindersByPlantId]);

  const selectedDraftPlant = draft
    ? plants.find((plant) => plant.id === draft.plantId) ?? null
    : null;

  const openCreateReminder = () => {
    if (!user?.id) {
      void alert.show({
        variant: "warning",
        title: "Sign in required",
        message: "Sign in before creating reminders for your specimens.",
        primaryAction: { label: "Close" },
      });
      return;
    }

    if (!plants.length) {
      router.push("/plant/add");
      return;
    }

    if (!nextMissingReminder) {
      void alert.show({
        variant: "info",
        title: "All reminders active",
        message:
          "Every active specimen already has water, mist, and feed reminders. Edit an existing row to fine-tune its schedule.",
        primaryAction: { label: "Close" },
      });
      return;
    }

    setDraft({
      mode: "create",
      plantId: nextMissingReminder.plant.id,
      reminderType: nextMissingReminder.reminderType,
      frequencyDays: String(
        getDefaultFrequencyDays(
          nextMissingReminder.reminderType,
          nextMissingReminder.plant.wateringIntervalDays,
        ),
      ),
      enabled: remindersEnabled,
    });
  };

  const openEditReminder = (reminder: CareReminder) => {
    setDraft({
      mode: "edit",
      reminderId: reminder.id,
      plantId: reminder.plantId,
      reminderType: reminder.reminderType,
      frequencyDays: String(reminder.frequencyDays),
      enabled: Boolean(reminder.enabled),
    });
  };

  const saveDraft = async () => {
    if (!draft || !selectedDraftPlant) {
      return;
    }

    const frequencyDays = Number.parseInt(draft.frequencyDays, 10);
    if (!Number.isFinite(frequencyDays) || frequencyDays < 1) {
      void alert.show({
        variant: "warning",
        title: "Frequency required",
        message: "Set the reminder cadence to at least 1 day.",
        primaryAction: { label: "Close" },
      });
      return;
    }

    try {
      await setReminder.mutateAsync({
        plantId: selectedDraftPlant.id,
        plantName: selectedDraftPlant.name,
        reminderType: draft.reminderType,
        frequencyDays,
        nextDueAt: selectedDraftPlant.nextWaterDueAt ?? new Date().toISOString(),
        enabled: draft.enabled,
        speciesName: selectedDraftPlant.speciesName,
        lastWateredAt: selectedDraftPlant.lastWateredAt ?? null,
      });
      setDraft(null);
      snackbar.success(
        `${selectedDraftPlant.name} ${getReminderTypeLabel(
          draft.reminderType,
        ).toLowerCase()} reminder saved.`,
      );
    } catch (error) {
      void alert.show({
        variant: "error",
        title: "Unable to save reminder",
        message: error instanceof Error ? error.message : "Try again.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  const removeReminder = async (reminder: CareReminder, plant: PlantListItem) => {
    const confirmed = await alert.confirm({
      variant: "destructive",
      title: "Remove reminder?",
      message: `${plant.name}'s ${getReminderTypeLabel(
        reminder.reminderType,
      ).toLowerCase()} reminder will be removed from this device and backup queue.`,
      primaryAction: { label: "Remove", tone: "danger" },
      secondaryAction: { label: "Cancel" },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteReminder.mutateAsync({
        reminderId: reminder.id,
        plantId: plant.id,
      });
      if (draft?.reminderId === reminder.id) {
        setDraft(null);
      }
      snackbar.success(
        `${plant.name} ${getReminderTypeLabel(
          reminder.reminderType,
        ).toLowerCase()} reminder removed.`,
      );
    } catch (error) {
      void alert.show({
        variant: "error",
        title: "Unable to remove reminder",
        message: error instanceof Error ? error.message : "Try again.",
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  return (
    <ProfileScreenScaffold title="Care Reminders" subtitle="Your schedule">
      <View style={styles.content}>
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
              Stay updated on your plant&apos;s needs. This setting saves on
              this device right away and keeps your account up to date when
              backup is available.
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
          {reminderRows.map(({ plant, reminder, reminderType }, index) => {
            const fallbackDays = getDefaultFrequencyDays(
              reminderType,
              plant.wateringIntervalDays,
            );
            const reminderIcon = getReminderIcon({
              reminder,
              fallbackDays,
              remindersEnabled,
            });
            const optimizedReminder = optimizeReminderTiming({
              plantName: plant.name,
              speciesName: plant.speciesName,
              wateringIntervalDays: reminder?.frequencyDays ?? fallbackDays,
              nextDueAt: reminder?.nextDueAt ?? plant.nextWaterDueAt ?? null,
              lastWateredAt: plant.lastWateredAt ?? null,
              lastTriggeredAt: reminder?.lastTriggeredAt ?? null,
              reminderEnabled: remindersEnabled && Boolean(reminder?.enabled),
              defaultWateringHour: settingsQuery.data?.defaultWateringHour ?? 9,
            });

            return (
              <View
                key={`${plant.id}-${reminderType}`}
                style={styles.reminderItemWrap}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openEditReminder(reminder)}
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
                    <Text
                      style={[
                        styles.reminderType,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {getReminderTypeLabel(reminderType)}
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
                        {formatReminderCopy({
                          reminder,
                          fallbackDays,
                          remindersEnabled,
                        })}
                      </Text>
                    </View>
                    {optimizedReminder.explanation ? (
                      <Text
                        style={[
                          styles.reminderHint,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {optimizedReminder.explanation}
                      </Text>
                    ) : null}
                  </View>

                  <Icon
                    family="Feather"
                    name="edit-2"
                    size={18}
                    color={colors.outlineVariant}
                  />
                </Pressable>

                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openEditReminder(reminder)}
                    style={[
                      styles.rowActionButton,
                      { backgroundColor: colors.surfaceContainerLow },
                    ]}
                  >
                    <Text
                      style={[styles.rowActionText, { color: colors.primary }]}
                    >
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={deleteReminder.isPending}
                    onPress={() => {
                      void removeReminder(reminder, plant);
                    }}
                    style={[
                      styles.rowActionButton,
                      { backgroundColor: colors.surfaceContainerLow },
                    ]}
                  >
                    <Text
                      style={[styles.rowActionText, { color: colors.error }]}
                    >
                      Remove
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/plant/${plant.id}` as const)}
                    style={[
                      styles.rowActionButton,
                      { backgroundColor: colors.surfaceContainerLow },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rowActionText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      Plant
                    </Text>
                  </Pressable>
                </View>

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

        <Modal
          animationType="fade"
          transparent
          visible={Boolean(draft)}
          onRequestClose={
            setReminder.isPending ? undefined : () => setDraft(null)
          }
        >
          {draft ? (
            <View style={styles.dialogOverlay}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss reminder editor"
                disabled={setReminder.isPending}
                onPress={() => setDraft(null)}
                style={StyleSheet.absoluteFill}
              >
                <BlurView
                  intensity={58}
                  tint="light"
                  style={StyleSheet.absoluteFill}
                >
                  <View style={styles.dialogBackdropTint} />
                  <View style={styles.dialogBackdropShade} />
                </BlurView>
              </Pressable>

              <View
                accessibilityRole="alert"
                accessibilityLabel={
                  draft.mode === "create" ? "New reminder" : "Edit reminder"
                }
            style={[
              styles.editorCard,
                  shadowWithColor(shadowScale.modalCard, colors.backdrop),
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    borderColor: "rgba(255, 255, 255, 0.74)",
                  },
            ]}
          >
                <View pointerEvents="none" style={styles.cardGlow} />
                <ScrollView
                  contentContainerStyle={styles.editorScrollContent}
                  showsVerticalScrollIndicator={false}
                >
            <View style={styles.editorHeader}>
              <View style={styles.editorHeaderCopy}>
                <Text style={[styles.editorTitle, { color: colors.onSurface }]}>
                  {draft.mode === "create" ? "New reminder" : "Edit reminder"}
                </Text>
                <Text
                  style={[
                    styles.editorBody,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Choose the specimen, care type, cadence, and delivery state
                  before saving.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDraft(null)}
                style={styles.closeButton}
              >
                <Icon
                  family="Feather"
                  name="x"
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            <View style={styles.editorSection}>
              <Text
                style={[styles.editorLabel, { color: colors.onSurfaceVariant }]}
              >
                Specimen
              </Text>
              <View style={styles.chipRow}>
                {plants
                  .filter((plant) => plant.status === "active")
                  .map((plant) => {
                    const selected = draft.plantId === plant.id;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={plant.id}
                        disabled={draft.mode === "edit"}
                        onPress={() => {
                          const existing = new Set(
                            (remindersByPlantId.get(plant.id) ?? []).map(
                              (reminder) => reminder.reminderType,
                            ),
                          );
                          const nextType =
                            REMINDER_TYPES.find(
                              (type) => !existing.has(type),
                            ) ?? "water";
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  plantId: plant.id,
                                  reminderType: nextType,
                                  frequencyDays: String(
                                    getDefaultFrequencyDays(
                                      nextType,
                                      plant.wateringIntervalDays,
                                    ),
                                  ),
                                }
                              : current,
                          );
                        }}
                        style={[
                          styles.choiceChip,
                          {
                            backgroundColor: selected
                              ? colors.primary
                              : colors.surfaceBright,
                            opacity: draft.mode === "edit" && !selected ? 0.45 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceChipText,
                            {
                              color: selected
                                ? colors.onPrimary
                                : colors.onSurfaceVariant,
                            },
                          ]}
                        >
                          {plant.name}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            </View>

            <View style={styles.editorSection}>
              <Text
                style={[styles.editorLabel, { color: colors.onSurfaceVariant }]}
              >
                Care type
              </Text>
              <View style={styles.chipRow}>
                {REMINDER_TYPES.map((type) => {
                  const selected = draft.reminderType === type;
                  const alreadyExists =
                    draft.mode === "create" &&
                    (remindersByPlantId.get(draft.plantId) ?? []).some(
                      (reminder) => reminder.reminderType === type,
                    );
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={type}
                      disabled={alreadyExists || draft.mode === "edit"}
                      onPress={() => {
                        if (!selectedDraftPlant) {
                          return;
                        }
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                reminderType: type,
                                frequencyDays: String(
                                  getDefaultFrequencyDays(
                                    type,
                                    selectedDraftPlant.wateringIntervalDays,
                                  ),
                                ),
                              }
                            : current,
                        );
                      }}
                      style={[
                        styles.choiceChip,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.surfaceBright,
                          opacity: alreadyExists ? 0.45 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          {
                            color: selected
                              ? colors.onPrimary
                              : colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {getReminderTypeLabel(type)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.editorSection}>
              <Text
                style={[styles.editorLabel, { color: colors.onSurfaceVariant }]}
              >
                Cadence
              </Text>
              <View style={styles.cadenceRow}>
                <TextInput
                  accessibilityLabel="Reminder frequency in days"
                  keyboardType="number-pad"
                  value={draft.frequencyDays}
                  onChangeText={(frequencyDays) =>
                    setDraft((current) =>
                      current ? { ...current, frequencyDays } : current,
                    )
                  }
                  style={[
                    styles.cadenceInput,
                    {
                      backgroundColor: colors.surfaceBright,
                      color: colors.onSurface,
                    },
                  ]}
                />
                <Text
                  style={[styles.editorBody, { color: colors.onSurfaceVariant }]}
                >
                  days between reminders
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: draft.enabled }}
              onPress={() =>
                setDraft((current) =>
                  current ? { ...current, enabled: !current.enabled } : current,
                )
              }
              style={styles.deliveryRow}
            >
              <View style={styles.deliveryCopy}>
                <Text
                  style={[styles.deliveryTitle, { color: colors.onSurface }]}
                >
                  {draft.enabled ? "Delivery active" : "Delivery paused"}
                </Text>
                <Text
                  style={[
                    styles.editorBody,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {remindersEnabled
                    ? "This reminder follows the saved cadence."
                    : "Global notifications are paused, so this reminder will stay quiet."}
                </Text>
              </View>
              <View
                style={[
                  styles.toggleTrack,
                  {
                    backgroundColor: draft.enabled
                      ? colors.primary
                      : colors.surfaceContainerHigh,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    draft.enabled && styles.toggleThumbEnabled,
                    { backgroundColor: colors.surfaceBright },
                  ]}
                />
              </View>
            </Pressable>

            <View style={styles.editorActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDraft(null)}
                style={styles.cancelButton}
              >
                <Text
                  style={[styles.cancelText, { color: colors.onSurfaceVariant }]}
                >
                  Cancel
                </Text>
              </Pressable>
              <PrimaryButton
                compact
                label={setReminder.isPending ? "Saving..." : "Save Reminder"}
                loading={setReminder.isPending}
                onPress={() => {
                  void saveDraft();
                }}
              />
              </View>
                </ScrollView>
            </View>
            </View>
          ) : null}
        </Modal>

        <View style={styles.addButtonWrap}>
          <PrimaryButton
            label="Add Reminder"
            icon="plus"
            onPress={openCreateReminder}
          />
        </View>
      </View>
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
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
  scopeCard: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 6,
  },
  scopeLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1.8,
  },
  scopeBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
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
  reminderType: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1,
    textTransform: "uppercase",
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
  reminderHint: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingBottom: 14,
    paddingLeft: 96,
  },
  rowActionButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rowActionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
  },
  rowRule: {
    height: 1,
    opacity: 0.45,
    marginLeft: 96,
  },
  dialogOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dialogBackdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(251, 249, 244, 0.38)",
  },
  dialogBackdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(48, 49, 46, 0.06)",
  },
  editorCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "88%",
    borderRadius: 32,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 18,
    gap: 18,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  editorScrollContent: {
    gap: 18,
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  editorHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  editorTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 30,
  },
  editorBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  editorSection: {
    gap: 10,
  },
  editorLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  choiceChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
  },
  cadenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cadenceInput: {
    minWidth: 78,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 20,
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  deliveryCopy: {
    flex: 1,
    gap: 4,
  },
  deliveryTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },
  editorActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 14,
  },
  cancelButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  cancelText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    lineHeight: 18,
  },
  addButtonWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
});
