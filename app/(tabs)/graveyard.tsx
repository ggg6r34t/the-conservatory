import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  RefreshControl,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/common/Icon/Icon";
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

function formatAddedMonthYear(memorial: GraveyardPlantListItem) {
  return new Date(memorial.archivedAt)
    .toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

function buildMemorialNote(memorial: GraveyardPlantListItem) {
  return (
    memorial.memorialNote?.trim() ??
    memorial.plantNotes?.trim() ??
    "Quietly remembered as part of your conservatory."
  );
}

function buildShortReflection(
  memorial: GraveyardPlantListItem,
  maxLength = 92,
) {
  const note = buildMemorialNote(memorial);
  return note.length > maxLength
    ? `${note.slice(0, maxLength - 3).trimEnd()}...`
    : note;
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

  return (
    memorials[index] ?? memorials[index % memorials.length] ?? memorials[0]
  );
}

function GrayscaleImage({
  uri,
  style,
}: {
  uri?: string | null;
  style: object;
}) {
  if (!uri) {
    return <View style={[style, styles.imageFallback]} />;
  }

  return (
    <View style={style}>
      <RNImage source={{ uri }} style={styles.nativeImage} resizeMode="cover" />
    </View>
  );
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
  const compactMemorial =
    getMemorialAt(memorials, 1) ?? getMemorialAt(memorials, 0);

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
              <Text
                style={[styles.noteTitle, { color: colors.onSurfaceVariant }]}
              >
                WHAT I LEARNED
              </Text>
              <Text
                style={[styles.noteBody, { color: colors.onSurfaceVariant }]}
              >
                {buildShortReflection(featuredMemorial, 112)}
              </Text>
            </View>

            <View style={styles.featuredFooter}>
              <Icon name="heart" size={11} color={colors.onSurface} />
              <Text
                style={[
                  styles.featuredFooterLabel,
                  { color: colors.onSurface },
                ]}
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
              {
                backgroundColor: "#fde8de",
                borderColor: "rgba(148, 73, 46, 0.12)",
              },
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
            <Text
              style={[
                styles.reflectionBody,
                { color: colors.onSurfaceVariant },
              ]}
            >
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
            <Text
              style={[styles.tributeQuote, { color: colors.onSurfaceVariant }]}
            >
              &quot;{buildShortReflection(tributeMemorial, 64)}&quot;
            </Text>

            <Pressable
              accessibilityRole="button"
              style={styles.memorialButtonPressable}
            >
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
            <View style={styles.compactTopRow}>
              <View style={styles.compactImageFrame}>
                <GrayscaleImage
                  uri={compactMemorial.primaryPhotoUri}
                  style={styles.compactImage}
                />
              </View>

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
            </View>

            <View
              style={[
                styles.compactNote,
                { backgroundColor: colors.surfaceContainerLowest },
              ]}
            >
              <Icon
                name="format-quote-open"
                size={24}
                color={colors.primaryFixed}
                style={styles.compactQuoteIcon}
              />
              <Text
                style={[
                  styles.compactNoteText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                &quot;{buildShortReflection(compactMemorial, 112)}&quot;
              </Text>
            </View>

            <Text
              style={[styles.compactDate, { color: colors.onSurfaceVariant }]}
            >
              {`ADDED ${formatAddedMonthYear(compactMemorial)}`}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.quoteCard,
            { backgroundColor: colors.tertiaryContainer },
          ]}
        >
          <Icon
            name="format-quote-open"
            size={40}
            color={colors.primaryFixed}
            style={styles.quoteIcon}
          />
          <Text style={[styles.quoteText, { color: colors.primaryFixed }]}>
            &quot;A garden is a grand teacher. It teaches patience and careful
            watchfulness; it teaches industry and thrift; above all it teaches
            entire trust.&quot;
          </Text>
          <Text style={[styles.quoteAuthor, { color: colors.primaryFixed }]}>
            — GERTRUDE JEKYLL
          </Text>
        </View>

        <View style={styles.closingBlock}>
          <View
            style={[
              styles.closingRule,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          />
          <Text style={[styles.closingTitle, { color: colors.onSurface }]}>
            Don&apos;t be discouraged, gardener.
          </Text>
          <Text
            style={[styles.closingBody, { color: colors.onSurfaceVariant }]}
          >
            Every master gardener has a secret graveyard. It&apos;s the soil
            from which expertise grows.
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
    fontSize: 17,
    lineHeight: 31,
    maxWidth: 320,
  },
  nativeImage: {
    width: "100%",
    height: "100%",
    filter: [{ grayscale: 1 }, { sepia: 0.2 }, { brightness: 0.62 }],
  },
  imageFallback: {
    backgroundColor: "#e9e6df",
  },
  featuredCard: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 14,
  },
  featuredImageWrap: {
    borderRadius: 18,
    overflow: "hidden",
    height: 336,
    position: "relative",
    backgroundColor: "#20201d",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1.8,
  },
  featuredName: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 20,
    lineHeight: 28,
  },
  featuredMeta: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 13,
    lineHeight: 20,
  },
  noteCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  noteTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1.25,
  },
  noteBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  featuredFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featuredFooterLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  reflectionCard: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 14,
    borderWidth: 1,
    minHeight: 394,
  },
  reflectionImageWrap: {
    height: 252,
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
    fontSize: 20,
    lineHeight: 28,
  },
  reflectionBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  tributeCard: {
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
    gap: 14,
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
    fontSize: 20,
    lineHeight: 28,
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
    minWidth: 136,
    marginTop: 2,
  },
  memorialButton: {
    minHeight: 46,
    paddingHorizontal: 32,
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
    fontSize: 15,
  },
  compactCard: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 18,
    minHeight: 220,
  },
  compactTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
  },
  compactImage: {
    width: 88,
    height: 88,
    borderRadius: 14,
    overflow: "hidden",
  },
  compactImageFrame: {
    width: 96,
    height: 96,
    borderRadius: 18,
    padding: 4,
    backgroundColor: "#ffffff",
    shadowColor: "rgba(27, 28, 25, 0.08)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
  },
  compactCopy: {
    flex: 1,
    gap: 6,
  },
  compactHeader: {
    flex: 1,
    gap: 2,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: 6,
  },
  compactName: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 20,
    lineHeight: 28,
    textAlign: "right",
    maxWidth: 160,
  },
  compactSpecies: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.35,
    maxWidth: 110,
    textAlign: "right",
  },
  compactNote: {
    position: "relative",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 28,
  },
  compactQuoteIcon: {
    position: "absolute",
    top: 10,
    left: 12,
    opacity: 0.42,
  },
  compactNoteText: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 13,
    lineHeight: 22,
  },
  compactDate: {
    alignSelf: "flex-end",
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  quoteCard: {
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 34,
    alignItems: "center",
    gap: 8,
  },
  quoteIcon: {
    opacity: 0.6,
  },
  quoteText: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 22,
    lineHeight: 36,
    textAlign: "center",
  },
  quoteAuthor: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1.25,
  },
  closingBlock: {
    paddingTop: 20,
    gap: 12,
    alignItems: "center",
  },
  closingRule: {
    width: "100%",
    height: 1,
    opacity: 0.55,
    marginBottom: 18,
  },
  closingTitle: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 20,
    lineHeight: 30,
    textAlign: "center",
    maxWidth: 220,
  },
  closingBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 300,
  },
});
