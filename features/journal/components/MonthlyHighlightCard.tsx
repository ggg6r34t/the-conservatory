import { Image } from "expo-image";
import { Link } from "expo-router";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import type { MonthlyHighlightCardItem } from "@/features/journal/utils/buildMonthlyHighlightSections";

export function MonthlyHighlightCard({
  highlight,
  style,
}: {
  highlight: MonthlyHighlightCardItem;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  return (
    <Link href={`/plant/${highlight.id}` as const} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${highlight.name}`}
        style={[
          styles.card,
          style,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <View
          style={[
            styles.imageFrame,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
        >
          <Image
            source={{ uri: highlight.imageUri }}
            style={styles.image}
            contentFit="cover"
            transition={120}
          />
          <View
            style={[
              styles.dateChip,
              { backgroundColor: "rgba(255,255,255,0.88)" },
            ]}
          >
            <Text style={[styles.dateText, { color: colors.onSurface }]}>
              {highlight.dateLabel}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.copy,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
        >
          <Text style={[styles.title, { color: colors.onSurface }]}>
            {highlight.name}
          </Text>
          <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
            {highlight.metadata}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 26,
    overflow: "hidden",
  },
  imageFrame: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  dateChip: {
    position: "absolute",
    top: 14,
    left: 14,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dateText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1,
  },
  copy: {
    minHeight: 80,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 4,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 18,
    lineHeight: 23,
  },
  meta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
});
