import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { CareCalendarHelpModal } from "@/features/care-calendar/components/CareCalendarHelpModal";
import {
  CareCalendarOverflowMenu,
  type CareCalendarOverflowAction,
} from "@/features/care-calendar/components/CareCalendarOverflowMenu";

interface CareCalendarToolbarProps {
  summaryLabel: string;
  horizonNotice: string | null;
  showAiFallback: boolean;
  overflowActions: CareCalendarOverflowAction[];
}

export function CareCalendarToolbar({
  summaryLabel,
  horizonNotice,
  showAiFallback,
  overflowActions,
}: CareCalendarToolbarProps) {
  const { colors } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const hasHelpNotice = horizonNotice != null || showAiFallback;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.summary, { color: colors.onSurfaceVariant }]}>
        {summaryLabel}
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="About Care Calendar"
          accessibilityHint={
            hasHelpNotice
              ? "Includes calendar notes about schedule range or AI suggestions"
              : "Explains month markers and schedule range"
          }
          onPress={() => setHelpOpen(true)}
          style={[styles.iconButton, { backgroundColor: colors.surfaceContainerLow }]}
        >
          <Icon
            family="MaterialCommunityIcons"
            name="information-outline"
            size={20}
            color={colors.secondary}
          />
          {hasHelpNotice ? (
            <View
              style={[styles.noticeDot, { backgroundColor: colors.secondary }]}
            />
          ) : null}
        </Pressable>
        <CareCalendarOverflowMenu actions={overflowActions} />
      </View>

      <CareCalendarHelpModal
        visible={helpOpen}
        horizonNotice={horizonNotice}
        showAiFallback={showAiFallback}
        onClose={() => setHelpOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summary: {
    flex: 1,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
