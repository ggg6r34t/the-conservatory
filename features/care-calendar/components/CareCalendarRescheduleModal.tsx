import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import type { CareCalendarEvent } from "@/features/care-calendar/types";

const SNOOZE_OPTIONS = [1, 3, 7] as const;

interface CareCalendarRescheduleModalProps {
  visible: boolean;
  target: CareCalendarEvent | null;
  days: string;
  onChangeDays: (value: string) => void;
  onSnooze: (days: number) => void;
  onSave: () => void;
  onClose: () => void;
}

export function CareCalendarRescheduleModal({
  visible,
  target,
  days,
  onChangeDays,
  onSnooze,
  onSave,
  onClose,
}: CareCalendarRescheduleModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.backdrop }]}>
        <View
          style={[styles.card, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <Text style={[styles.title, { color: colors.primary }]}>
            Reschedule care
          </Text>
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            Snooze from {target?.dueDate ?? "the chosen day"} or set a repeat
            interval in days.
          </Text>

          <View style={styles.snoozeRow}>
            {SNOOZE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={`Snooze ${option} days`}
                onPress={() => onSnooze(option)}
                style={[
                  styles.snoozeChip,
                  { backgroundColor: colors.surfaceContainerLow },
                ]}
              >
                <Text style={[styles.snoozeLabel, { color: colors.onSurface }]}>
                  +{option}d
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={days}
            onChangeText={onChangeDays}
            keyboardType="number-pad"
            style={[
              styles.input,
              {
                color: colors.onSurface,
                backgroundColor: colors.surfaceContainerLow,
              },
            ]}
            accessibilityLabel="Repeat every number of days"
          />

          <View style={styles.actions}>
            <PrimaryButton label="Save interval" onPress={onSave} />
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={[styles.cancel, { color: colors.secondary }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
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
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 28,
  },
  snoozeRow: {
    flexDirection: "row",
    gap: 8,
  },
  snoozeChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  snoozeLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    letterSpacing: 0.4,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
  },
  actions: {
    gap: 10,
    alignItems: "flex-start",
  },
  cancel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
