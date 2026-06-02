import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import type { RoadmapItem } from "@/features/product-feedback/types";

type RoadmapSectionProps = {
  title: string;
  items: RoadmapItem[];
  onItemPress?: (item: RoadmapItem) => void;
};

export function RoadmapSection({
  title,
  items,
  onItemPress,
}: RoadmapSectionProps) {
  const { colors } = useTheme();

  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          disabled={!onItemPress}
          onPress={() => onItemPress?.(item)}
          style={[
            styles.card,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text style={[styles.itemTitle, { color: colors.primary }]}>
            {item.title}
          </Text>
          {item.description ? (
            <Text
              style={[styles.itemBody, { color: colors.onSurfaceVariant }]}
            >
              {item.description}
            </Text>
          ) : null}
          {item.releaseVersion ? (
            <Text style={[styles.version, { color: colors.secondary }]}>
              Version {item.releaseVersion}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  itemTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  itemBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
  version: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
