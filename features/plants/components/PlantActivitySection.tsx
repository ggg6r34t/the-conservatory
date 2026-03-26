import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { PlantActivityRow } from "@/features/plants/components/PlantActivityRow";
import type { PlantActivitySection as PlantActivitySectionView } from "@/features/plants/services/plantActivityTimeline";

interface PlantActivitySectionProps {
  section: PlantActivitySectionView;
}

export function PlantActivitySection({ section }: PlantActivitySectionProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { gap: spacing.md }]}>
      <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
        {section.label}
      </Text>

      <View style={[styles.items, { gap: spacing.lg }]}>
        {section.items.map((item) => (
          <PlantActivityRow key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
  },
  items: {},
});
