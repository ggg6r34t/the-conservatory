import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { TertiaryButton } from "@/components/common/Buttons/TertiaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { CareLogList } from "@/features/care-logs/components/CareLogList";
import { useSetReminder } from "@/features/notifications/hooks/useSetReminder";
import { StreakBadge } from "@/features/plants/components/StreakBadge";
import { useArchivePlant } from "@/features/plants/hooks/useArchivePlant";
import { useDeletePlant } from "@/features/plants/hooks/useDeletePlant";
import { calculatePlantStreak } from "@/features/plants/services/streakService";
import type { PlantWithRelations } from "@/types/models";

interface PlantDetailProps {
  data: PlantWithRelations;
}

export function PlantDetail({ data }: PlantDetailProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const deletePlant = useDeletePlant(data.plant.id);
  const archivePlant = useArchivePlant(data.plant.id);
  const setReminder = useSetReminder();
  const primaryPhoto = data.photos.find((photo) => photo.isPrimary === 1);
  const reminder = data.reminders.find(
    (entry) => entry.reminderType === "water",
  );
  const reminderEnabled = Boolean(reminder?.enabled ?? 1);
  const reminderFrequency =
    reminder?.frequencyDays ?? data.plant.wateringIntervalDays;
  const streak = calculatePlantStreak(
    data.logs,
    data.plant.wateringIntervalDays,
  );

  const updateReminder = (nextFrequency: number, enabled: boolean) => {
    const from = data.plant.lastWateredAt
      ? new Date(data.plant.lastWateredAt)
      : new Date();
    from.setDate(from.getDate() + nextFrequency);
    setReminder
      .mutateAsync({
        plantId: data.plant.id,
        plantName: data.plant.name,
        frequencyDays: nextFrequency,
        nextDueAt: enabled ? from.toISOString() : null,
        enabled,
      })
      .catch((error) => {
        Alert.alert(
          "Unable to update reminder",
          error instanceof Error ? error.message : "Try again.",
        );
      });
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        {primaryPhoto?.localUri || primaryPhoto?.remoteUrl ? (
          <Image
            source={{
              uri: primaryPhoto.localUri ?? primaryPhoto.remoteUrl ?? undefined,
            }}
            style={styles.heroImage}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.heroFallback,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          />
        )}
      </View>
      <View style={styles.headerCopy}>
        <Text style={[styles.species, { color: colors.secondary }]}>
          {data.plant.speciesName.toUpperCase()}
        </Text>
        <Text style={[styles.name, { color: colors.primary }]}>
          {data.plant.name}
        </Text>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          {data.plant.notes ||
            "A living archive of growth, hydration, and quiet rituals."}
        </Text>
      </View>
      <StreakBadge streak={streak} />
      {data.plant.status === "active" ? (
        <View style={styles.actions}>
          <PrimaryButton
            label="Water Now"
            href={`/care-log/${data.plant.id}` as const}
          />
          <SecondaryButton
            label="Edit Plant"
            href={`/plant/${data.plant.id}/edit` as const}
          />
          <SecondaryButton
            label="Move to Graveyard"
            onPress={() => {
              Alert.alert(
                "Move to graveyard",
                "This plant will be archived and reminders will be disabled.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Archive",
                    style: "destructive",
                    onPress: () => {
                      archivePlant
                        .mutateAsync()
                        .then(() => {
                          router.replace("/(tabs)/graveyard");
                        })
                        .catch((error) => {
                          Alert.alert(
                            "Unable to archive plant",
                            error instanceof Error
                              ? error.message
                              : "Try again.",
                          );
                        });
                    },
                  },
                ],
              );
            }}
          />
        </View>
      ) : null}
      {data.plant.status === "active" ? (
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <View style={styles.reminderHeader}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>
              Reminders
            </Text>
            <Switch
              value={reminderEnabled}
              onValueChange={(value) =>
                updateReminder(reminderFrequency, value)
              }
              trackColor={{
                true: colors.primaryContainer,
                false: colors.surfaceContainerHigh,
              }}
              thumbColor={
                reminderEnabled ? colors.primary : colors.surfaceBright
              }
            />
          </View>
          <Text style={[styles.infoBody, { color: colors.onSurfaceVariant }]}>
            Water every {reminderFrequency} days.
          </Text>
          <View style={styles.frequencyRow}>
            {[3, 7, 10, 14].map((days) => {
              const isActive = days === reminderFrequency;
              return (
                <Pressable
                  key={days}
                  onPress={() => updateReminder(days, reminderEnabled)}
                  style={[
                    styles.frequencyChip,
                    {
                      backgroundColor: isActive
                        ? colors.tertiaryContainer
                        : colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.frequencyLabel,
                      {
                        color: isActive
                          ? colors.surfaceBright
                          : colors.onSurface,
                      },
                    ]}
                  >
                    {days}d
                  </Text>
                </Pressable>
              );
            })}
            {setReminder.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : null}
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.primary }]}>
            Memorialized
          </Text>
          <Text style={[styles.infoBody, { color: colors.onSurfaceVariant }]}>
            This plant has been moved to the graveyard archive. Care reminders
            are disabled.
          </Text>
        </View>
      )}
      <CareLogList logs={data.logs} />
      <TertiaryButton
        label="Delete plant"
        onPress={() => {
          Alert.alert(
            "Delete plant",
            "This removes the plant and its local history.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  deletePlant.mutate();
                },
              },
            ],
          );
        }}
      />
      <Link href="/(tabs)/library" style={styles.hiddenLink}>
        Back to library
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  hero: {
    borderRadius: 32,
    overflow: "hidden",
    height: 360,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroFallback: {
    width: "100%",
    height: "100%",
  },
  headerCopy: {
    gap: 8,
  },
  species: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
  },
  name: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 42,
    lineHeight: 50,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 25,
  },
  actions: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 28,
    padding: 20,
    gap: 8,
  },
  infoTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
  },
  infoBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
  },
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  frequencyRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  frequencyChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  frequencyLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1,
  },
  hiddenLink: {
    height: 0,
    width: 0,
    opacity: 0,
  },
});
