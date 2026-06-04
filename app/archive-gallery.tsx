import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { EmptyState } from "@/features/empty-states/components/EmptyState";
import { getEmptyStateForContext } from "@/features/empty-states/getEmptyStateForContext";
import { useArchiveCuration } from "@/features/ai/hooks/useArchiveCuration";
import { saveArchiveCurationOverride } from "@/features/ai/services/archiveCurationOverridesService";
import { getInsightSourceLabel } from "@/features/ai/services/insightSourcePresentation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { PlantPhotoImage } from "@/features/plants/components/PlantPhotoImage";
import { useGraveyard } from "@/features/plants/hooks/useGraveyard";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useSnackbar } from "@/hooks/useSnackbar";

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
  const { isPremium } = useSubscription();
  const snackbar = useSnackbar();
  const graveyardQuery = useGraveyard();
  const memorials = graveyardQuery.data ?? [];
  const curationQuery = useArchiveCuration({
    userId: user?.id,
    memorials,
    isPremium,
  });
  const [drafts, setDrafts] = useState<
    Record<string, { beforePhotoId: string | null; afterPhotoId: string | null }>
  >({});

  const getDraftPair = (pair: (typeof curationQuery.data)[number]) =>
    drafts[pair.plantId] ?? {
      beforePhotoId: pair.beforePhotoId ?? null,
      afterPhotoId: pair.afterPhotoId ?? null,
    };

  return (
    <ProfileScreenScaffold
      title="Archive Gallery"
      subtitle="Memorial archive"
      description="A compact catalog of your remembered specimens, preserved with their memorial notes and archive dates."
    >
      {memorials.length > 0 && !isPremium && curationQuery.data.length === 0 ? (
        <EmptyState
          content={getEmptyStateForContext({ context: "archive.premiumLocked" })}
          screen="archive_gallery"
          reason="premium_locked"
          primaryHref="/premium"
        />
      ) : null}

      {isPremium && memorials.length > 0 && curationQuery.data.length === 0 && !curationQuery.isLoading ? (
        <EmptyState
          content={getEmptyStateForContext({ context: "archive.noPairs" })}
          screen="archive_gallery"
          reason="no_pairs"
          style={styles.emptyCard}
        />
      ) : null}

      {curationQuery.data.length ? (
        <View style={styles.curatedSection}>
          <Text style={[styles.curatedLabel, { color: colors.secondary }]}>
            QUIET PAIRS
          </Text>
          {curationQuery.data.map((pair) => {
            const draft = getDraftPair(pair);
            const candidatePhotos = pair.candidatePhotos ?? [];
            return (
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
                  style={[
                    styles.curatedCaption,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {pair.caption}
                </Text>
                <Text
                  style={[
                    styles.curatedSource,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {getInsightSourceLabel(pair.source).toUpperCase()}
                </Text>
                {candidatePhotos.length > 2 ? (
                  <View style={styles.pairEditor}>
                    <Text
                      accessibilityRole="button"
                      onPress={() =>
                        setDrafts((current) => ({
                          ...current,
                          [pair.plantId]: {
                            beforePhotoId: pair.beforePhotoId ?? null,
                            afterPhotoId: pair.afterPhotoId ?? null,
                          },
                        }))
                      }
                      style={[styles.curatedSource, { color: colors.primary }]}
                    >
                      Edit Pairing
                    </Text>
                    {candidatePhotos.map((photo, index) => (
                      <View key={photo.id} style={styles.pairButtonRow}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            setDrafts((current) => ({
                              ...current,
                              [pair.plantId]: {
                                ...draft,
                                beforePhotoId: photo.id,
                              },
                            }))
                          }
                          style={[
                            styles.pairButton,
                            {
                              backgroundColor:
                                draft.beforePhotoId === photo.id
                                  ? colors.primary
                                  : colors.surfaceContainerLowest,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.pairButtonLabel,
                              {
                                color:
                                  draft.beforePhotoId === photo.id
                                    ? colors.surfaceContainerLow
                                    : colors.primary,
                              },
                            ]}
                          >
                            {`Set before: ${index + 1}`}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            setDrafts((current) => ({
                              ...current,
                              [pair.plantId]: {
                                ...draft,
                                afterPhotoId: photo.id,
                              },
                            }))
                          }
                          style={[
                            styles.pairButton,
                            {
                              backgroundColor:
                                draft.afterPhotoId === photo.id
                                  ? colors.primary
                                  : colors.surfaceContainerLowest,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.pairButtonLabel,
                              {
                                color:
                                  draft.afterPhotoId === photo.id
                                    ? colors.surfaceContainerLow
                                    : colors.primary,
                              },
                            ]}
                          >
                            {`Set after: ${index + 1}`}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
                {draft.beforePhotoId && draft.afterPhotoId && user?.id ? (
                  <Text
                    accessibilityRole="button"
                    onPress={() => {
                      saveArchiveCurationOverride({
                        userId: user.id,
                        selection: {
                          plantId: pair.plantId,
                          beforePhotoId: draft.beforePhotoId!,
                          afterPhotoId: draft.afterPhotoId!,
                          caption: pair.caption,
                        },
                      })
                        .then(() => snackbar.success("Archive pairing saved."))
                        .catch(() =>
                          snackbar.warning("Archive pairing was not saved."),
                        );
                    }}
                    style={[styles.curatedSource, { color: colors.primary }]}
                  >
                    Save Pairing
                  </Text>
                ) : null}
              </View>

              <View style={styles.curatedImageRow}>
                <PlantPhotoImage
                  displayUri={pair.beforeUri}
                  plant={memorials.find(
                    (memorial) => memorial.plantId === pair.plantId,
                  )}
                  context="detail"
                  style={styles.curatedImage}
                  frameStyle={styles.curatedImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <PlantPhotoImage
                  displayUri={pair.afterUri}
                  plant={memorials.find(
                    (memorial) => memorial.plantId === pair.plantId,
                  )}
                  context="detail"
                  style={styles.curatedImage}
                  frameStyle={styles.curatedImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </View>
              </View>
            );
          })}
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
              <PlantPhotoImage
                plant={memorial}
                context="detail"
                style={styles.image}
                frameStyle={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
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
        <EmptyState
          content={getEmptyStateForContext({ context: "archive.noMemorials" })}
          screen="archive_gallery"
          reason="no_memorials"
          style={styles.emptyCard}
        />
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
  curatedSource: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
  },
  pairEditor: {
    gap: 8,
    paddingTop: 6,
  },
  pairButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  pairButton: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pairButtonLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
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
