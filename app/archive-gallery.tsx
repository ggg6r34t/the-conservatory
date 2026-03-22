import { StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";

import { useTheme } from "@/components/design-system/useTheme";
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
  const graveyardQuery = useGraveyard();
  const memorials = graveyardQuery.data ?? [];

  return (
    <ProfileScreenScaffold
      title="Archive Gallery"
      subtitle="Memorial archive"
      description="A compact catalog of your remembered specimens, preserved with their memorial notes and archive dates."
    >
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
