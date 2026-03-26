import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import type { PlantActivityItem } from "@/features/plants/services/plantActivityTimeline";

interface PlantActivityRowProps {
  item: PlantActivityItem;
}

function getIconTone(
  logType: PlantActivityItem["logType"],
  colors: ReturnType<typeof useTheme>["colors"],
) {
  switch (logType) {
    case "water":
      return {
        backgroundColor: colors.primaryFixed,
        iconColor: colors.primary,
      };
    case "repot":
      return {
        backgroundColor: colors.secondaryContainer,
        iconColor: colors.secondary,
      };
    case "inspect":
      return {
        backgroundColor: "#e5ebe0",
        iconColor: colors.primary,
      };
    case "prune":
    case "pest":
    case "mist":
    case "feed":
    case "note":
    default:
      return {
        backgroundColor: colors.surfaceContainerLow,
        iconColor: colors.primary,
      };
  }
}

export function PlantActivityRow({ item }: PlantActivityRowProps) {
  const { colors, spacing } = useTheme();
  const tone = getIconTone(item.logType, colors);

  return (
    <View style={[styles.row, { gap: spacing.sm }]}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: tone.backgroundColor,
          },
        ]}
      >
        <Icon
          family={item.iconFamily}
          name={item.icon}
          size={22}
          color={tone.iconColor}
        />
      </View>

      <View style={[styles.content, { gap: 4 }]}>
        <View style={[styles.header, { gap: spacing.sm }]}>
          <Text style={[styles.title, { color: colors.onSurface }]}>
            {item.title}
          </Text>
          <Text style={[styles.time, { color: colors.onSurfaceVariant }]}>
            {item.timeLabel}
          </Text>
        </View>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          {item.body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingTop: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  title: {
    flex: 1,
    fontFamily: "NotoSerif_700Bold",
    fontSize: 21,
    lineHeight: 27,
  },
  time: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
});
