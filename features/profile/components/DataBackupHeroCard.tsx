import { ImageBackground, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

export function DataBackupHeroCard() {
  const { colors } = useTheme();

  return (
    <ImageBackground
      source={require("@/assets/images/botanical-background.png")}
      imageStyle={styles.image}
      style={styles.card}
    >
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={[styles.eyebrow, { color: colors.surfaceBright }]}>
          SECURITY & PRESERVATION
        </Text>
        <Text style={[styles.title, { color: colors.surfaceBright }]}>
          Protect your living archive
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 228,
    borderRadius: 28,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  image: {
    borderRadius: 28,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 50, 32, 0.42)",
  },
  content: {
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 36,
    maxWidth: 260,
  },
});
