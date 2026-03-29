import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface CloudSyncControlCardProps {
  title: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  statusTitle: string;
  statusDetail: string;
  statusValue: string;
  onToggle: () => void;
  onOpenDetails: () => void;
}

export function CloudSyncControlCard(props: CloudSyncControlCardProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.group}>
      <View
        style={[styles.toggleCard, { backgroundColor: colors.surfaceContainerLow }]}
      >
        <View style={styles.toggleLead}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <Icon
              family="MaterialIcons"
              name="cloud-upload"
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.onSurface }]}>
              {props.title}
            </Text>
            <Text
              style={[styles.description, { color: colors.onSurfaceVariant }]}
            >
              {props.description}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: props.enabled, disabled: props.disabled }}
          disabled={props.disabled}
          onPress={props.onToggle}
          style={[
            styles.switchTrack,
            {
              backgroundColor: props.enabled
                ? colors.primary
                : colors.surfaceContainerHigh,
              opacity: props.disabled ? 0.6 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.switchThumb,
              {
                backgroundColor: colors.surfaceBright,
                transform: [{ translateX: props.enabled ? 20 : 0 }],
              },
            ]}
          />
        </Pressable>
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
          <Text style={[styles.statusTitle, { color: colors.onSurface }]}>
            {props.statusTitle}
          </Text>
          <Text
            style={[styles.statusDetail, { color: colors.onSurfaceVariant }]}
          >
            {props.statusDetail}
          </Text>
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
  toggleCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  toggleLead: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: "Manrope_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
  statusTitle: {
    fontFamily: "Manrope_700Bold",
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
    fontSize: 14,
    lineHeight: 20,
    textAlign: "right",
    maxWidth: 132,
  },
});
