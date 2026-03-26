import { Image } from "expo-image";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import type { Photo } from "@/types/models";

function resolvePhotoUri(photo: Photo): string | null {
  return photo.remoteUrl ?? photo.localUri ?? null;
}

function formatPhotoDate(photo: Photo) {
  const source = photo.takenAt ?? photo.createdAt;
  return new Date(source)
    .toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

interface MemorialFilmstripProps {
  photos: Photo[];
}

export function MemorialFilmstrip({ photos }: MemorialFilmstripProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.section, { marginTop: spacing.xxl }]}>
      <View
        style={[styles.header, { paddingHorizontal: spacing.lg }]}
      >
        <Text style={[styles.title, { color: colors.primary }]}>
          Their Best Days
        </Text>
        <Text style={[styles.count, { color: colors.onSurfaceVariant }]}>
          {photos.length} ARCHIVED {photos.length === 1 ? "MOMENT" : "MOMENTS"}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filmstrip, { paddingHorizontal: spacing.lg }]}
      >
        {photos.map((photo) => {
          const uri = resolvePhotoUri(photo);
          return (
            <View key={photo.id} style={styles.filmCell}>
              <View style={styles.filmImageWrap}>
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={styles.filmImage}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.filmImage,
                      { backgroundColor: colors.surfaceContainerLow },
                    ]}
                  />
                )}
              </View>
              <Text style={[styles.caption, { color: colors.onSurfaceVariant }]}>
                {formatPhotoDate(photo)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  count: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  filmstrip: {
    gap: 16,
  },
  filmCell: {
    width: 200,
    gap: 10,
  },
  filmImageWrap: {
    height: 266,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#20201d",
  },
  filmImage: {
    width: "100%",
    height: "100%",
  },
  caption: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
});
