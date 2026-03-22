import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import {
  Image as RNImage,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { useTheme } from "@/components/design-system/useTheme";
import type { GraveyardPlantListItem } from "@/features/plants/api/plantsClient";
import { useGraveyard } from "@/features/plants/hooks/useGraveyard";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";

function formatYearRange(memorial: GraveyardPlantListItem) {
  const plantedYear = new Date(memorial.createdAt).getFullYear();
  const archivedYear = new Date(memorial.archivedAt).getFullYear();
  return `${plantedYear}-${archivedYear}`;
}

function buildMemorialNote(memorial: GraveyardPlantListItem) {
  return (
    memorial.memorialNote?.trim() ??
    memorial.plantNotes?.trim() ??
    "Quietly remembered as part of your conservatory."
  );
}

function buildShortReflection(memorial: GraveyardPlantListItem, maxLength = 92) {
  const note = buildMemorialNote(memorial);
  return note.length > maxLength ? `${note.slice(0, maxLength - 3).trimEnd()}...` : note;
}

function buildCauseLabel(memorial: GraveyardPlantListItem) {
  if (!memorial.causeOfPassing?.trim()) {
    return memorial.speciesName;
  }

  return memorial.causeOfPassing;
}

function getMemorialAt(
  memorials: GraveyardPlantListItem[],
  index: number,
): GraveyardPlantListItem | null {
  if (!memorials.length) {
    return null;
  }

  return memorials[index] ?? memorials[index % memorials.length] ?? memorials[0];
}

function GrayscaleImage({
  uri,
  style,
  tintOverlay = false,
}: {
  uri?: string | null;
  style: object;
  tintOverlay?: boolean;
}) {
  if (!uri) {
    return <View style={[style, styles.imageFallback]} />;
  }

  return (
    <View style={style}>
      <RNImage
        source={{ uri }}
        style={styles.nativeImage}
        resizeMode="cover"
      />
      <View style={styles.grayscaleOverlay} />
      {tintOverlay ? <View style={styles.darkImageOverlay} /> : null}
    </View>
  );
}

function PlainImage({
  uri,
  style,
  contentFit = "cover",
}: {
  uri?: string | null;
  style: object;
  contentFit?: "cover" | "contain";
}) {
  if (!uri) {
    return <View style={[style, styles.imageFallback]} />;
  }

  return <ExpoImage source={{ uri }} style={style} contentFit={contentFit} />;
}

export default function GraveyardScreen() {
  const { colors, spacing } = useTheme();
  const graveyardQuery = useGraveyard();
  const { onRefresh, refreshing } = usePullToRefreshSync();
  const memorials = graveyardQuery.data ?? [];

  const featuredMemorial = getMemorialAt(memorials, 0);
  const reflectionMemorial = getMemorialAt(memorials, 1);
  const tributeMemorial = getMemorialAt(memorials, 0);
  const tributeCompanion = getMemorialAt(memorials, 1);
  const compactMemorial = getMemorialAt(memorials, 1) ?? getMemorialAt(memorials, 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: 112,
          },
        ]}
      >
        <AppHeader title="Graveyard" subtitle="Memorial garden" />

        <Text style={[styles.intro, { color: colors.onSurfaceVariant }]}>
          A quiet space to honor the green companions that have returned to the
          earth. Every wilted leaf is a lesson learned for the next season.
        </Text>

        {featuredMemorial ? (
          <View
            style={[
              styles.featuredCard,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <View style={styles.featuredImageWrap}>
              <GrayscaleImage
                uri={featuredMemorial.primaryPhotoUri}
                style={styles.featuredImage}
                tintOverlay
              />
              <View
                style={[
                  styles.featuredAccent,
                  { backgroundColor: colors.secondaryContainer },
                ]}
              />
            </View>

            <Text style={[styles.featuredLabel, { color: colors.secondary }]}>
              THE DEPARTED
            </Text>
            <Text style={[styles.featuredName, { color: colors.primary }]}>
              {featuredMemorial.name}
            </Text>
            <Text
              style={[styles.featuredMeta, { color: colors.onSurfaceVariant }]}
            >
              {`${featuredMemorial.speciesName} • ${formatYearRange(featuredMemorial)}`}
            </Text>

            <View
              style={[
                styles.noteCard,
                { backgroundColor: colors.surfaceContainerLowest },
              ]}
            >
              <Text style={[styles.noteTitle, { color: colors.onSurfaceVariant }]}>
                WHAT I LEARNED
              </Text>
              <Text style={[styles.noteBody, { color: colors.onSurfaceVariant }]}>
                {buildShortReflection(featuredMemorial, 112)}
              </Text>
            </View>

            <View style={styles.featuredFooter}>
              <MaterialCommunityIcons
                name="heart"
                size={10}
                color={colors.onSurface}
              />
              <Text
                style={[styles.featuredFooterLabel, { color: colors.onSurface }]}
              >
                Gently Remembered
              </Text>
            </View>
          </View>
        ) : null}

        {reflectionMemorial ? (
          <View
            style={[
              styles.reflectionCard,
              { backgroundColor: "#fde8de" },
            ]}
          >
            <View
              style={[
                styles.reflectionImageWrap,
                { backgroundColor: colors.surfaceContainerLowest },
              ]}
            >
              <GrayscaleImage
                uri={reflectionMemorial.primaryPhotoUri}
                style={styles.reflectionImage}
              />
            </View>
            <Text style={[styles.reflectionName, { color: colors.primary }]}>
              {reflectionMemorial.name}
            </Text>
            <Text style={[styles.reflectionBody, { color: colors.onSurfaceVariant }]}>
              {buildShortReflection(reflectionMemorial, 98)}
            </Text>
          </View>
        ) : null}

        {tributeMemorial ? (
          <View
            style={[
              styles.tributeCard,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <View style={styles.avatarCluster}>
              <View style={styles.avatarFrame}>
                <GrayscaleImage
                  uri={tributeMemorial.primaryPhotoUri}
                  style={styles.avatarImage}
                />
              </View>
              {tributeCompanion ? (
                <View
                  style={[
                    styles.avatarFrame,
                    styles.avatarFrameOffset,
                    { backgroundColor: colors.surfaceContainerLowest },
                  ]}
                >
                  <GrayscaleImage
                    uri={tributeCompanion.primaryPhotoUri}
                    style={styles.avatarImage}
                  />
                </View>
              ) : null}
            </View>

            <Text style={[styles.tributeName, { color: colors.primary }]}>
              {tributeMemorial.name}
            </Text>
            <Text style={[styles.tributeQuote, { color: colors.onSurfaceVariant }]}>
              "{buildShortReflection(tributeMemorial, 64)}"
            </Text>

            <Pressable accessibilityRole="button" style={styles.memorialButtonPressable}>
              <LinearGradient
                colors={[colors.primary, colors.primaryContainer]}
                start={{ x: 0.12, y: 0.08 }}
                end={{ x: 0.88, y: 0.92 }}
                style={styles.memorialButton}
              >
                <Text style={styles.memorialButtonLabel}>Add Memorial</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}

        {compactMemorial ? (
          <View
            style={[
              styles.compactCard,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <GrayscaleImage
              uri={compactMemorial.primaryPhotoUri}
              style={styles.compactImage}
            />

            <View style={styles.compactCopy}>
              <View style={styles.compactHeader}>
                <Text style={[styles.compactName, { color: colors.onSurface }]}>
                  {compactMemorial.name}
                </Text>
                <Text
                  style={[styles.compactSpecies, { color: colors.secondary }]}
                >
                  {buildCauseLabel(compactMemorial).toUpperCase()}
                </Text>
              </View>

              <View
                style={[
                  styles.compactNote,
                  { backgroundColor: colors.surfaceContainerLowest },
                ]}
              >
                <Text
                  style={[styles.compactNoteText, { color: colors.onSurfaceVariant }]}
                >
                  "{buildShortReflection(compactMemorial, 82)}"
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.quoteCard,
            { backgroundColor: colors.tertiaryContainer },
          ]}
        >
          <Text style={[styles.quoteMark, { color: colors.primaryFixed }]}>”</Text>
          <Text style={[styles.quoteText, { color: colors.primaryFixed }]}>
            "A garden is a grand teacher. It teaches patience and careful
            watchfulness; it teaches industry and thrift; above all it teaches
            entire trust."
          </Text>
          <Text style={[styles.quoteAuthor, { color: colors.primaryFixed }]}>
            — GERTRUDE JEKYLL
          </Text>
        </View>

        <View style={styles.closingBlock}>
          <Text style={[styles.closingTitle, { color: colors.onSurface }]}>
            Don&apos;t be discouraged, gardener.
          </Text>
          <Text style={[styles.closingBody, { color: colors.onSurfaceVariant }]}>
            Every master gardener has a secret graveyard. It&apos;s the soil from
            which expertise grows.
          </Text>
        </View>
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
  intro: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 31,
    maxWidth: 324,
  },
  nativeImage: {
    width: "100%",
    height: "100%",
    filter: [{ grayscale: 1 }],
  },
  grayscaleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  darkImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 16, 16, 0.32)",
  },
  imageFallback: {
    backgroundColor: "#e9e6df",
  },
  featuredCard: {
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 10,
  },
  featuredImageWrap: {
    borderRadius: 18,
    overflow: "hidden",
    height: 248,
    position: "relative",
    backgroundColor: "#20201d",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredAccent: {
    position: "absolute",
    top: -10,
    right: -12,
    width: 26,
    height: 26,
    borderRadius: 13,
    opacity: 0.72,
  },
  featuredLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1.9,
  },
  featuredName: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 18,
    lineHeight: 26,
  },
  featuredMeta: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 11,
    lineHeight: 18,
  },
  noteCard: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  noteTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  noteBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  featuredFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featuredFooterLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    lineHeight: 14,
  },
  reflectionCard: {
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  reflectionImageWrap: {
    height: 188,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  reflectionImage: {
    width: "100%",
    height: "100%",
  },
  reflectionName: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 31,
    lineHeight: 38,
  },
  reflectionBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  tributeCard: {
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
    gap: 12,
  },
  avatarCluster: {
    height: 56,
    width: 96,
    position: "relative",
    justifyContent: "center",
  },
  avatarFrame: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#1e211d",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  avatarFrameOffset: {
    position: "absolute",
    right: 0,
    top: 0,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  tributeName: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 18,
    lineHeight: 25,
    textAlign: "center",
  },
  tributeQuote: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 234,
  },
  memorialButtonPressable: {
    alignSelf: "center",
  },
  memorialButton: {
    minHeight: 42,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(27, 28, 25, 0.04)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  memorialButtonLabel: {
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
  },
  compactCard: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    minHeight: 108,
  },
  compactImage: {
    width: 66,
    height: 66,
    borderRadius: 12,
  },
  compactCopy: {
    flex: 1,
    gap: 6,
  },
  compactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },
  compactName: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  compactSpecies: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    lineHeight: 14,
    letterSpacing: 1.2,
    maxWidth: 86,
    textAlign: "right",
  },
  compactNote: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  compactNoteText: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 11,
    lineHeight: 17,
  },
  quoteCard: {
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 34,
    alignItems: "center",
    gap: 8,
  },
  quoteMark: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 32,
    lineHeight: 34,
  },
  quoteText: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 17,
    lineHeight: 29,
    textAlign: "center",
  },
  quoteAuthor: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  closingBlock: {
    paddingTop: 18,
    gap: 10,
    alignItems: "center",
  },
  closingTitle: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center",
    maxWidth: 220,
  },
  closingBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 300,
  },
});
