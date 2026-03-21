import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TertiaryButton } from "@/components/common/Buttons/TertiaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { PlantForm } from "@/features/plants/components/PlantForm";

export default function AddPlantScreen() {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
      >
        <TertiaryButton label="Back" href="/(tabs)" />
        <Text style={[styles.title, { color: colors.primary }]}>
          New Specimen
        </Text>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          Document a new specimen with a photograph, rhythm, and a place in your
          conservatory.
        </Text>
        <PlantForm mode="create" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { gap: 20 },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 42,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 25,
  },
});
