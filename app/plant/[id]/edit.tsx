import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TertiaryButton } from "@/components/common/Buttons/TertiaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { PlantForm } from "@/features/plants/components/PlantForm";
import { usePlant } from "@/features/plants/hooks/usePlant";

export default function EditPlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const plantQuery = usePlant(id ?? "");
  const plant = plantQuery.data;
  const primaryPhoto = plant?.photos.find((photo) => photo.isPrimary === 1);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
      >
        <TertiaryButton label="Back" href={`/plant/${id}` as const} />
        <Text style={[styles.title, { color: colors.primary }]}>
          Edit Specimen
        </Text>
        {plant ? (
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
                primaryPhoto?.localUri ?? primaryPhoto?.remoteUrl ?? undefined,
            }}
          />
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
    gap: 20,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 42,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
});
