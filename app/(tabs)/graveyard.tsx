import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { useTheme } from "@/components/design-system/useTheme";

export default function GraveyardScreen() {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
      >
        <AppHeader title="Graveyard" subtitle="Memorial garden" />
        <View
          style={[
            styles.placeholder,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text style={[styles.title, { color: colors.primary }]}>
            Phase 1 Placeholder
          </Text>
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            Memorialization arrives in Phase 2. The domain and routing are
            already reserved so this can grow without a rewrite.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 24,
  },
  placeholder: {
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 25,
  },
});
