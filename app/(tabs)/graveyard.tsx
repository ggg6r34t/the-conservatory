import { Image } from "expo-image";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { useTheme } from "@/components/design-system/useTheme";
import { useGraveyard } from "@/features/plants/hooks/useGraveyard";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";

export default function GraveyardScreen() {
  const { colors, spacing } = useTheme();
  const graveyardQuery = useGraveyard();
  const { onRefresh, refreshing } = usePullToRefreshSync();
  const memorials = graveyardQuery.data ?? [];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
      >
        <AppHeader title="Graveyard" subtitle="Memorial garden" />
        {memorials.length ? (
          <View style={styles.list}>
            {memorials.map((memorial) => (
              <View
                key={memorial.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surfaceContainerLow },
                ]}
              >
                {memorial.primaryPhotoUri ? (
                  <Image
                    source={{ uri: memorial.primaryPhotoUri }}
                    style={styles.image}
                    contentFit="cover"
                  />
                ) : null}
                <Text style={[styles.title, { color: colors.primary }]}>
                  {memorial.name}
                </Text>
                <Text style={[styles.species, { color: colors.secondary }]}>
                  {memorial.speciesName.toUpperCase()}
                </Text>
                <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
                  {memorial.memorialNote ??
                    memorial.plantNotes ??
                    "Remembered as part of your conservatory."}
                </Text>
                <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
                  Archived {new Date(memorial.archivedAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.placeholder,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <Text style={[styles.title, { color: colors.primary }]}>
              No memorials yet
            </Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
              Archived plants will appear here with their preserved notes and
              imagery.
            </Text>
            <PrimaryButton label="Back to Garden" href="/(tabs)" />
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
  list: {
    gap: 16,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    gap: 10,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 20,
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
  species: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
  },
  meta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
  },
});
