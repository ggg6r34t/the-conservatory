import { StyleSheet, View } from "react-native";

import type { PlantListItem } from "@/features/plants/api/plantsClient";
import { PlantCard } from "@/features/plants/components/PlantCard";

interface PlantListProps {
  plants: PlantListItem[];
}

export function PlantList({ plants }: PlantListProps) {
  return (
    <View style={styles.container}>
      {plants.map((plant) => (
        <PlantCard key={plant.id} plant={plant} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
});
