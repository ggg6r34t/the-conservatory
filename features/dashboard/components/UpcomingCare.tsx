import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import type { PlantListItem } from "@/features/plants/api/plantsClient";
import { formatDueLabel } from "@/utils/dateFormatter";

interface UpcomingCareProps {
  plants: PlantListItem[];
}

export function UpcomingCare({ plants }: UpcomingCareProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.primary }]}>
        Upcoming Care
      </Text>
      <View style={styles.list}>
        {plants.map((plant) => (
          <Link
            key={plant.id}
            href={`/plant/${plant.id}` as const}
            style={[
              styles.card,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <Text style={[styles.name, { color: colors.onSurface }]}>
              {plant.name}
            </Text>
            <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
              {formatDueLabel(plant.nextWaterDueAt)}
            </Text>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    gap: 6,
  },
  name: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
  },
  meta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
  },
});
