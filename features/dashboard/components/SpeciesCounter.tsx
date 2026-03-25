import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface SpeciesCounterProps {
  activePlants: number;
  plantPhotoUris: string[];
}

export function SpeciesCounter({
  activePlants,
  plantPhotoUris,
}: SpeciesCounterProps) {
  const { colors } = useTheme();
  const thumbnails = plantPhotoUris.slice(0, 3);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.tertiaryContainer }]}
    >
      <View style={styles.metric}>
        <Text style={[styles.count, { color: colors.primaryFixed }]}>
          {activePlants}
        </Text>
        <Text style={[styles.label, { color: colors.surfaceBright }]}>
          ACTIVE SPECIES
        </Text>
      </View>

      <View style={styles.cluster}>
        {thumbnails.map((uri, index) => (
          <View
            key={`${uri}-${index}`}
            style={[
              styles.thumbFrame,
              { left: index * 18, backgroundColor: colors.surfaceBright },
            ]}
          >
            <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 118,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metric: {
    gap: 6,
  },
  count: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 48,
    lineHeight: 50,
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2.4,
  },
  cluster: {
    width: 86,
    height: 40,
    position: "relative",
  },
  thumbFrame: {
    position: "absolute",
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
  },
  thumb: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
});
