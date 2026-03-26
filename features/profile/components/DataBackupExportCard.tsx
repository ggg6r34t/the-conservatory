import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface DataBackupExportCardProps {
  onPress: () => void;
}

export function DataBackupExportCard({ onPress }: DataBackupExportCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surfaceContainerLowest }]}
    >
      <View
        style={[styles.badge, { backgroundColor: colors.secondaryContainer }]}
      >
        <Icon name="file-export-outline" size={16} color={colors.primary} />
        <Text
          style={[styles.badgeLabel, { color: colors.onSecondaryContainer }]}
        >
          COMPREHENSIVE EXPORT
        </Text>
      </View>

      <Text style={[styles.title, { color: colors.primary }]}>
        Download Botanical Archive
      </Text>

      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        Export your collection history, photos, and care logs as one structured
        record for safekeeping or transfer.
      </Text>

      <View style={styles.footer}>
        <View
          style={[
            styles.actionOrb,
            { backgroundColor: colors.secondaryContainer },
          ]}
        >
          <Icon
            family="Octicons"
            name="download"
            size={24}
            color={colors.onSecondaryContainer}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 20,
    gap: 16,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
    maxWidth: 280,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 310,
  },
  footer: {
    paddingTop: 4,
  },
  actionOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
