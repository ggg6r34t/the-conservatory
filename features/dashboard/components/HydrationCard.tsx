import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface HydrationCardProps {
  dueToday: number;
  overdue: number;
  nextCycleHours: number | null;
}

function countLabel(value: number) {
  const rounded = Math.max(0, Math.floor(value));
  const words = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
    "twenty",
  ] as const;

  if (rounded <= 20) {
    return words[rounded];
  }

  return String(rounded);
}

function capitalize(value: string) {
  if (!value.length) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function HydrationCard({
  dueToday,
  overdue,
  nextCycleHours,
}: HydrationCardProps) {
  const { colors } = useTheme();
  const dueTodayCount = Math.max(0, Math.floor(dueToday));
  const overdueCount = Math.max(0, Math.floor(overdue));
  const hasOverdue = overdueCount > 0;
  const hasNoTimeLeft = dueTodayCount === 0;

  let statusCopy = "";

  if (hasOverdue) {
    statusCopy = `${capitalize(countLabel(overdueCount))} ${overdueCount === 1 ? "specimen needs" : "specimens need"} attention today. ${capitalize(countLabel(dueTodayCount))} ${dueTodayCount === 1 ? "care window opens" : "care windows open"} in the next day.`;
  } else if (hasNoTimeLeft) {
    statusCopy = "All specimens are comfortably hydrated.";
  } else {
    statusCopy = `${capitalize(countLabel(dueTodayCount))} ${dueTodayCount === 1 ? "specimen is" : "specimens are"} due for care within the next day.`;
  }

  let cycleCopy = "";

  if (hasNoTimeLeft || hasOverdue) {
    cycleCopy = "A gentle watering pass today should keep your rhythm steady.";
  } else if (nextCycleHours != null) {
    cycleCopy = `Next cycle in ${Math.max(1, nextCycleHours)}${
      nextCycleHours === 1 ? " hour" : " hours"
    }.`;
  } else {
    cycleCopy = "Next cycle begins tomorrow.";
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Icon
            family="MaterialIcons"
            color={colors.primary}
            name="water-drop"
            size={18}
          />
        </View>
        <Text style={[styles.title, { color: colors.onSurface }]}>
          Hydration
        </Text>
      </View>
      <View>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          {statusCopy}
        </Text>
        <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
          {cycleCopy}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    minHeight: 114,
    paddingHorizontal: 22,
    paddingVertical: 26,
    gap: 10,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    marginTop: 1,
  },
  title: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 20,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  meta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
});
