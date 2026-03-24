import { StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";

import { useTheme } from "@/components/design-system/useTheme";
import { useArchiveCuration } from "@/features/ai/hooks/useArchiveCuration";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useGraveyard } from "@/features/plants/hooks/useGraveyard";

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ArchiveGalleryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const graveyardQuery = useGraveyard();
  const memorials = graveyardQuery.data ?? [];
  const curationQuery = useArchiveCuration({
    userId: user?.id,
    memorials,
  });

  return (
    <ProfileScreenScaffold
      title="Archive Gallery"
      subtitle="Memorial archive"
      description="A compact catalog of your remembered specimens, preserved with their memorial notes and archive dates."
    >
      {curationQuery.data.length ? (
        <View style={styles.curatedSection}>
          <Text style={[styles.curatedLabel, { color: colors.secondary }]}>
            QUIET PAIRS
          </Text>
          {curationQuery.data.map((pair) => (
            <View
              key={pair.plantId}
              style={[
                styles.curatedCard,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            >
              <View style={styles.curatedHeader}>
                <Text style={[styles.curatedTitle, { color: colors.primary }]}>
                  {pair.plantName}
                </Text>
                <Text
                  style={[styles.curatedCaption, { color: colors.onSurfaceVariant }]}
                >
                  {pair.caption}
                </Text>
              </View>

              <View style={styles.curatedImageRow}>
                <Image
                  source={{ uri: pair.beforeUri }}
                  style={styles.curatedImage}
                  contentFit="cover"
                />
                <Image
                  source={{ uri: pair.afterUri }}
                  style={styles.curatedImage}
                  contentFit="cover"
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {memorials.length ? (
        memorials.map((memorial) => (
          <View
            key={memorial.id}
            style={[
              styles.card,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <View
              style={[
                styles.imageWrap,
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
            </View>

            <View style={styles.copy}>
              <Text style={[styles.name, { color: colors.primary }]}>
                {memorial.name}
              </Text>
              <Text style={[styles.meta, { color: colors.secondary }]}>
                ARCHIVED {formatArchiveDate(memorial.archivedAt).toUpperCase()}
              </Text>
              <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
                {memorial.memorialNote?.trim() ||
                  memorial.plantNotes?.trim() ||
                  "Remembered as part of your conservatory archive."}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: colors.primary }]}>
            No memorials yet
          </Text>
          <Text style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}>
            Archived plants will appear here once they move into the memorial
            collection.
          </Text>
        </View>
      )}
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  curatedSection: {
    gap: 12,
  },
  curatedLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2,
  },
  curatedCard: {
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  curatedHeader: {
    gap: 4,
  },
  curatedTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  curatedCaption: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  curatedImageRow: {
    flexDirection: "row",
    gap: 12,
  },
  curatedImage: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 18,
  },
  card: {
    borderRadius: 26,
    padding: 16,
    flexDirection: "row",
    gap: 16,
  },
  imageWrap: {
    width: 94,
    height: 94,
    borderRadius: 18,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  meta: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.4,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  emptyCard: {
    borderRadius: 26,
    padding: 22,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
});
