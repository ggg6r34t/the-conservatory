import { StyleSheet, Text, View } from "react-native";

import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface MemorialFooterProps {
  onEdit: () => void;
}

export function MemorialFooter({ onEdit }: MemorialFooterProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.footer,
        { marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
      ]}
    >
      <View
        style={[
          styles.footerRule,
          { backgroundColor: colors.surfaceContainerHigh },
        ]}
      />
      <View style={styles.footerRememberedRow}>
        <Icon name="heart" size={16} color={colors.onSurfaceVariant + 90} />
        <Text
          style={[styles.footerRemembered, { color: colors.onSurfaceVariant }]}
        >
          Gently Remembered
        </Text>
      </View>
      <SecondaryButton
        label="Restore Journal"
        backgroundColor={colors.surfaceContainerLow}
        textColor={colors.primary}
        onPress={onEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingBottom: 24,
    alignItems: "center",
    gap: 24,
  },
  footerRule: {
    width: "100%",
    height: 1,
    opacity: 0.55,
  },
  footerRememberedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerRemembered: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.6,
  },
});
