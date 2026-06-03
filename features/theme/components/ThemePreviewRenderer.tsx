import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ThemeDefinition } from "@/features/theme/types";

interface ThemePreviewRendererProps {
  theme: ThemeDefinition;
}

export const ThemePreviewRenderer = memo(function ThemePreviewRenderer({
  theme,
}: ThemePreviewRendererProps) {
  const { preview } = theme;

  return (
    <View
      style={[
        styles.previewCard,
        {
          backgroundColor: preview.surfaces.background,
          borderColor: preview.surfaces.border,
        },
      ]}
    >
      <View style={styles.previewHeader}>
        <Text
          style={[styles.plantTitle, { color: preview.surfaces.plantTitle }]}
        >
          {preview.plantTitle}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: preview.surfaces.statusBackground },
          ]}
        >
          <Text
            style={[
              styles.statusLabel,
              { color: preview.surfaces.statusForeground },
            ]}
          >
            {preview.statusLabel.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.imageFrame}>
        <Image
          source={preview.image}
          style={[
            styles.previewImage,
            preview.imageOpacity ? { opacity: preview.imageOpacity } : null,
          ]}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
      </View>

      <View style={styles.placeholderGroup}>
        <View
          style={[
            styles.placeholderPrimary,
            { backgroundColor: preview.surfaces.placeholderPrimary },
          ]}
        />
        <View
          style={[
            styles.placeholderSecondary,
            { backgroundColor: preview.surfaces.placeholderSecondary },
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  previewCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  plantTitle: {
    flex: 1,
    fontFamily: "NotoSerif_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  imageFrame: {
    borderRadius: 12,
    overflow: "hidden",
    height: 128,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  placeholderGroup: {
    gap: 8,
  },
  placeholderPrimary: {
    height: 8,
    borderRadius: 999,
    width: "75%",
  },
  placeholderSecondary: {
    height: 8,
    borderRadius: 999,
    width: "50%",
  },
});
