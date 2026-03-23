import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import type { WalkthroughSlide } from "@/features/onboarding/constants/walkthroughSlides";

interface WalkthroughSlidePanelProps {
  slide: WalkthroughSlide;
  onSkip: () => void;
  isSkipDisabled?: boolean;
}

export function WalkthroughSlidePanel({
  slide,
  onSkip,
  isSkipDisabled = false,
}: WalkthroughSlidePanelProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.panel}>
      <View
        style={[styles.heroCard, slide.theme === "dark" && styles.heroCardDark]}
      >
        <View style={styles.topOverlay}>
          {slide.showBrand ? (
            <Text style={styles.brandText}>LEAF_RK Botanical</Text>
          ) : (
            <View style={styles.overlaySpacer} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip walkthrough slides"
            disabled={isSkipDisabled}
            onPress={onSkip}
            style={styles.skipAction}
          >
            <Text
              style={[
                styles.skipText,
                {
                  color:
                    slide.theme === "dark"
                      ? "rgba(7, 102, 84, 0.9)"
                      : colors.primary,
                },
              ]}
            >
              SKIP
            </Text>
          </Pressable>
        </View>

        <Image
          source={slide.imageSource}
          style={[
            styles.heroImage,
            slide.imagePosition,
            slide.imageScale
              ? { transform: [{ scale: slide.imageScale }] }
              : null,
          ]}
          contentFit="cover"
          contentPosition="center"
          accessibilityIgnoresInvertColors
        />

        {slide.theme === "dark" ? (
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
          {
            backgroundColor:
              slide.theme === "dark" ? colors.surfaceBright : colors.surface,
          },
        ]}
      >
        <View style={styles.copyBlock}>
          <View style={styles.eyebrowRow}>
            <View
              style={[
                styles.eyebrowLine,
                { backgroundColor: colors.secondary },
              ]}
            />
            <Text style={[styles.eyebrow, { color: colors.secondary }]}>
              {slide.eyebrow}
            </Text>
          </View>

          {slide.titleAccent ? (
            <Text style={[styles.title, { color: colors.onSurface }]}>
              {slide.title.split(slide.titleAccent)[0]}
              <Text style={[styles.titleAccent, { color: colors.primary }]}>
                {slide.titleAccent}
              </Text>
            </Text>
          ) : (
            <Text style={[styles.title, { color: colors.onSurface }]}>
              {slide.title}
            </Text>
          )}

          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
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
    minHeight: 418,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    overflow: "hidden",
    backgroundColor: "#e7ebdf",
  },
  heroCardDark: {
    backgroundColor: "#101612",
  },
  topOverlay: {
    position: "absolute",
    zIndex: 3,
    top: 18,
    left: 20,
    right: 20,
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overlaySpacer: {
    minWidth: 1,
  },
  brandText: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 19,
    lineHeight: 24,
    color: "rgba(7, 102, 84, 0.86)",
  },
  skipAction: {
    minHeight: 30,
    justifyContent: "center",
  },
  skipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 2,
  },
  heroImage: {
    position: "absolute",
    width: "126%",
    height: "118%",
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
    flex: 1,
    marginTop: -10,
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 8,
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
  titleAccent: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 35,
    lineHeight: 45,
  },
  body: {
    maxWidth: 330,
    fontFamily: "Manrope_500Medium",
    fontSize: 17,
    lineHeight: 29,
  },
});
