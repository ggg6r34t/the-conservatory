import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { MoveToGraveyardSheet } from "@/features/plants/components/MoveToGraveyardSheet";
import { PlantForm } from "@/features/plants/components/PlantForm";
import { useArchivePlant } from "@/features/plants/hooks/useArchivePlant";
import { usePlant } from "@/features/plants/hooks/usePlant";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function EditPlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const plantQuery = usePlant(id ?? "");
  const archivePlant = useArchivePlant(id ?? "");
  const [graveyardSheetVisible, setGraveyardSheetVisible] = useState(false);
  const plant = plantQuery.data;
  const primaryPhoto =
    plant?.photos.find((photo) => photo.isPrimary === 1) ?? plant?.photos[0];

  const handleArchivePlant = () => {
    if (!plant) {
      return;
    }
    setGraveyardSheetVisible(true);
  };

  const handleConfirmArchivePlant = async (input: {
    causeOfPassing?: string;
    memorialNote?: string;
  }) => {
    try {
      await archivePlant.mutateAsync(input);
      setGraveyardSheetVisible(false);
      router.replace("/(tabs)/graveyard");
    } catch (error) {
      Alert.alert(
        "Unable to archive plant",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <MoveToGraveyardSheet
        visible={graveyardSheetVisible}
        plantName={plant?.plant.name ?? "this specimen"}
        photoUri={
          primaryPhoto?.localUri ?? primaryPhoto?.remoteUrl ?? undefined
        }
        initialMemorialNote={plant?.plant.notes}
        loading={archivePlant.isPending}
        onClose={() => {
          if (!archivePlant.isPending) {
            setGraveyardSheetVisible(false);
          }
        }}
        onConfirm={handleConfirmArchivePlant}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: 96,
          },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.closeButton}
            >
              <Icon
                family="MaterialIcons"
                name="close"
                size={22}
                color={colors.onSurface}
              />
            </Pressable>
            <Text style={[styles.topBarTitle, { color: colors.primary }]}>
              Edit Specimen
            </Text>
          </View>
        </View>

        {plant ? (
          <>
            <View style={styles.contextBlock}>
              <Text
                style={[styles.contextEyebrow, { color: colors.secondary }]}
              >
                CURRENT PROFILE
              </Text>
              <Text
                style={[styles.contextBody, { color: colors.onSurfaceVariant }]}
              >
                {`${plant.plant.name} • Last updated ${formatUpdatedAt(plant.plant.updatedAt)}`}
              </Text>
            </View>

            <PlantForm
              mode="edit"
              plantId={plant.plant.id}
              initialValues={{
                name: plant.plant.name,
                speciesName: plant.plant.speciesName,
                nickname: plant.plant.nickname ?? "",
                location: plant.plant.location ?? "",
                wateringIntervalDays: plant.plant.wateringIntervalDays,
                notes: plant.plant.notes ?? "",
                photoUri:
                  primaryPhoto?.localUri ??
                  primaryPhoto?.remoteUrl ??
                  undefined,
              }}
            />

            <View style={styles.managementSection}>
              <Text
                style={[styles.managementLabel, { color: colors.secondary }]}
              >
                SPECIMEN STATUS
              </Text>
              <Text
                style={[styles.managementTitle, { color: colors.onSurface }]}
              >
                Memorial Transfer
              </Text>
              <Text
                style={[
                  styles.managementBody,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Move this plant into the Graveyard when you want to preserve its
                record as part of your memorial archive.
              </Text>
              <SecondaryButton
                label="Move to Graveyard"
                fullWidth
                variant="surface"
                onPress={handleArchivePlant}
              />
            </View>
          </>
        ) : plantQuery.isLoading ? (
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            Loading specimen profile...
          </Text>
        ) : (
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            Plant details are not available yet.
          </Text>
        )}
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
  topBar: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 21,
  },
  contextBlock: {
    gap: 6,
    marginTop: -4,
  },
  contextEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.2,
  },
  contextBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  managementSection: {
    gap: 12,
    marginTop: -4,
  },
  managementLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.2,
  },
  managementTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 28,
  },
  managementBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 21,
  },
});
