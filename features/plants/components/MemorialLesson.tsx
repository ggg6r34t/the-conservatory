import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface MemorialLessonProps {
  quote: string;
}

export function MemorialLesson({ quote }: MemorialLessonProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.wrap, { marginTop: spacing.xxl, paddingHorizontal: spacing.lg }]}>
      <View style={styles.lessonRow}>
        <Icon
          name="format-quote-open"
          size={36}
          color={colors.primaryFixed}
          style={styles.quoteIcon}
        />
        <View style={styles.lessonContent}>
          <Text
            style={[styles.lessonHeading, { color: colors.primaryContainer }]}
          >
            THE LESSON
          </Text>
          <View
            style={[
              styles.quoteBlock,
              { borderLeftColor: colors.primaryFixed },
            ]}
          >
            <Text style={[styles.quoteText, { color: colors.onSurfaceVariant }]}>
              &ldquo;{quote}&rdquo;
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
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
});
