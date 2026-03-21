import { Image } from "expo-image";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import { formatDueLabel } from "@/utils/dateFormatter";

interface PlantCardProps {
  plant: PlantListItem;
}

export function PlantCard({ plant }: PlantCardProps) {
  const { colors } = useTheme();

  return (
    <Link
      href={`/plant/${plant.id}` as const}
      style={[styles.card, { backgroundColor: colors.surfaceContainerLowest }]}
    >
      <View style={styles.imageFrame}>
        {plant.primaryPhotoUri ? (
          <Image
            source={{ uri: plant.primaryPhotoUri }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.imageFallback,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.name, { color: colors.onSurface }]}>
          {plant.name}
        </Text>
        <Text style={[styles.species, { color: colors.onSurfaceVariant }]}>
          {plant.speciesName}
        </Text>
        <Text style={[styles.meta, { color: colors.primary }]}>
          NEXT WATER: {formatDueLabel(plant.nextWaterDueAt).toUpperCase()}
        </Text>
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
  },
  imageFrame: {
    height: 220,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    width: "100%",
    height: "100%",
  },
  copy: {
    padding: 18,
    gap: 6,
  },
  name: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
  },
  species: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
  },
  meta: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
  },
});
