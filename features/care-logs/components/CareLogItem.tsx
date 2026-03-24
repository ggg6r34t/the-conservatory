import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { parseStructuredCareLogNote } from "@/features/ai/services/observationTaggingService";
import type { CareLog } from "@/types/models";

interface CareLogItemProps {
  log: CareLog;
}

export function CareLogItem({ log }: CareLogItemProps) {
  const { colors } = useTheme();
  const parsedNote = parseStructuredCareLogNote(log.notes);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceContainerLowest },
      ]}
    >
      <Text style={[styles.type, { color: colors.primary }]}>
        {log.logType.toUpperCase()}
      </Text>
      <Text style={[styles.notes, { color: colors.onSurfaceVariant }]}>
        {parsedNote.body || "No notes recorded."}
      </Text>
      <Text style={[styles.time, { color: colors.onSurfaceVariant }]}>
        {new Date(log.loggedAt).toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  type: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2,
  },
  notes: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  time: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
});
