import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

export type CareCalendarOverflowAction = {
  id: string;
  label: string;
  onPress: () => void;
};

interface CareCalendarOverflowMenuProps {
  actions: CareCalendarOverflowAction[];
}

export function CareCalendarOverflowMenu({ actions }: CareCalendarOverflowMenuProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const visibleActions = useMemo(() => actions.filter(Boolean), [actions]);

  if (!visibleActions.length) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More calendar actions"
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: colors.surfaceContainerLow }]}
      >
        <Icon
          family="MaterialCommunityIcons"
          name="dots-horizontal"
          size={20}
          color={colors.secondary}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
          onPress={() => setOpen(false)}
        >
          <View
            style={[styles.sheet, { backgroundColor: colors.surfaceContainerHigh }]}
          >
            {visibleActions.map((action) => (
              <Pressable
                key={action.id}
                accessibilityRole="button"
                onPress={() => {
                  setOpen(false);
                  action.onPress();
                }}
                style={styles.row}
              >
                <Text style={[styles.rowLabel, { color: colors.onSurface }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={styles.row}
            >
              <Text style={[styles.cancel, { color: colors.secondary }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 24,
  },
  sheet: {
    borderRadius: 24,
    paddingVertical: 8,
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  cancel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
