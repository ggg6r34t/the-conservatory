import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import type { WalkthroughSlide } from "@/features/onboarding/constants/walkthroughSlides";

const HERO_MIN_HEIGHT = 418;
const CONTENT_CARD_MIN_HEIGHT = 336;
const CARD_RADIUS = 42;

interface WalkthroughSlidePanelProps {
  slide: WalkthroughSlide;
}

export function WalkthroughSlidePanel({ slide }: WalkthroughSlidePanelProps) {
  const { colors } = useTheme();
  const isGallerySlide = slide.id === "gallery";
  const isCareRhythmSlide = slide.id === "care-rhythm";
  const isGraveyardSlide = slide.id === "graveyard";
  const isOverlapLayout = slide.layout === "overlap";

  return (
    <View style={styles.panel}>
      <View
        style={[
          styles.heroCard,
          isOverlapLayout ? styles.overlapHeroCard : styles.stackedHeroCard,
          isGallerySlide && styles.galleryHeroCard,
          isCareRhythmSlide && styles.careRhythmHeroCard,
          isGraveyardSlide && styles.graveyardHeroCard,
        ]}
      >
        <Image
          source={slide.imageSource}
          style={[
            styles.heroImage,
            isGallerySlide && styles.galleryHeroImage,
            isCareRhythmSlide && styles.careRhythmHeroImage,
            isGraveyardSlide && styles.graveyardHeroImage,
            !isGallerySlide && !isCareRhythmSlide && slide.imagePosition,
            slide.imageScale
              ? { transform: [{ scale: slide.imageScale }] }
              : null,
          ]}
          contentFit="cover"
          contentPosition="center"
          accessibilityIgnoresInvertColors
        />

        {slide.id === "graveyard" ? (
          <LinearGradient
            colors={["rgba(11,15,12,0.82)", "rgba(11,15,12,0.08)"]}
            start={{ x: 0.52, y: 0.98 }}
            end={{ x: 0.18, y: 0.12 }}
            style={styles.darkOverlay}
          />
        ) : null}

        {slide.badge ? (
          <View style={styles.heroBadge}>
            <View
              style={[
                styles.badgeIconWrap,
                { backgroundColor: colors.primary },
              ]}
            >
              <Icon
                family="MaterialIcons"
                name={slide.badge.icon}
                size={22}
                color={colors.surfaceBright}
              />
            </View>
            <View style={styles.badgeCopy}>
              <Text
                style={[
                  styles.badgeEyebrow,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {slide.badge.eyebrow}
              </Text>
              <Text style={[styles.badgeTitle, { color: colors.onSurface }]}>
                {slide.badge.title}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.contentCard,
          isOverlapLayout ? styles.overlapContentCard : styles.stackedContentCard,
          isGallerySlide && styles.galleryContentCard,
          isCareRhythmSlide && styles.careRhythmContentCard,
          isGraveyardSlide && styles.graveyardContentCard,
          {
            backgroundColor: colors.surface,
          },
        ]}
      >
        <View style={styles.copyBlock}>
          <View style={styles.eyebrowRow}>
            <View
              style={[
                styles.eyebrowLine,
                isGraveyardSlide && styles.graveyardEyebrowLine,
                { backgroundColor: colors.secondary },
              ]}
            />
            <Text style={[styles.eyebrow, { color: colors.secondary }]}>
              {slide.eyebrow}
            </Text>
          </View>

          {slide.titleAccent ? (
            <Text
              style={[
                styles.title,
                isGraveyardSlide && styles.graveyardTitle,
                { color: colors.onSurface },
              ]}
            >
              {slide.title.split(slide.titleAccent)[0]}
              <Text
                style={[
                  styles.titleAccent,
                  isGraveyardSlide && styles.graveyardTitleAccent,
                  { color: colors.primary },
                ]}
              >
                {slide.titleAccent}
              </Text>
            </Text>
          ) : (
            <Text
              style={[
                styles.title,
                isGraveyardSlide && styles.graveyardTitle,
                { color: colors.onSurface },
              ]}
            >
              {slide.title}
            </Text>
          )}

          <Text
            style={[
              styles.body,
              isGraveyardSlide && styles.graveyardBody,
              { color: colors.onSurfaceVariant },
            ]}
          >
            {slide.body}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  heroCard: {
    position: "relative",
    minHeight: HERO_MIN_HEIGHT,
    overflow: "hidden",
    backgroundColor: "#e7ebdf",
  },
  overlapHeroCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  stackedHeroCard: {
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
  },
  galleryHeroCard: {
    backgroundColor: "#dde4d8",
  },
  careRhythmHeroCard: {
    backgroundColor: "#dbe3dd",
  },
  graveyardHeroCard: {
    backgroundColor: "#111611",
  },
  heroImage: {
    position: "absolute",
    width: "126%",
    height: "118%",
  },
  galleryHeroImage: {
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
  },
  careRhythmHeroImage: {
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
  },
  graveyardHeroImage: {
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroBadge: {
    position: "absolute",
    right: 20,
    bottom: 22,
    left: 152,
    minHeight: 96,
    borderRadius: 30,
    backgroundColor: "rgba(228, 232, 223, 0.92)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  badgeIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCopy: {
    gap: 4,
    flex: 1,
  },
  badgeEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.4,
  },
  badgeTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 17,
    lineHeight: 22,
  },
  contentCard: {
    flexGrow: 0,
    minHeight: CONTENT_CARD_MIN_HEIGHT,
    paddingHorizontal: 40,
    paddingTop: 48,
    paddingBottom: 40,
  },
  overlapContentCard: {
    marginTop: -34,
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
  },
  stackedContentCard: {
    marginTop: 0,
  },
  galleryContentCard: {
  },
  careRhythmContentCard: {
    paddingTop: 36,
  },
  graveyardContentCard: {
  },
  copyBlock: {
    gap: 24,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  eyebrowLine: {
    width: 48,
    height: 2,
    borderRadius: 999,
  },
  graveyardEyebrowLine: {
    width: 32,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 3.6,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 35,
    lineHeight: 45,
  },
  graveyardTitle: {
    maxWidth: 300,
    fontFamily: "NotoSerif_400Regular",
    fontSize: 36,
    lineHeight: 41,
    letterSpacing: -0.2,
  },
  titleAccent: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 35,
    lineHeight: 45,
  },
  graveyardTitleAccent: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 36,
    lineHeight: 41,
  },
  body: {
    maxWidth: 330,
    fontFamily: "Manrope_500Medium",
    fontSize: 17,
    lineHeight: 29,
  },
  graveyardBody: {
    maxWidth: 280,
    fontSize: 18,
    lineHeight: 29,
  },
});
