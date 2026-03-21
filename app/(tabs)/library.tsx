import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import { PlantList } from "@/features/plants/components/PlantList";
import { usePlants } from "@/features/plants/hooks/usePlants";
import { usePlantStore } from "@/features/plants/stores/usePlantStore";

export default function LibraryScreen() {
  const { colors, spacing } = useTheme();
  const plantsQuery = usePlants();
  const filter = usePlantStore((state) => state.filter);
  const query = usePlantStore((state) => state.query);
  const setFilter = usePlantStore((state) => state.setFilter);
  const setQuery = usePlantStore((state) => state.setQuery);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
      >
        <AppHeader title="Living Gallery" subtitle="Your collection" />
        <TextInputField
          label="Search"
          value={query}
          onChangeText={setQuery}
          placeholder="Find a monstera, ficus, or pothos"
        />
        <View style={styles.filterRow}>
          {[
            { label: "All", value: "all" as const },
            { label: "Needs Water", value: "needs-water" as const },
            { label: "Thriving", value: "thriving" as const },
          ].map((option) => {
            const isActive = option.value === filter;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFilter(option.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.tertiaryContainer
                      : colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color: isActive ? colors.surfaceBright : colors.onSurface,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {plantsQuery.data?.length ? (
          <PlantList plants={plantsQuery.data} />
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <View style={styles.emptyCopy}>
              <Text style={[styles.emptyTitle, { color: colors.primary }]}>
                Your conservatory is quiet.
              </Text>
              <Text
                style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}
              >
                Every collection starts with a single specimen. Begin your
                botanical archive today.
              </Text>
              <PrimaryButton label="Add First Specimen" href="/plant/add" />
            </View>
          </View>
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
    gap: 24,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  chipLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
  },
  emptyCard: {
    borderRadius: 28,
    minHeight: 240,
    padding: 24,
    justifyContent: "center",
  },
  emptyCopy: {
    gap: 16,
  },
  emptyTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 40,
    lineHeight: 46,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
});
