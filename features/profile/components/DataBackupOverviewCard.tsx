import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface DataBackupOverviewCardProps {
  syncTitle: string;
  syncDescription: string;
  statusTitle: string;
  statusValue: string;
  statusDetail?: string;
  onOpenDetails: () => void;
}

export function DataBackupOverviewCard(props: DataBackupOverviewCardProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.group}>
      <View
        style={[styles.syncCard, { backgroundColor: colors.surfaceContainerLow }]}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.secondaryContainer },
          ]}
        >
          <Icon
            name="cloud-upload-outline"
            size={22}
            color={colors.primary}
          />
        </View>
        <View style={styles.syncCopy}>
          <Text style={[styles.syncTitle, { color: colors.primary }]}>
            {props.syncTitle}
          </Text>
          <Text
            style={[styles.syncDescription, { color: colors.onSurfaceVariant }]}
          >
            {props.syncDescription}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={props.onOpenDetails}
        style={[
          styles.statusCard,
          { backgroundColor: colors.surfaceContainerLowest },
        ]}
      >
        <View style={styles.statusLead}>
          <Text style={[styles.statusLabel, { color: colors.onSurface }]}>
            {props.statusTitle}
          </Text>
          {props.statusDetail ? (
            <Text
              style={[styles.statusDetail, { color: colors.onSurfaceVariant }]}
            >
              {props.statusDetail}
            </Text>
          ) : null}
        </View>

        <View style={styles.statusTrail}>
          <Text style={[styles.statusValue, { color: colors.primary }]}>
            {props.statusValue}
          </Text>
          <Icon
            name="chevron-right"
            size={22}
            color={colors.surfaceContainerHigh}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 14,
  },
  syncCard: {
    borderRadius: 28,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  syncCopy: {
    flex: 1,
    gap: 4,
  },
  syncTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
  },
  syncDescription: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  statusCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  statusLead: {
    flex: 1,
    gap: 4,
  },
  statusLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  statusDetail: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  statusTrail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    lineHeight: 20,
    textAlign: "right",
    maxWidth: 126,
  },
});
