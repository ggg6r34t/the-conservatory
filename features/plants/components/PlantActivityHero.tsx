import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import type { Photo, Plant } from "@/types/models";

interface PlantActivityHeroProps {
  plant: Plant;
  photo: Photo | null;
}

export function PlantActivityHero({ plant, photo }: PlantActivityHeroProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { gap: spacing.lg }]}>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: colors.secondary }]}>
          CHRONICLE
        </Text>
        <Text style={[styles.title, { color: colors.primary }]}>
          {plant.speciesName}
        </Text>
      </View>

      <View
        style={[
          styles.imageFrame,
          {
            backgroundColor: colors.surfaceContainerLow,
          },
        ]}
      >
        {photo?.localUri || photo?.remoteUrl ? (
          <Image
            source={{ uri: photo.localUri ?? photo.remoteUrl ?? undefined }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.fallback,
              {
                backgroundColor: colors.primaryFixed,
              },
            ]}
          >
            <Text style={[styles.fallbackLabel, { color: colors.primary }]}>
              No recent image
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  copy: {
    gap: 10,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 3,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
    lineHeight: 38,
  },
  imageFrame: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 24,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  fallbackLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
});
