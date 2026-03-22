import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { usePlants } from "@/features/plants/hooks/usePlants";

function buildSpecimenCode(name: string, id: string) {
  const stem = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "SPC";
  return `${stem}-${id.slice(-4).toUpperCase()}`;
}

export default function SpecimenTagsScreen() {
  const { colors } = useTheme();
  const plantsQuery = usePlants();
  const plants = plantsQuery.data ?? [];

  return (
    <ProfileScreenScaffold
      title="Specimen Tags"
      subtitle="Collection registry"
      description="Use these specimen identifiers to keep your collection labeled consistently across care notes, archives, and physical tags."
    >
      {plants.length ? (
        plants.map((plant) => (
          <View
            key={plant.id}
            style={[
              styles.card,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <View style={styles.copy}>
              <Text style={[styles.name, { color: colors.primary }]}>
                {plant.name}
              </Text>
              <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
                {plant.speciesName}
                {plant.location ? ` • ${plant.location}` : ""}
              </Text>
            </View>

            <View
              style={[
                styles.tagChip,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            >
              <Text style={[styles.tagLabel, { color: colors.secondary }]}>
                {buildSpecimenCode(plant.name, plant.id)}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: colors.primary }]}>
            No active specimens
          </Text>
          <Text style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}>
            Add a plant to generate specimen identifiers for your collection.
          </Text>
        </View>
      )}
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  meta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  tagChip: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tagLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  emptyCard: {
    borderRadius: 26,
    padding: 22,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
});
