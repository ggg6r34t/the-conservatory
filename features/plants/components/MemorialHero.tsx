import { LinearGradient } from "expo-linear-gradient";
import { Image as RNImage, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface MemorialHeroProps {
  photoUri?: string | null;
  displayName: string;
  speciesLabel: string;
  heroGradientColors: readonly [string, string, string];
  onBack: () => void;
}

const HERO_HEIGHT = 508;

export function MemorialHero({
  photoUri,
  displayName,
  speciesLabel,
  heroGradientColors,
  onBack,
}: MemorialHeroProps) {
  const { colors, spacing } = useTheme();

  return (
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
            onPress={onBack}
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

      {photoUri ? (
        <RNImage
          source={{ uri: photoUri }}
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
        <Text style={[styles.heroSpecies, { color: colors.onSurfaceVariant }]}>
          {speciesLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
