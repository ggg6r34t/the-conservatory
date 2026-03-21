import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TertiaryButton } from "@/components/common/Buttons/TertiaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { PlantDetail } from "@/features/plants/components/PlantDetail";
import { usePlant } from "@/features/plants/hooks/usePlant";

export default function PlantDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const plantQuery = usePlant(id ?? "");

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
      >
        <TertiaryButton label="Back" href="/(tabs)/library" />
        {plantQuery.data ? (
          <PlantDetail data={plantQuery.data} />
        ) : (
          <>
            <Text style={[styles.title, { color: colors.primary }]}>
              Specimen not found
            </Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
              This entry may have been deleted or not loaded yet.
            </Text>
          </>
        )}
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
