import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { CARE_CALENDAR_HELP_SECTIONS } from "@/features/care-calendar/services/careCalendarHelpContent";

interface CareCalendarHelpModalProps {
  visible: boolean;
  horizonNotice: string | null;
  showAiFallback: boolean;
  onClose: () => void;
}

export function CareCalendarHelpModal({
  visible,
  horizonNotice,
  showAiFallback,
  onClose,
}: CareCalendarHelpModalProps) {
  const { colors } = useTheme();
  const { monthMarkers, scheduleRange, aiFallback } = CARE_CALENDAR_HELP_SECTIONS;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
        onPress={onClose}
      >
        <Pressable
          style={[styles.card, { backgroundColor: colors.surfaceContainerHigh }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.primary }]}>
            About this calendar
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              {monthMarkers.title}
            </Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
              {monthMarkers.body}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              {scheduleRange.title}
            </Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
              {scheduleRange.body}
            </Text>
            {horizonNotice ? (
              <Text style={[styles.callout, { color: colors.secondary }]}>
                {horizonNotice}
              </Text>
            ) : null}
          </View>

          {showAiFallback ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                {aiFallback.title}
              </Text>
              <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
                {aiFallback.body}
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={[styles.done, { backgroundColor: colors.surfaceContainerLow }]}
          >
            <Text style={[styles.doneLabel, { color: colors.onSurface }]}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 20,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
  callout: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  done: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  doneLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
