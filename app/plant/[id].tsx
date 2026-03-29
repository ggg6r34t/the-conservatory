import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { PlantDetail } from "@/features/plants/components/PlantDetail";
import { usePlant } from "@/features/plants/hooks/usePlant";

export default function PlantDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const plantQuery = usePlant(id ?? "");

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: 96,
          },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable
              accessibilityRole="button"
              style={styles.iconButton}
              onPress={() => router.back()}
            >
              <Icon name="arrow-left" size={20} color={colors.primary} />
            </Pressable>
            <Text style={[styles.brand, { color: colors.primary }]}>
              Plant Details
            </Text>
          </View>

          {plantQuery.data ? (
            <Pressable
              accessibilityRole="button"
              style={styles.iconButton}
              onPress={() => router.push(`/plant/${id}/edit` as const)}
            >
              <Icon
                family="Feather"
                name="edit-3"
                size={20}
                color={colors.primary}
              />
            </Pressable>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>

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
  content: { gap: 24 },
  topBar: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
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
