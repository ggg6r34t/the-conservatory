import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { MemorialEntrySheet } from "@/features/plants/components/MemorialEntrySheet";
import { useGraveyard } from "@/features/plants/hooks/useGraveyard";
import { usePlant } from "@/features/plants/hooks/usePlant";
import { useUpdateGraveyardMemorial } from "@/features/plants/hooks/useUpdateGraveyardMemorial";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";
import { shadowScale } from "@/styles/shadows";
import type { Photo } from "@/types/models";

// ─── helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "255, 255, 255";
}

function formatYearRange(createdAt: string, archivedAt: string) {
  const start = new Date(createdAt).getFullYear();
  const end = new Date(archivedAt).getFullYear();
  return start === end ? String(start) : `${start} — ${end}`;
}

function buildMemorialQuote(
  memorialNote: string | null | undefined,
  plantNotes: string | null | undefined,
) {
  return (
    memorialNote?.trim() ??
    plantNotes?.trim() ??
    "Quietly remembered as part of your conservatory."
  );
}

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

// ─── screen ───────────────────────────────────────────────────────────────────

export default function MemorialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const graveyardQuery = useGraveyard();
  const memorial = (graveyardQuery.data ?? []).find((m) => m.id === id) ?? null;

  const plantQuery = usePlant(memorial?.plantId ?? "");
  const photos: Photo[] = plantQuery.data?.photos ?? [];

  const updateMemorial = useUpdateGraveyardMemorial();
  const alert = useAlert();
  const snackbar = useSnackbar();
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const displayName = memorial?.nickname ?? memorial?.name ?? "—";
  const speciesLabel = memorial?.speciesName ?? "";
  const yearRange = memorial
    ? formatYearRange(memorial.createdAt, memorial.archivedAt)
    : "";
  const causeLabel = memorial?.causeOfPassing?.trim() || null;
  const memorialQuote = memorial
    ? buildMemorialQuote(memorial.memorialNote, memorial.plantNotes)
    : "";
  const heroGradientColors = [
    "transparent",
    `rgba(${hexToRgb(colors.surface)}, 0.5)`,
    colors.surface,
  ] as const;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      {memorial ? (
        <MemorialEntrySheet
          visible={editSheetOpen}
          memorial={memorial}
          loading={updateMemorial.isPending}
          onClose={() => {
            if (!updateMemorial.isPending) {
              setEditSheetOpen(false);
            }
          }}
          onConfirm={async (input) => {
            try {
              await updateMemorial.mutateAsync(input);
              setEditSheetOpen(false);
              snackbar.success("Memorial saved.");
            } catch (error) {
              await alert.show({
                variant: "error",
                title: "Unable to save memorial",
                message: error instanceof Error ? error.message : "Try again.",
                primaryAction: { label: "Close", tone: "danger" },
              });
            }
          }}
        />
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View
            style={[
              styles.heroTopBarOverlay,
              {
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md,
              },
            ]}
          >
            <View style={styles.topBarLeft}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={10}
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Icon
                  family="MaterialCommunityIcons"
                  name="arrow-left"
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
              <Text style={[styles.topBarTitle, { color: colors.primary }]}>
                Graveyard
              </Text>
            </View>
          </View>

          {memorial?.primaryPhotoUri ? (
            <RNImage
              source={{ uri: memorial.primaryPhotoUri }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]} />
          )}
          <LinearGradient
            colors={heroGradientColors}
            locations={[0.3, 0.65, 1]}
            style={styles.heroGradient}
          />
          <View
            style={[
              styles.heroOverlay,
              {
                paddingHorizontal: spacing.lg,
                paddingBottom: spacing.lg,
              },
            ]}
          >
            <Text style={[styles.departedLabel, { color: colors.secondary }]}>
              THE DEPARTED
            </Text>
            <Text style={[styles.heroName, { color: colors.primary }]}>
              {displayName}
            </Text>
            <Text
              style={[styles.heroSpecies, { color: colors.onSurfaceVariant }]}
            >
              {speciesLabel}
            </Text>
          </View>
        </View>

        {/* ── Memorial stats card ── */}
        {memorial ? (
          <View
            style={[
              styles.statsCard,
              {
                backgroundColor: colors.surfaceContainerLowest,
                marginHorizontal: spacing.lg,
              },
            ]}
          >
            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text
                  style={[styles.statLabel, { color: colors.onSurfaceVariant }]}
                >
                  DURATION OF LIFE
                </Text>
                <Text style={[styles.statValue, { color: colors.onSurface }]}>
                  {yearRange}
                </Text>
              </View>

              <View style={styles.statBlockEnd}>
                <Text
                  style={[styles.statLabel, { color: colors.onSurfaceVariant }]}
                >
                  FINAL CHAPTER
                </Text>
                {causeLabel ? (
                  <View
                    style={[
                      styles.causeChip,
                      { backgroundColor: colors.secondaryContainer },
                    ]}
                  >
                    <Text
                      style={[
                        styles.causeChipLabel,
                        { color: colors.onSecondaryContainer },
                      ]}
                    >
                      {causeLabel}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.statValue, { color: colors.onSurface }]}>
                    —
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {/* ── The Lesson ── */}
        {memorialQuote ? (
          <View
            style={[{ marginTop: spacing.xxl, paddingHorizontal: spacing.lg }]}
          >
            <View style={styles.lessonRow}>
              <Icon
                name="format-quote-open"
                size={36}
                color={colors.primaryFixed}
                style={styles.quoteIcon}
              />
              <View style={styles.lessonContent}>
                <Text
                  style={[
                    styles.lessonHeading,
                    { color: colors.primaryContainer },
                  ]}
                >
                  THE LESSON
                </Text>
                <View
                  style={[
                    styles.quoteBlock,
                    { borderLeftColor: colors.primaryFixed },
                  ]}
                >
                  <Text
                    style={[
                      styles.quoteText,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    &ldquo;{memorialQuote}&rdquo;
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Their Best Days (filmstrip) ── */}
        {photos.length > 0 ? (
          <View style={[styles.filmstripSection, { marginTop: spacing.xxl }]}>
            <View
              style={[
                styles.filmstripHeader,
                { paddingHorizontal: spacing.lg },
              ]}
            >
              <Text style={[styles.filmstripTitle, { color: colors.primary }]}>
                Their Best Days
              </Text>
              <Text
                style={[
                  styles.filmstripCount,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {photos.length} ARCHIVED{" "}
                {photos.length === 1 ? "MOMENT" : "MOMENTS"}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.filmstrip,
                { paddingHorizontal: spacing.lg },
              ]}
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
                            {
                              backgroundColor: colors.surfaceContainerLow,
                            },
                          ]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.filmCaption,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {formatPhotoDate(photo)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View
          style={[
            styles.footer,
            { marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
          ]}
        >
          <View
            style={[
              styles.footerRule,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          />
          <View style={styles.footerRememberedRow}>
            <Icon name="heart" size={16} color={colors.onSurfaceVariant + 90} />
            <Text
              style={[
                styles.footerRemembered,
                { color: colors.onSurfaceVariant },
              ]}
            >
              Gently Remembered
            </Text>
          </View>
          {memorial ? (
            <SecondaryButton
              label="Restore Journal"
              backgroundColor={colors.surfaceContainerLow}
              textColor={colors.primary}
              onPress={() => setEditSheetOpen(true)}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const HERO_HEIGHT = 508;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  // Hero
  hero: {
    height: HERO_HEIGHT,
    marginTop: 0,
    position: "relative",
    overflow: "hidden",
  },
  heroTopBarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    filter: [{ grayscale: 1 }, { contrast: 1.1 }],
  } as object,
  heroFallback: {
    backgroundColor: "#20201d",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    gap: 6,
  },
  departedLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
  },
  heroName: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 48,
    lineHeight: 58,
  },
  heroSpecies: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 16,
    lineHeight: 24,
  },
  // Stats card
  statsCard: {
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginTop: -20,
    zIndex: 10,
    ...shadowScale.subtleSurface,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  statBlock: {
    gap: 6,
  },
  statBlockEnd: {
    gap: 6,
    alignItems: "flex-end",
  },
  statLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
  },
  statValue: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  causeChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  causeChipLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
  },
  // The Lesson
  lessonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  quoteIcon: {
    opacity: 0.22,
    marginTop: 2,
  },
  lessonContent: {
    flex: 1,
    gap: 16,
  },
  lessonHeading: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    fontStyle: "italic",
  },
  quoteBlock: {
    borderLeftWidth: 2,
    paddingLeft: 16,
  },
  quoteText: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 20,
    lineHeight: 34,
  },
  // Filmstrip
  filmstripSection: {
    gap: 16,
  },
  filmstripHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  filmstripTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  filmstripCount: {
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
  filmCaption: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  // Footer
  footer: {
    paddingBottom: 24,
    alignItems: "center",
    gap: 24,
  },
  footerRule: {
    width: "100%",
    height: 1,
    opacity: 0.55,
  },
  footerRememberedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerRemembered: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.6,
  },
});
